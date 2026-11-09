/**
 * Rumi Pro: what the free plan allows and how a free user's monthly
 * "Ask Rumi" count is kept. Pure functions, so they are tested without the
 * store SDK.
 *
 * Nothing that already exists is taken away: the limits only stop adding a
 * new limit, a new reminder or a new question past the free allowance.
 */

/** Questions to "Ask Rumi" per calendar month on the free plan. */
export const FREE_ASKS_PER_MONTH = 5;
/** Monthly limits (budgets) a free user can set, not counting debt installments. */
export const FREE_BUDGETS = 3;
/** Subcategory reminders a free user can keep. Debt due-date reminders are always free. */
export const FREE_REMINDERS = 3;

/** RevenueCat entitlement that unlocks Pro. */
export const PRO_ENTITLEMENT = 'pro';

/** `debtPlan` and `afford` are Pro only: the free plan has none. */
export type ProFeature = 'ask' | 'budgets' | 'reminders' | 'debtPlan' | 'afford';

/** What is saved on the phone about Pro. */
export type ProState = {
  /**
   * Installed before Pro existed: Pro for free, for good. `undefined` until the
   * first launch with Pro turned on decides it.
   */
  founder?: boolean;
  /** Calendar month (YYYY-MM) that `askCount` belongs to. */
  askMonth?: string;
  /** Questions asked in `askMonth`. */
  askCount?: number;
  /**
   * Pro was on (bought or founder) the last time the store answered, so the
   * launch screen can show "Rumi Pro" before the store answers again.
   */
  showsPro?: boolean;
};

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Questions already asked this month (0 once the month changes). */
export function asksUsed(state: ProState, now: Date): number {
  return state.askMonth === monthKey(now) ? Math.max(0, state.askCount ?? 0) : 0;
}

export function asksLeft(state: ProState, now: Date): number {
  return Math.max(0, FREE_ASKS_PER_MONTH - asksUsed(state, now));
}

/** State after one more question this month. */
export function recordAsk(state: ProState, now: Date): ProState {
  return { ...state, askMonth: monthKey(now), askCount: asksUsed(state, now) + 1 };
}

/**
 * Decided once, the first time Pro is on: whoever had already finished
 * onboarding was using Rumi before Pro and keeps it free.
 */
export function decideFounder(state: ProState, onboardingDone: boolean): ProState {
  if (state.founder !== undefined) return state;
  return { ...state, founder: onboardingDone };
}

/**
 * Saves whether the app shows itself as Rumi Pro. Kept as it was until the
 * store has answered (a founder needs no answer), so a slow start does not
 * flip a subscriber back to plain Rumi; an expired subscription turns it off.
 */
export function rememberShowsPro(state: ProState, showsPro: boolean, known: boolean): ProState {
  if (!known || state.showsPro === showsPro) return state;
  return { ...state, showsPro };
}

/** Reads the saved flag for the launch screen; anything unreadable is plain Rumi. */
export function storedShowsPro(raw: string | null): boolean {
  if (!raw) return false;
  try {
    return (JSON.parse(raw) as ProState).showsPro === true;
  } catch {
    return false;
  }
}

/**
 * Budgets that count toward the free allowance: the ones the person set in
 * Plan. A debt's installment limit is created with the debt and does not count.
 */
export function userBudgetCount(
  budgets: { categoryId: string }[],
  debtCategoryIds: Set<string>
): number {
  return budgets.filter((b) => !debtCategoryIds.has(b.categoryId)).length;
}

/** True when the free plan may add one more of `feature`, given how many exist. */
export function freeAllows(feature: ProFeature, existing: number): boolean {
  if (feature === 'budgets') return existing < FREE_BUDGETS;
  if (feature === 'reminders') return existing < FREE_REMINDERS;
  if (feature === 'debtPlan' || feature === 'afford') return false;
  return existing < FREE_ASKS_PER_MONTH;
}

/**
 * Yearly saving shown on the annual plan, as a whole percent, from the two
 * store prices. `null` when there is nothing to save.
 */
export function annualSavingPercent(monthlyPrice: number, annualPrice: number): number | null {
  if (!(monthlyPrice > 0) || !(annualPrice > 0)) return null;
  const pct = Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
  return pct > 0 ? pct : null;
}
