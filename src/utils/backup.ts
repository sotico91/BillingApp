import { Share, Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

import { categoryLabel } from '@/src/utils/categoryLabel';
import type {
  Account,
  Debt,
  Budget,
  Subscription,
  Transaction,
  TransactionType,
  PaymentMethod,
} from '@/src/types/finance';
import type { QuickTemplate, SpendConcept, UserSettings } from '@/src/types/settings';
import type { Language, TranslationKey } from '@/src/i18n/translations';

export const BACKUP_FORMAT = 'billingapp-backup';
export const BACKUP_VERSION = 1;

export type BillingBackup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  debts: Debt[];
  subscriptions: Subscription[];
  settings: UserSettings;
  quickTemplates: QuickTemplate[];
};

export type BackupSnapshot = {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  debts: Debt[];
  subscriptions: Subscription[];
  settings: UserSettings;
  quickTemplates: QuickTemplate[];
};

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

export type CsvExportContext = {
  language: Language;
  t: TranslateFn;
  accounts: Account[];
  debts: Debt[];
  spendConcepts: SpendConcept[];
};

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function formatCsvDate(iso: string, language: Language): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  const day = p(d.getDate());
  const month = p(d.getMonth() + 1);
  const year = d.getFullYear();
  const time = `${p(d.getHours())}:${p(d.getMinutes())}`;
  return language === 'es' ? `${day}/${month}/${year} ${time}` : `${month}/${day}/${year} ${time}`;
}

function typeLabel(type: TransactionType, t: TranslateFn): string {
  return t(`type.${type}` as TranslationKey);
}

function methodLabel(method: PaymentMethod | undefined, t: TranslateFn): string {
  if (!method) return '';
  return t(`method.${method}` as TranslationKey);
}

function accountLabel(
  accountId: string | undefined,
  accounts: Account[],
  t: TranslateFn
): string {
  if (!accountId) return '';
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return '';
  if (acc.name?.trim()) return acc.name.trim();
  try {
    const label = t(acc.nameKey as TranslationKey);
    if (label && label !== acc.nameKey) return label;
  } catch {
    /* fall through */
  }
  return acc.nameKey;
}

function debtLabel(debtId: string | undefined, debts: Debt[], t: TranslateFn): string {
  if (!debtId) return '';
  const debt = debts.find((d) => d.id === debtId);
  if (!debt) return '';
  if (debt.name?.trim()) return debt.name.trim();
  if (debt.nameKey) {
    try {
      const label = t(debt.nameKey as TranslationKey);
      if (label && label !== debt.nameKey) return label;
    } catch {
      /* fall through */
    }
    return debt.nameKey;
  }
  return '';
}

export function buildBackup(snapshot: BackupSnapshot): BillingBackup {
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
  const { language, t, accounts, debts, spendConcepts } = ctx;
  const header = [
    t('csv.date'),
    t('csv.type'),
    t('csv.amount'),
    t('csv.concept'),
    t('csv.account'),
    t('csv.toAccount'),
    t('csv.method'),
    t('csv.debt'),
    t('csv.note'),
  ];
  const rows = [...transactions]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((tx) =>
      [
        formatCsvDate(tx.createdAt, language),
        typeLabel(tx.type, t),
        String(tx.amount),
        tx.categoryId ? categoryLabel(tx.categoryId, t, spendConcepts) : '',
        accountLabel(tx.accountId, accounts, t),
        accountLabel(tx.toAccountId, accounts, t),
        methodLabel(tx.paymentMethod, t),
        debtLabel(tx.debtId, debts, t),
        tx.note ?? '',
      ]
        .map((cell) => csvEscape(String(cell)))
        .join(',')
    );
  // BOM helps Excel open UTF-8 accents correctly.
  return `\uFEFF${[header.join(','), ...rows].join('\n')}`;
}

export function parseBackupJson(raw: string): BillingBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('INVALID_JSON');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('INVALID_BACKUP');
  const data = parsed as Partial<BillingBackup>;
  if (data.format !== BACKUP_FORMAT) throw new Error('INVALID_FORMAT');
  if (typeof data.version !== 'number') throw new Error('INVALID_VERSION');
  if (!Array.isArray(data.transactions)) throw new Error('INVALID_TRANSACTIONS');
  if (!Array.isArray(data.accounts)) throw new Error('INVALID_ACCOUNTS');
  if (!Array.isArray(data.budgets)) throw new Error('INVALID_BUDGETS');
  if (!Array.isArray(data.debts)) throw new Error('INVALID_DEBTS');
  if (!Array.isArray(data.subscriptions)) throw new Error('INVALID_SUBSCRIPTIONS');
  if (!data.settings || typeof data.settings !== 'object') throw new Error('INVALID_SETTINGS');
  return {
    format: BACKUP_FORMAT,
    version: data.version,
    exportedAt:
      typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    transactions: data.transactions as Transaction[],
    accounts: data.accounts as Account[],
    budgets: data.budgets as Budget[],
    debts: data.debts as Debt[],
    subscriptions: data.subscriptions as Subscription[],
    settings: data.settings as UserSettings,
    quickTemplates: Array.isArray(data.quickTemplates)
      ? (data.quickTemplates as QuickTemplate[])
      : [],
  };
}

async function writeCacheFile(filename: string, contents: string): Promise<File> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  return file;
}

/** Share via RN Share — works without expo-sharing native module. */
async function shareFile(file: File, contents: string, title: string) {
  if (Platform.OS === 'ios') {
    await Share.share({ url: file.uri, title });
    return;
  }
  // Android: share text body (file URI sharing needs extra grants without expo-sharing).
  await Share.share({ message: contents, title });
}

export async function shareBackupJson(snapshot: BackupSnapshot): Promise<void> {
  const backup = buildBackup(snapshot);
  const contents = JSON.stringify(backup, null, 2);
  const filename = `BillingApp-backup-${stamp()}.json`;
  const file = await writeCacheFile(filename, contents);
  await shareFile(file, contents, filename);
}

export async function shareTransactionsCsv(
  transactions: Transaction[],
  ctx: CsvExportContext
): Promise<void> {
  const contents = transactionsToCsv(transactions, ctx);
  const filename =
    ctx.language === 'es'
      ? `BillingApp-movimientos-${stamp()}.csv`
      : `BillingApp-movements-${stamp()}.csv`;
  const file = await writeCacheFile(filename, contents);
  await shareFile(file, contents, filename);
}

/** Uses Expo FileSystem picker (already linked) — no DocumentPicker native module. */
export async function pickAndReadBackupFile(): Promise<BillingBackup> {
  const result = await File.pickFileAsync({
    mimeTypes: ['application/json', 'text/plain', 'public.json', '*/*'],
  });
  if (result.canceled) throw new Error('CANCELLED');
  const picked = result.result;
  const raw = await picked.text();
  return parseBackupJson(raw);
}
