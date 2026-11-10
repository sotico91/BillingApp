/** When the in-app update prompt asks Google Play again. Pure, so it is tested. */

/** Two returns to the front this close together share one question to Play. */
export const RECHECK_MIN_MS = 60 * 1000;
/** "Not now" keeps quiet about that version this long. */
export const SNOOZE_MS = 2 * 60 * 60 * 1000;

export function shouldCheckUpdate(now: number, lastCheck: number, asking: boolean): boolean {
  if (asking) return false;
  return now - lastCheck >= RECHECK_MIN_MS;
}

/** True while "Not now" for this version is still fresh; a newer version asks again. */
export function updateSnoozed(
  declined: { versionCode: number; at: number } | null,
  versionCode: number,
  now: number
): boolean {
  if (!declined) return false;
  if (versionCode > declined.versionCode) return false;
  return now - declined.at < SNOOZE_MS;
}
