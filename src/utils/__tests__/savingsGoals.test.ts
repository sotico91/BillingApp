import { deadlineIn, goalStatus, parseMonthKey, roundUpTo } from '../savingsGoals';

const now = new Date(2026, 10, 11); // Nov 2026

describe('goalStatus', () => {
  it('without a date: progress only', () => {
    const s = goalStatus({ target: 1_000_000 }, 250_000, now);
    expect(s.progress).toBeCloseTo(0.25);
    expect(s.left).toBe(750_000);
    expect(s.monthly).toBeNull();
    expect(s.monthsLeft).toBeNull();
    expect(s.done).toBe(false);
  });

  it('splits what is left over the months to the deadline, rounded up', () => {
    // Nov 2026 → May 2027 = 6 months.
    const s = goalStatus({ target: 1_000_000, deadline: '2027-05' }, 0, now, 1000);
    expect(s.monthsLeft).toBe(6);
    expect(s.monthly).toBe(167_000);
  });

  it('a deadline this month asks for everything now', () => {
    const s = goalStatus({ target: 500_000, deadline: '2026-11' }, 100_000, now);
    expect(s.monthsLeft).toBe(1);
    expect(s.monthly).toBe(400_000);
    expect(s.late).toBe(false);
  });

  it('a past deadline is late until reached', () => {
    expect(goalStatus({ target: 500_000, deadline: '2026-08' }, 100_000, now).late).toBe(true);
    expect(goalStatus({ target: 500_000, deadline: '2026-08' }, 600_000, now).late).toBe(false);
  });

  it('done caps progress and stops suggesting', () => {
    const s = goalStatus({ target: 500_000, deadline: '2027-01' }, 700_000, now);
    expect(s.done).toBe(true);
    expect(s.progress).toBe(1);
    expect(s.left).toBe(0);
    expect(s.monthly).toBeNull();
  });

  it('a negative pocket balance counts as nothing saved', () => {
    expect(goalStatus({ target: 100 }, -50, now).saved).toBe(0);
  });
});

describe('helpers', () => {
  it('deadlineIn crosses the year', () => {
    expect(deadlineIn(3, now)).toBe('2027-02');
    expect(deadlineIn(12, now)).toBe('2027-11');
  });
  it('parseMonthKey rejects junk', () => {
    expect(parseMonthKey('2027-13')).toBeNull();
    expect(parseMonthKey('nope')).toBeNull();
    expect(parseMonthKey('2027-02')).toEqual({ year: 2027, month0: 1 });
  });
  it('roundUpTo', () => {
    expect(roundUpTo(166_666.7, 1000)).toBe(167_000);
    expect(roundUpTo(12.2, 1)).toBe(13);
  });
});
