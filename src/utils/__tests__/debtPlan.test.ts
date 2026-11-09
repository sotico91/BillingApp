import type { Debt } from '@/src/types/finance';
import { buildDebtPlan, parseMonthlyRate, plannableDebts, planOrder } from '@/src/utils/debtPlan';

function debt(id: string, balance: number, installment: number, interestRate = 0, extra: Partial<Debt> = {}): Debt {
  return {
    id,
    balance,
    installment,
    interestRate,
    termMonths: 0,
    nextPaymentDate: new Date(2026, 10, 15).toISOString(),
    paidCapital: 0,
    paidInterest: 0,
    otherCharges: 0,
    ...extra,
  };
}

describe('debt plan', () => {
  it('skips closed and empty debts', () => {
    const list = plannableDebts([
      debt('a', 1000, 100),
      debt('b', 0, 100),
      debt('c', 1000, 0),
      debt('d', 1000, 100, 0, { closedAt: '2026-01-01' }),
    ]);
    expect(list.map((d) => d.id)).toEqual(['a']);
  });

  it('smallest balance first when no rates; cheapest first with rates', () => {
    const noRates = plannableDebts([debt('big', 5000, 100), debt('small', 1000, 100)]);
    expect(planOrder(noRates)).toEqual({ order: 'smallest', ids: ['small', 'big'] });
    const rates = plannableDebts([debt('low', 1000, 100, 1), debt('high', 5000, 100, 2.5)]);
    expect(planOrder(rates).ids).toEqual(['high', 'low']);
  });

  it('without interest, the extra and the rolled installment shorten the plan', () => {
    const plan = buildDebtPlan(plannableDebts([debt('a', 1000, 100), debt('b', 3000, 100)]), 100)!;
    expect(plan.baseline.months).toBe(30);
    // Month 1-5: a gets 200 → paid in month 5; then b gets 300/month.
    expect(plan.plan.steps[0]).toEqual({ id: 'a', month: 5 });
    expect(plan.plan.months).toBeLessThan(plan.baseline.months!);
    expect(plan.monthsSaved).toBe(plan.baseline.months! - plan.plan.months!);
    expect(plan.interestSaved).toBe(0);
  });

  it('with interest, paying extra saves interest', () => {
    const plan = buildDebtPlan(plannableDebts([debt('a', 1_000_000, 100_000, 2)]), 100_000)!;
    expect(plan.ratesKnown).toBe(true);
    expect(plan.baseline.interest).toBeGreaterThan(plan.plan.interest);
    expect(plan.interestSaved).toBeGreaterThan(0);
  });

  it('an installment below the interest never ends', () => {
    const plan = buildDebtPlan(plannableDebts([debt('a', 1_000_000, 10_000, 3)]), 0)!;
    expect(plan.baseline.months).toBeNull();
  });

  it('reads monthly and annual rates', () => {
    expect(parseMonthlyRate('1,9')).toBe(1.9);
    expect(parseMonthlyRate('')).toBe(0);
    expect(parseMonthlyRate('28% EA')).toBeCloseTo(2.078, 2);
    expect(parseMonthlyRate('abc')).toBeNull();
  });
});
