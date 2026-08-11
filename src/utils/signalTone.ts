export type SignalTone = 'neutral' | 'good' | 'warn' | 'danger';

/** Budget progress → visual tone for cards and bars. */
export function toneFromBudgetRatio(ratio: number): SignalTone {
  /** Over budget only when spent is strictly above the limit. */
  if (ratio > 1) return 'danger';
  if (ratio >= 0.8) return 'warn';
  if (ratio > 0 && ratio <= 0.55) return 'good';
  return 'neutral';
}

export function toneFromSavings(amount: number): SignalTone {
  if (amount > 0) return 'good';
  if (amount < 0) return 'danger';
  return 'neutral';
}

export function toneFromExpensePressure(opts: {
  expenses: number;
  income: number;
  worstBudgetRatio: number;
}): SignalTone {
  if (opts.worstBudgetRatio >= 1 || (opts.income > 0 && opts.expenses > opts.income)) {
    return 'danger';
  }
  if (opts.worstBudgetRatio >= 0.8 || (opts.income > 0 && opts.expenses / opts.income >= 0.85)) {
    return 'warn';
  }
  if (opts.income > 0 && opts.expenses / opts.income <= 0.6) {
    return 'good';
  }
  return 'neutral';
}
