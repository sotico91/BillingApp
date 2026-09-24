import type { TranslationKey } from '@/src/i18n/translations';
import type { Account, Transaction, TransactionType } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { accountDisplayName } from '@/src/utils/accounts';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { habitExpenseNotifyBody } from '@/src/utils/habitPilot';

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

export type MovementNotifyCopy = {
  title: string;
  body: string;
};

function accountName(
  accountId: string | undefined,
  accounts: Account[],
  t: Translate
): string {
  if (!accountId) return '';
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return '';
  return accountDisplayName(acc, t);
}

function routeBody(
  t: Translate,
  amount: string,
  from: string,
  to: string
): string {
  if (from && to) return t('notify.bodyMove', { amount, from, to });
  if (from) return t('notify.bodyWithdraw', { amount, from });
  if (to) return t('notify.body', { amount, category: to });
  return amount;
}

/** Title + body for the local confirm after any movement is saved. */
export function movementNotifyCopy(opts: {
  t: Translate;
  type: TransactionType;
  amount: string;
  transactions: Transaction[];
  spendConcepts: SpendConcept[];
  accounts: Account[];
  categoryId?: string;
  accountId?: string;
  toAccountId?: string;
  note?: string;
  debtLabel?: string;
  settled?: boolean;
}): MovementNotifyCopy {
  const { t, type, amount } = opts;
  const from = accountName(opts.accountId, opts.accounts, t);
  const to = accountName(opts.toAccountId, opts.accounts, t);
  const category =
    opts.categoryId != null && opts.categoryId !== ''
      ? categoryLabel(opts.categoryId, t, opts.spendConcepts)
      : '';
  const note = opts.note?.trim() ?? '';

  switch (type) {
    case 'expense':
      return {
        title: t('notify.title'),
        body: habitExpenseNotifyBody({
          t,
          transactions: opts.transactions,
          categoryId: opts.categoryId ?? '',
          amount,
          label: category || note || t('type.expense'),
          concepts: opts.spendConcepts,
        }),
      };
    case 'income':
      return {
        title: t('notify.titleIncome'),
        body: t('notify.body', {
          amount,
          category: note || category || t('type.income'),
        }),
      };
    case 'debt_payment': {
      const debt = note || opts.debtLabel || category || t('type.debt_payment');
      return {
        title: t('notify.titleDebt'),
        body: t(opts.settled ? 'notify.bodyDebtSettled' : 'notify.bodyDebt', {
          amount,
          debt,
        }),
      };
    }
    case 'transfer':
      return {
        title: t('notify.titleMove'),
        body: routeBody(t, amount, from, to),
      };
    case 'investment':
      return {
        title: t('notify.titleInvestment'),
        body: routeBody(t, amount, from, to),
      };
    case 'withdrawal':
      return {
        title: t('notify.titleWithdrawal'),
        body: from
          ? t('notify.bodyWithdraw', { amount, from })
          : note
            ? t('notify.body', { amount, category: note })
            : amount,
      };
  }
}
