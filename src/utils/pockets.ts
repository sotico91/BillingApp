import { palette } from '@/src/theme/colors';
import type { Account, Transaction } from '@/src/types/finance';
import type { TranslationKey } from '@/src/i18n/translations';
import { accountDisplayName } from '@/src/utils/accounts';

export type PocketSpend = {
  accountId: string;
  name: string;
  color: string;
  total: number;
  count: number;
  percent: number;
};

const POCKET_COLORS = [
  palette.accent,
  palette.teal,
  palette.gold,
  palette.mist,
  palette.bgMid,
];

/** Expenses + debt payments grouped by the pocket they left. */
export function spendByPocket(
  txs: Transaction[],
  accounts: Account[],
  t: (key: TranslationKey) => string
): PocketSpend[] {
  const outgoing = txs.filter(
    (tx) => tx.type === 'expense' || tx.type === 'debt_payment'
  );
  const map = new Map<string, { total: number; count: number }>();
  for (const tx of outgoing) {
    const key = tx.accountId ?? '__none__';
    const cur = map.get(key) ?? { total: 0, count: 0 };
    cur.total += tx.amount;
    cur.count += 1;
    map.set(key, cur);
  }
  const total = outgoing.reduce((sum, tx) => sum + tx.amount, 0);
  return Array.from(map.entries())
    .map(([accountId, stats], index) => {
      const acc = accounts.find((a) => a.id === accountId);
      return {
        accountId,
        name: acc
          ? accountDisplayName(acc, t)
          : t('insights.pocketsUnknown'),
        color: POCKET_COLORS[index % POCKET_COLORS.length],
        total: stats.total,
        count: stats.count,
        percent: total > 0 ? (stats.total / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}
