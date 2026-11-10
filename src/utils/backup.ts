import { Share, Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  movementCells,
  movementHeader,
  type CsvExportContext,
} from '@/src/utils/movementRows';
import { writeYearWorkbook } from '@/src/utils/excelExport';
import { csvEscape } from '@/src/utils/csv';
import { backupFileName } from '@/src/utils/fileNames';
import type {
  Account,
  Debt,
  Budget,
  Subscription,
  Transaction,
} from '@/src/types/finance';
import type { QuickTemplate, UserSettings } from '@/src/types/settings';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  parseBackupJson,
  type RumiBackup,
} from '@/src/utils/backupParse';

export {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  LEGACY_BACKUP_FORMAT,
  parseBackupJson,
} from '@/src/utils/backupParse';
export type { RumiBackup } from '@/src/utils/backupParse';
export { movementCells, movementHeader, type CsvExportContext } from '@/src/utils/movementRows';

export type BackupSnapshot = {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  debts: Debt[];
  subscriptions: Subscription[];
  settings: UserSettings;
  quickTemplates: QuickTemplate[];
};

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function buildBackup(snapshot: BackupSnapshot): RumiBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    transactions: snapshot.transactions,
    accounts: snapshot.accounts,
    budgets: snapshot.budgets,
    debts: snapshot.debts,
    subscriptions: snapshot.subscriptions,
    settings: snapshot.settings,
    quickTemplates: snapshot.quickTemplates,
  };
}

/** Human-readable CSV for Excel/Numbers — localized labels, no internal ids. */
export function transactionsToCsv(
  transactions: Transaction[],
  ctx: CsvExportContext
): string {
  const header = movementHeader(ctx.t);
  const rows = [...transactions]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((tx) =>
      movementCells(tx, ctx)
        .map((cell) => csvEscape(String(cell)))
        .join(',')
    );
  // BOM helps Excel open UTF-8 accents correctly.
  return `\uFEFF${[header.join(','), ...rows].join('\n')}`;
}

/** Exports are readable copies of the data, so each lives in its own folder that gets emptied. */
const EXPORT_DIR = 'rumi-exports';
/** Exports written straight into the cache by versions before EXPORT_DIR. */
const LEGACY_EXPORT_RE = /^Rumi[_-].+\.(json|csv|xlsx)$/;

/**
 * Deletes exported files left in the cache. Not right after sharing: on
 * Android the receiving app (Drive, WhatsApp…) may still be reading the file
 * when the share sheet closes. Runs before each export and at app launch.
 */
export function clearExportedFiles(): void {
  try {
    const dir = new Directory(Paths.cache, EXPORT_DIR);
    if (dir.exists) dir.delete();
    for (const entry of new Directory(Paths.cache).list()) {
      if (entry instanceof File && LEGACY_EXPORT_RE.test(entry.name)) entry.delete();
    }
  } catch {
    // Leftovers are retried at the next launch or export.
  }
}

export async function writeCacheFile(filename: string, contents: string | Uint8Array): Promise<File> {
  clearExportedFiles();
  const dir = new Directory(Paths.cache, EXPORT_DIR);
  dir.create();
  const file = new File(dir, filename);
  file.create();
  file.write(contents);
  return file;
}

/**
 * Share the real file (not its text) so it can be saved as .json / .csv.
 * Sharing long text on Android gets truncated by the receiving app.
 */
export async function shareFile(
  file: File,
  /** Text to share when files cannot be shared; null for binary files. */
  contents: string | null,
  title: string,
  type: { mimeType: string; UTI: string }
) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { ...type, dialogTitle: title });
    return;
  }
  if (Platform.OS === 'ios') {
    await Share.share({ url: file.uri, title });
    return;
  }
  if (contents != null) await Share.share({ message: contents, title });
}

const JSON_TYPE = { mimeType: 'application/json', UTI: 'public.json' };
export const XLSX_TYPE = {
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  UTI: 'org.openxmlformats.spreadsheetml.sheet',
};
const CSV_TYPE = { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' };

export async function shareBackupJson(snapshot: BackupSnapshot): Promise<void> {
  const backup = buildBackup(snapshot);
  const contents = JSON.stringify(backup, null, 2);
  const filename = backupFileName(snapshot.settings.userName ?? '');
  const file = await writeCacheFile(filename, contents);
  await shareFile(file, contents, filename, JSON_TYPE);
}

export async function shareTransactionsCsv(
  transactions: Transaction[],
  ctx: CsvExportContext
): Promise<void> {
  const contents = transactionsToCsv(transactions, ctx);
  const filename =
    ctx.language === 'es'
      ? `Rumi-movimientos-${stamp()}.csv`
      : `Rumi-movements-${stamp()}.csv`;
  const file = await writeCacheFile(filename, contents);
  await shareFile(file, contents, filename, CSV_TYPE);
}

/** Uses Expo FileSystem picker (already linked) — no DocumentPicker native module. */
export async function pickAndReadBackupFile(): Promise<RumiBackup> {
  const result = await File.pickFileAsync({
    mimeTypes: ['application/json', 'text/plain', 'public.json', '*/*'],
  });
  if (result.canceled) throw new Error('CANCELLED');
  const picked = result.result;
  const raw = await picked.text();
  return parseBackupJson(raw);
}

/** Excel of one calendar year: a summary sheet and one sheet per month with movements. */
export async function shareYearExcel(
  transactions: Transaction[],
  year: number,
  ctx: CsvExportContext
): Promise<void> {
  const bytes = writeYearWorkbook(transactions, year, ctx);
  const filename =
    ctx.language === 'es' ? `Rumi-${year}-movimientos.xlsx` : `Rumi-${year}-movements.xlsx`;
  const file = await writeCacheFile(filename, bytes);
  await shareFile(file, null, filename, XLSX_TYPE);
}
