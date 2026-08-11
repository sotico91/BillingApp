import { useEffect, useRef } from 'react';

import { flattenSpendSubs } from '@/src/data/spendConcepts';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { categoryLabel } from '@/src/utils/categoryLabel';

/**
 * Drops reminder rules whose subcategory no longer exists in the user's concept tree.
 */
export function ReminderHygiene() {
  const { t } = useLanguage();
  const { settings, ready, pruneRemindersToRegistered } = useSettings();
  const ranKey = useRef<string>('');

  useEffect(() => {
    if (!ready || !settings.onboardingDone) return;

    const spendConcepts = settings.spendConcepts ?? [];
    const allowed = new Set(flattenSpendSubs(spendConcepts).map((s) => s.id));
    const rules = settings.reminderRules ?? [];
    const key = [
      rules.map((r) => `${r.subId}@${r.hour}:${r.minute}:${r.dayOfMonth ?? 'd'}`).join(','),
      [...allowed].sort().join(','),
    ].join('|');
    if (ranKey.current === key) return;
    ranKey.current = key;

    const labels: Record<string, { title: string; body: string }> = {};
    for (const rule of rules) {
      if (!allowed.has(rule.subId)) continue;
      labels[rule.subId] = {
        title: t('reminder.pushTitle'),
        body: t('reminder.pushBody', {
          category: categoryLabel(rule.subId, t, spendConcepts),
        }),
      };
    }

    void pruneRemindersToRegistered(allowed, labels);
  }, [
    ready,
    settings.onboardingDone,
    settings.reminderRules,
    settings.spendConcepts,
    pruneRemindersToRegistered,
    t,
  ]);

  return null;
}
