import type { Transaction } from '@/src/types/finance';
import {
  budgetMonthOf,
  calendarMonthRange,
  clampMonthStartDay,
  filterByPeriod,
  formatMonthRange,
  monthRangeWithStart,
  previousMonthRange,
  setMonthStartDay,
} from '@/src/utils/financeMath';
import { projectMonth } from '@/src/utils/projection';

function tx(id: string, at: Date, amount = 1000): Transaction {
  return {
    id,
    type: 'expense',
    amount,
    categoryId: 'food',
    createdAt: at.toISOString(),
  } as Transaction;
}

afterEach(() => setMonthStartDay(1));

describe('month start day', () => {
  it('is the calendar month by default', () => {
    const { from, to } = calendarMonthRange(2026, 10);
    expect(from).toEqual(new Date(2026, 10, 1));
    expect(to).toEqual(new Date(2026, 11, 1));
    expect(budgetMonthOf(new Date(2026, 10, 30))).toEqual({ year: 2026, monthIndex: 10 });
  });

  it('pay day 24: November runs Oct 24 – Nov 23', () => {
    setMonthStartDay(24);
    const { from, to } = calendarMonthRange(2026, 10);
    expect(from).toEqual(new Date(2026, 9, 24));
    expect(to).toEqual(new Date(2026, 10, 24));
    expect(budgetMonthOf(new Date(2026, 9, 24))).toEqual({ year: 2026, monthIndex: 10 });
    expect(budgetMonthOf(new Date(2026, 10, 23))).toEqual({ year: 2026, monthIndex: 10 });
    expect(budgetMonthOf(new Date(2026, 11, 26))).toEqual({ year: 2027, monthIndex: 0 });
  });

  it('pay day 10: October runs Oct 10 – Nov 9', () => {
    setMonthStartDay(10);
    expect(budgetMonthOf(new Date(2026, 10, 5))).toEqual({ year: 2026, monthIndex: 9 });
    expect(calendarMonthRange(2026, 9).from).toEqual(new Date(2026, 9, 10));
  });

  it('this month counts the spends since pay day', () => {
    setMonthStartDay(24);
    const now = new Date(2026, 10, 9, 12);
    const list = [
      tx('a', new Date(2026, 9, 23, 12)),
      tx('b', new Date(2026, 9, 25, 12)),
      tx('c', new Date(2026, 10, 2, 12)),
    ];
    expect(filterByPeriod(list, 'mes', now).map((t) => t.id)).toEqual(['b', 'c']);
    expect(previousMonthRange(now)).toEqual({
      from: new Date(2026, 8, 24),
      to: new Date(2026, 9, 24),
    });
  });

  it('the forecast covers the pay-day month', () => {
    setMonthStartDay(24);
    const now = new Date(2026, 10, 9, 12);
    const p = projectMonth([tx('b', new Date(2026, 9, 25, 12), 31000)], [], now);
    expect(p.spent).toBe(31000);
  });

  it('clamps to 1–28 and previews without saving', () => {
    expect(clampMonthStartDay(31)).toBe(1);
    expect(clampMonthStartDay(0)).toBe(1);
    expect(clampMonthStartDay(15)).toBe(15);
    const range = monthRangeWithStart(24, new Date(2026, 10, 9));
    expect(range.from).toEqual(new Date(2026, 9, 24));
    expect(formatMonthRange(range, 'en')).toBe('Oct 24 – Nov 23');
    expect(budgetMonthOf(new Date(2026, 10, 30))).toEqual({ year: 2026, monthIndex: 10 });
  });
});
