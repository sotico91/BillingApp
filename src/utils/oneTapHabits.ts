import type { Transaction } from '@/src/types/finance';

/** Glanceable one-tap set — never a full history mirror. */
export const ONE_TAP_MAX_CHIPS = 5;
export const ONE_TAP_LOOKBACK_DAYS = 30;

export type OneTapHabit = {
  /** Stable key: category + amount. */
  id: string;
  categoryId: string;
  amount: number;
  note?: string;
  count: number;
  lastAt: string;
};

function habitKey(categoryId: string, amount: number): string {
  return `${categoryId}|${amount}`;
}

/**
 * Build one-tap chips from real expenses:
 * - same category + amount = one habit
 * - ranked by how often it happened (then most recent)
 * - hard cap so Home stays glanceable even with 40+ spends
 */
export function buildOneTapHabits(
  transactions: Transaction[],
  allowedIds: Set<string>,
  opts?: { lookbackDays?: number; max?: number; now?: Date }
): OneTapHabit[] {
  const lookbackDays = opts?.lookbackDays ?? ONE_TAP_LOOKBACK_DAYS;
  const max = opts?.max ?? ONE_TAP_MAX_CHIPS;
  const now = opts?.now ?? new Date();
  const cutoff = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;

  const byKey = new Map<
    string,
    { categoryId: string; amount: number; note?: string; count: number; lastAt: string }
  >();

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (!allowedIds.has(tx.categoryId)) continue;
    const at = Date.parse(tx.createdAt);
    if (!Number.isFinite(at) || at < cutoff) continue;

    const key = habitKey(tx.categoryId, tx.amount);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, {
        categoryId: tx.categoryId,
        amount: tx.amount,
        note: tx.note,
        count: 1,
        lastAt: tx.createdAt,
      });
      continue;
    }
    prev.count += 1;
    if (tx.createdAt > prev.lastAt) {
      prev.lastAt = tx.createdAt;
      prev.note = tx.note;
    }
  }

  return [...byKey.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastAt.localeCompare(a.lastAt);
    })
    .slice(0, max)
    .map((item) => ({
      id: habitKey(item.categoryId, item.amount),
      categoryId: item.categoryId,
      amount: item.amount,
      note: item.note,
      count: item.count,
      lastAt: item.lastAt,
    }));
}
