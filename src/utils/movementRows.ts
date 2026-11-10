import { categoryLabel } from '@/src/utils/categoryLabel';
import type { Account, Debt, PaymentMethod, Transaction, TransactionType } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import type { Language, TranslationKey } from '@/src/i18n/translations';

/** A movement as readable cells for CSV and Excel exports. Pure (no React Native). */

export type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

export type CsvExportContext = {
  language: Language;
  t: TranslateFn;
  accounts: Account[];
  debts: Debt[];
  spendConcepts: SpendConcept[];
};

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

/** Column titles of an exported movement, in order. */
export function movementHeader(t: TranslateFn): string[] {
  return [
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
}

/** One movement as readable cells (amount stays a number for spreadsheets). */
export function movementCells(tx: Transaction, ctx: CsvExportContext): (string | number)[] {
  const { language, t, accounts, debts, spendConcepts } = ctx;
  return [
    formatCsvDate(tx.createdAt, language),
    typeLabel(tx.type, t),
    tx.amount,
    tx.categoryId ? categoryLabel(tx.categoryId, t, spendConcepts) : '',
    accountLabel(tx.accountId, accounts, t),
    accountLabel(tx.toAccountId, accounts, t),
    methodLabel(tx.paymentMethod, t),
    debtLabel(tx.debtId, debts, t),
    tx.note ?? '',
  ];
}

