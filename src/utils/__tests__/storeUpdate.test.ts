import { RECHECK_MIN_MS, shouldCheckUpdate, SNOOZE_MS, updateSnoozed } from '@/src/utils/storeUpdate';

describe('store update prompt timing', () => {
  it('checks on every return to the front, but not twice within a minute', () => {
    expect(shouldCheckUpdate(1_000_000, 0, false)).toBe(true);
    expect(shouldCheckUpdate(1_000_000, 1_000_000 - RECHECK_MIN_MS + 1, false)).toBe(false);
    expect(shouldCheckUpdate(1_000_000, 1_000_000 - RECHECK_MIN_MS, false)).toBe(true);
    expect(shouldCheckUpdate(1_000_000, 0, true)).toBe(false);
  });

  it('"Not now" holds that version for 2 hours; a newer version asks again', () => {
    const declined = { versionCode: 20, at: 0 };
    expect(updateSnoozed(null, 20, 5)).toBe(false);
    expect(updateSnoozed(declined, 20, SNOOZE_MS - 1)).toBe(true);
    expect(updateSnoozed(declined, 20, SNOOZE_MS)).toBe(false);
    expect(updateSnoozed(declined, 21, 10)).toBe(false);
  });
});
