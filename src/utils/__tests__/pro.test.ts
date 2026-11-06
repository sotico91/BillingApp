import {
  FREE_ASKS_PER_MONTH,
  annualSavingPercent,
  asksLeft,
  asksUsed,
  decideFounder,
  freeAllows,
  monthKey,
  recordAsk,
  rememberShowsPro,
  storedShowsPro,
  userBudgetCount,
} from '@/src/utils/pro';

const nov = new Date(2026, 10, 5);
const dec = new Date(2026, 11, 1);

describe('free questions per month', () => {
  it('starts with the full allowance', () => {
    expect(asksLeft({}, nov)).toBe(FREE_ASKS_PER_MONTH);
  });

  it('counts questions in the same month', () => {
    let state = {};
    state = recordAsk(state, nov);
    state = recordAsk(state, nov);
    expect(asksUsed(state, nov)).toBe(2);
    expect(asksLeft(state, nov)).toBe(FREE_ASKS_PER_MONTH - 2);
  });

  it('starts over when the month changes', () => {
    const state = { askMonth: monthKey(nov), askCount: FREE_ASKS_PER_MONTH };
    expect(asksLeft(state, nov)).toBe(0);
    expect(asksLeft(state, dec)).toBe(FREE_ASKS_PER_MONTH);
    expect(recordAsk(state, dec)).toMatchObject({ askMonth: '2026-12', askCount: 1 });
  });

  it('never goes below zero', () => {
    expect(asksLeft({ askMonth: '2026-11', askCount: 40 }, nov)).toBe(0);
  });
});

describe('founder (installed before Pro)', () => {
  it('is a founder when onboarding was already done', () => {
    expect(decideFounder({}, true).founder).toBe(true);
  });

  it('is not a founder on a fresh install', () => {
    expect(decideFounder({}, false).founder).toBe(false);
  });

  it('is decided only once', () => {
    expect(decideFounder({ founder: false }, true).founder).toBe(false);
    expect(decideFounder({ founder: true }, false).founder).toBe(true);
  });
});

describe('free allowance', () => {
  it('does not count debt installment limits', () => {
    const budgets = [{ categoryId: 'food' }, { categoryId: 'debt-moto' }, { categoryId: 'fun' }];
    expect(userBudgetCount(budgets, new Set(['debt-moto']))).toBe(2);
  });

  it('allows up to three limits and three reminders', () => {
    expect(freeAllows('budgets', 2)).toBe(true);
    expect(freeAllows('budgets', 3)).toBe(false);
    expect(freeAllows('reminders', 3)).toBe(false);
    expect(freeAllows('ask', FREE_ASKS_PER_MONTH - 1)).toBe(true);
  });
});

describe('annual saving', () => {
  it('compares the year against twelve months', () => {
    expect(annualSavingPercent(9900, 69900)).toBe(41);
  });

  it('shows nothing without a saving or a price', () => {
    expect(annualSavingPercent(9900, 9900 * 12)).toBeNull();
    expect(annualSavingPercent(0, 69900)).toBeNull();
  });
});

describe('showing Rumi Pro', () => {
  it('waits for the store before changing anything', () => {
    const state = { showsPro: true };
    expect(rememberShowsPro(state, false, false)).toBe(state);
  });

  it('turns on when Pro is active and off when it expires', () => {
    const on = rememberShowsPro({ founder: false }, true, true);
    expect(on).toEqual({ founder: false, showsPro: true });
    expect(rememberShowsPro(on, false, true).showsPro).toBe(false);
  });

  it('keeps the same object when nothing changes', () => {
    const state = { showsPro: true };
    expect(rememberShowsPro(state, true, true)).toBe(state);
  });

  it('reads the saved flag for the launch screen', () => {
    expect(storedShowsPro(JSON.stringify({ showsPro: true }))).toBe(true);
    expect(storedShowsPro(JSON.stringify({ founder: true }))).toBe(false);
    expect(storedShowsPro(null)).toBe(false);
    expect(storedShowsPro('{broken')).toBe(false);
  });
});
