/**
 * Savings goals: each one is tied to a money pocket in Wealth, and what is
 * saved is that pocket's balance. Contributions are ordinary "Mover" moves into
 * the pocket, so the goal always matches the real money. Pure functions only.
 */

export type SavingsGoal = {
  id: string;
  name: string;
  /** Amount to reach, in the app currency. */
  target: number;
  /** The pocket (Account id) that holds the money for this goal. */
  accountId: string;
  /** Month to reach it by, as YYYY-MM. None = no date, no suggested amount. */
  deadline?: string;
  createdAt: string;
};

export type GoalStatus = {
  saved: number;
  left: number;
  /** 0–1. */
  progress: number;
  done: boolean;
  /** Months from this month to the deadline month (at least 1), null without a date. */
  monthsLeft: number | null;
  /** Suggested amount to put in each month to get there on time, null without a date or when done. */
  monthly: number | null;
  /** The deadline month already passed and the goal isn't reached. */
  late: boolean;
};

function monthIndex(year: number, month0: number): number {
  return year * 12 + month0;
}

export function parseMonthKey(key: string): { year: number; month0: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const month0 = Number(m[2]) - 1;
  if (month0 < 0 || month0 > 11) return null;
  return { year: Number(m[1]), month0 };
}

/** YYYY-MM of the month `months` after `now`'s month. */
export function deadlineIn(months: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() + months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Rounds a suggested amount up to a friendly step (COP to the thousand). */
export function roundUpTo(amount: number, step: number): number {
  if (step <= 1) return Math.ceil(amount);
  return Math.ceil(amount / step) * step;
}

export function goalStatus(
  goal: Pick<SavingsGoal, 'target' | 'deadline'>,
  balance: number,
  now = new Date(),
  step = 1
): GoalStatus {
  const saved = Math.max(0, balance);
  const target = Math.max(0, goal.target);
  const left = Math.max(0, target - saved);
  const done = target > 0 && saved >= target;
  const progress = target > 0 ? Math.min(1, saved / target) : 0;

  const due = goal.deadline ? parseMonthKey(goal.deadline) : null;
  if (!due) return { saved, left, progress, done, monthsLeft: null, monthly: null, late: false };

  const diff = monthIndex(due.year, due.month0) - monthIndex(now.getFullYear(), now.getMonth());
  const late = diff < 0 && !done;
  const monthsLeft = Math.max(1, diff);
  const monthly = done ? null : roundUpTo(left / monthsLeft, step);
  return { saved, left, progress, done, monthsLeft, monthly, late };
}
