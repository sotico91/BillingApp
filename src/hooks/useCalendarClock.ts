import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Keeps day/month keys fresh across midnight and when returning to the app. */
export function useCalendarClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const timer = setInterval(refresh, 30_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const day = now.getDate();

  return {
    now,
    year,
    monthIndex,
    day,
    monthKey: `${year}-${monthIndex}`,
    dayKey: `${year}-${monthIndex}-${day}`,
  };
}
