import {
  formatDayRange,
  monthGrid,
  pickDay,
  presetRange,
  rangeBounds,
} from '../dateRange';

describe('monthGrid', () => {
  it('starts on Monday and pads to full weeks', () => {
    // November 2026 starts on a Sunday.
    const weeks = monthGrid(2026, 10);
    expect(weeks[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(weeks[0][6]?.getDate()).toBe(1);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    const days = weeks.flat().filter(Boolean);
    expect(days).toHaveLength(30);
  });
});

describe('pickDay', () => {
  const d = (day: number) => new Date(2026, 10, day, 15, 30);

  it('first tap starts, second tap closes the range', () => {
    const a = pickDay({ from: null, to: null }, d(3));
    expect(a.from?.getDate()).toBe(3);
    expect(a.to).toBeNull();
    const b = pickDay(a, d(10));
    expect(b.to?.getDate()).toBe(10);
    expect(b.from?.getHours()).toBe(0);
  });

  it('a second tap before the first swaps the ends', () => {
    const r = pickDay({ from: new Date(2026, 10, 10), to: null }, d(3));
    expect(r.from?.getDate()).toBe(3);
    expect(r.to?.getDate()).toBe(10);
  });

  it('a tap after a closed range starts over', () => {
    const r = pickDay({ from: new Date(2026, 10, 3), to: new Date(2026, 10, 10) }, d(20));
    expect(r.from?.getDate()).toBe(20);
    expect(r.to).toBeNull();
  });
});

describe('rangeBounds', () => {
  it('includes the whole last day', () => {
    const b = rangeBounds({ from: new Date(2026, 10, 3, 9), to: new Date(2026, 10, 10, 9) });
    expect(b.from).toEqual(new Date(2026, 10, 3));
    expect(b.to).toEqual(new Date(2026, 10, 11));
  });
});

describe('presetRange', () => {
  const now = new Date(2026, 10, 11, 18);
  it('last 7 days counts today', () => {
    const r = presetRange('last7', now);
    expect(r.from).toEqual(new Date(2026, 10, 5));
    expect(r.to).toEqual(new Date(2026, 10, 11));
  });
  it('this year starts on Jan 1', () => {
    expect(presetRange('thisYear', now).from).toEqual(new Date(2026, 0, 1));
  });
});

describe('formatDayRange', () => {
  it('shows the year once inside one year', () => {
    const s = formatDayRange({ from: new Date(2026, 10, 3), to: new Date(2026, 10, 10) }, 'en');
    expect(s).toContain('2026');
    expect(s.indexOf('2026')).toBe(s.lastIndexOf('2026'));
  });
  it('shows both years across years', () => {
    const s = formatDayRange({ from: new Date(2025, 11, 20), to: new Date(2026, 0, 5) }, 'en');
    expect(s).toContain('2025');
    expect(s).toContain('2026');
  });
});
