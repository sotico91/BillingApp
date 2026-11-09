import type { Debt } from '@/src/types/finance';

/**
 * Plan to get out of debt: pay every installment, put an extra amount on one
 * debt, and when a debt is paid off its installment rolls onto the next one.
 * Compared against paying only the installments. Pure, month by month.
 */

/** Beyond this the plan says "more than 50 years" instead of a date. */
const MAX_MONTHS = 600;

export type PlanOrder = 'cheapest' | 'smallest';

export type PlanDebt = {
  id: string;
  balance: number;
  installment: number;
  /** Monthly interest rate in percent (2 = 2% a month); 0 when unknown. */
  monthlyRate: number;
};

export type PayoffStep = {
  id: string;
  /** Months from now until it is paid off (1 = next payment). */
  month: number;
};

export type PayoffRun = {
  /** Months until the last debt is paid; null when it never ends. */
  months: number | null;
  interest: number;
  steps: PayoffStep[];
};

export type DebtPlan = {
  order: PlanOrder;
  /** Debts in the order the extra money goes to. */
  ids: string[];
  baseline: PayoffRun;
  plan: PayoffRun;
  monthsSaved: number | null;
  interestSaved: number;
  /** Some debt has a known rate, so interest numbers mean something. */
  ratesKnown: boolean;
};

/** Open debts that can be planned: a balance and an installment. */
export function plannableDebts(debts: Debt[]): PlanDebt[] {
  return debts
    .filter((d) => !d.closedAt && d.balance > 0 && d.installment > 0)
    .map((d) => ({
      id: d.id,
      balance: d.balance,
      installment: d.installment,
      monthlyRate: Number.isFinite(d.interestRate) && d.interestRate > 0 ? d.interestRate : 0,
    }));
}

/** Highest rate first when rates are known (saves the most interest), else smallest balance first. */
export function planOrder(debts: PlanDebt[]): { order: PlanOrder; ids: string[] } {
  const ratesKnown = debts.some((d) => d.monthlyRate > 0);
  const sorted = [...debts].sort((a, b) =>
    ratesKnown
      ? b.monthlyRate - a.monthlyRate || a.balance - b.balance
      : a.balance - b.balance || a.id.localeCompare(b.id)
  );
  return { order: ratesKnown ? 'cheapest' : 'smallest', ids: sorted.map((d) => d.id) };
}

function run(debts: PlanDebt[], ids: string[], extra: number, roll: boolean): PayoffRun {
  const left = new Map(debts.map((d) => [d.id, d.balance]));
  const byId = new Map(debts.map((d) => [d.id, d]));
  const steps: PayoffStep[] = [];
  let interest = 0;
  let freed = 0;

  for (let month = 1; month <= MAX_MONTHS; month += 1) {
    // Installments first.
    for (const id of ids) {
      const bal = left.get(id) ?? 0;
      if (bal <= 0) continue;
      const d = byId.get(id)!;
      const charge = bal * (d.monthlyRate / 100);
      interest += charge;
      left.set(id, bal + charge - Math.min(d.installment, bal + charge));
    }
    // Then the extra, plus installments freed by paid-off debts, on the first open one.
    let pool = extra + (roll ? freed : 0);
    for (const id of ids) {
      if (pool <= 0) break;
      const bal = left.get(id) ?? 0;
      if (bal <= 0) continue;
      const pay = Math.min(pool, bal);
      left.set(id, bal - pay);
      pool -= pay;
    }
    for (const id of ids) {
      if ((left.get(id) ?? 0) <= 0.5 && !steps.some((s) => s.id === id)) {
        left.set(id, 0);
        steps.push({ id, month });
        freed += byId.get(id)!.installment;
      }
    }
    if (steps.length === ids.length) {
      return { months: month, interest: Math.round(interest), steps };
    }
  }
  return { months: null, interest: Math.round(interest), steps };
}

export function buildDebtPlan(debts: PlanDebt[], extra: number): DebtPlan | null {
  if (debts.length === 0) return null;
  const { order, ids } = planOrder(debts);
  const baseline = run(debts, ids, 0, false);
  const plan = run(debts, ids, Math.max(0, extra), true);
  const monthsSaved =
    baseline.months != null && plan.months != null
      ? Math.max(0, baseline.months - plan.months)
      : baseline.months == null && plan.months != null
        ? null
        : 0;
  return {
    order,
    ids,
    baseline,
    plan,
    monthsSaved,
    interestSaved: Math.max(0, baseline.interest - plan.interest),
    ratesKnown: order === 'cheapest',
  };
}

/** The month a debt is paid off, `months` from `now` (its payment month). */
export function payoffDate(months: number, now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() + months, 1);
}

/** Monthly rate (%) from what the user typed: "1,9" → 1.9. Effective annual "28 EA" is converted. */
export function parseMonthlyRate(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(',', '.');
  if (!text) return 0;
  const digits = text.replace(/[^0-9.]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return null;
  const annual = /e\.?\s?a|anual|year|apr/.test(text) || n > 8;
  const monthly = annual ? (Math.pow(1 + n / 100, 1 / 12) - 1) * 100 : n;
  return Math.round(monthly * 1000) / 1000;
}
