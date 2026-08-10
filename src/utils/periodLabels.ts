import type { Period } from '@/src/types/finance';

/** Deprecated static labels — screens should use i18n period.* keys */
export const PERIOD_LABELS: Record<Period, string> = {
  hoy: 'Today',
  semana: 'This week',
  mes: 'This month',
};
