/**
 * Pure helpers for Activity's "Fechas" filter: a calendar month grid, the
 * tap-to-pick rule (first day, then last day) and the presets. Days are local
 * midnights; a picked range includes both ends.
 */

export type DayRange = { from: Date; to: Date };

export function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/**
 * Weeks of a calendar month, Monday first. Cells outside the month are null,
 * so every week has 7 cells.
 */
export function monthGrid(year: number, monthIndex: number): (Date | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const days = new Date(year, monthIndex + 1, 0).getDate();
  // getDay(): Sunday 0 … Saturday 6 → Monday-first offset.
  const lead = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, monthIndex, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Next selection after tapping `day`. The first tap starts a range; the second
 * closes it (in either order); a tap after a closed range starts over.
 */
export function pickDay(
  current: { from: Date | null; to: Date | null },
  day: Date
): { from: Date | null; to: Date | null } {
  const tapped = dayStart(day);
  const { from, to } = current;
  if (!from || to) return { from: tapped, to: null };
  if (tapped.getTime() < from.getTime()) return { from: tapped, to: from };
  return { from, to: tapped };
}

/** [from, to) instants covering every day of the range, for filtering movements. */
export function rangeBounds(range: DayRange): { from: Date; to: Date } {
  return { from: dayStart(range.from), to: addDays(dayStart(range.to), 1) };
}

export type RangePreset = 'last7' | 'last30' | 'thisYear';

export function presetRange(preset: RangePreset, now = new Date()): DayRange {
  const today = dayStart(now);
  if (preset === 'last7') return { from: addDays(today, -6), to: today };
  if (preset === 'last30') return { from: addDays(today, -29), to: today };
  return { from: new Date(today.getFullYear(), 0, 1), to: today };
}

/** "3 nov – 10 nov 2026", or "3 nov 2025 – 10 ene 2026" across years; one day shows once. */
export function formatDayRange(range: DayRange, language: 'en' | 'es'): string {
  const locale = language === 'es' ? 'es-CO' : 'en-US';
  const fmt = (d: Date, year: boolean) =>
    d
      .toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        ...(year ? { year: 'numeric' } : {}),
      })
      .replace(/\./g, '')
      .replace(/ de /g, ' ');
  if (sameDay(range.from, range.to)) return fmt(range.from, true);
  const crossYear = range.from.getFullYear() !== range.to.getFullYear();
  return `${fmt(range.from, crossYear)} – ${fmt(range.to, true)}`;
}
