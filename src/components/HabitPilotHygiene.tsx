import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSettings } from '@/src/hooks/useSettings';

/** Records local calendar days the app was opened during the 14-day diary. */
export function HabitPilotHygiene() {
  const { ready, settings, recordHabitOpenDay } = useSettings();

  useEffect(() => {
    if (!ready || !settings.onboardingDone) return;
    void recordHabitOpenDay();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void recordHabitOpenDay();
    });
    return () => sub.remove();
  }, [ready, settings.onboardingDone, recordHabitOpenDay]);

  return null;
}
