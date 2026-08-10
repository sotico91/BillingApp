import type { Period, Transaction } from '@/src/types/finance';
import { getAntCategoryIds, getCategoryById } from '@/src/data/financeDefaults';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function periodStart(period: Period, now = new Date()): Date {
  if (period === 'hoy') return startOfDay(now);
  if (period === 'semana') return startOfWeek(now);
  return startOfMonth(now);
}

export function previousMonthRange(now = new Date()): { from: Date; to: Date } {
  const to = startOfMonth(now);
  const from = new Date(to);
  from.setMonth(from.getMonth() - 1);
  return { from, to };
}

export function filterByPeriod(
  transactions: Transaction[],
  period: Period,
  now = new Date()
): Transaction[] {
  // Calendar month always starts at 0 for the new month (no spill from prior months).
  if (period === 'mes') {
    return filterByCalendarMonth(transactions, now.getFullYear(), now.getMonth());
  }
  const from = periodStart(period, now).getTime();
  if (period === 'hoy') {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return filterBetween(transactions, new Date(from), new Date(end.getTime() + 1));
  }
  return transactions.filter((e) => new Date(e.createdAt).getTime() >= from);
}

/** Inclusive calendar month: year + monthIndex (0-11). */
export function calendarMonthRange(year: number, monthIndex: number): { from: Date; to: Date } {
  const from = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const to = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
  return { from, to };
}

export function filterByCalendarMonth(
  transactions: Transaction[],
  year: number,
  monthIndex: number
): Transaction[] {
  const { from, to } = calendarMonthRange(year, monthIndex);
  return filterBetween(transactions, from, to);
}

export function shiftMonth(
  year: number,
  monthIndex: number,
  delta: number
): { year: number; monthIndex: number } {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

export function filterBetween(
  transactions: Transaction[],
  from: Date,
  to: Date
): Transaction[] {
  const a = from.getTime();
  const b = to.getTime();
  return transactions.filter((t) => {
    const ts = new Date(t.createdAt).getTime();
    return ts >= a && ts < b;
  });
}

export function formatExpenseDate(iso: string, language: 'en' | 'es' = 'en'): string {
  const date = new Date(iso);
  return date.toLocaleString(language === 'es' ? 'es-CO' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function sumByType(
  transactions: Transaction[],
  type: Transaction['type']
): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function antExpenseBreakdown(transactions: Transaction[]) {
  const antIds = new Set(getAntCategoryIds());
  const map = new Map<string, number>();
  let total = 0;

  for (const t of transactions) {
    if (t.type !== 'expense' || !t.categoryId) continue;
    const isAnt =
      antIds.has(t.categoryId) ||
      (t.amount > 0 && t.amount <= 30000 && t.categoryId !== 'vivienda');
    if (!isAnt) continue;
    total += t.amount;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }

  const items = Array.from(map.entries())
    .map(([categoryId, amount]) => ({
      categoryId,
      amount,
      color: getCategoryById(categoryId).color,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { total, items };
}

export function detectRecurring(transactions: Transaction[]): Transaction[] {
  const expenses = transactions.filter((t) => t.type === 'expense' && t.categoryId);
  const groups = new Map<string, Transaction[]>();

  for (const t of expenses) {
    const key = `${t.categoryId}|${Math.round(t.amount / 1000)}|${t.paymentMethod ?? ''}`;
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  const recurringIds = new Set<string>();
  for (const list of groups.values()) {
    if (list.length >= 2) {
      list.forEach((t) => recurringIds.add(t.id));
    }
  }

  return expenses.filter((t) => recurringIds.has(t.id));
}
