import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePro } from '@/src/hooks/usePro';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { colors } from '@/src/theme';
import { palette, radii } from '@/src/theme/colors';
import type { Debt } from '@/src/types/finance';
import { buildDebtPlan, payoffDate, plannableDebts } from '@/src/utils/debtPlan';
import { tapFeedback } from '@/src/utils/selectFeedback';

const EXTRAS = { COP: [50_000, 100_000, 200_000, 500_000], USD: [25, 50, 100, 250] } as const;

/**
 * "Plan para salir de deudas" in Wealth. Everyone sees when they are debt-free
 * paying only the installments; Pro shows how much sooner (and how much less
 * interest) with an extra amount each month, and in what order to pay.
 */
export function DebtPlanCard({ debts }: { debts: Debt[] }) {
  const { t, language } = useLanguage();
  const { format, currency } = useMoney();
  const pro = usePro();
  const extras = EXTRAS[currency] ?? EXTRAS.COP;
  const [extra, setExtra] = useState<number>(extras[1]);

  const list = useMemo(() => plannableDebts(debts), [debts]);
  const plan = useMemo(() => buildDebtPlan(list, extra), [list, extra]);
  if (!plan) return null;

  const locale = language === 'es' ? 'es-CO' : 'en-US';
  const when = (months: number | null) =>
    months == null
      ? t('debtPlan.never')
      : payoffDate(months).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const nameOf = (id: string) => {
    const d = debts.find((x) => x.id === id);
    if (!d) return '';
    return d.nameKey ? t(d.nameKey as TranslationKey) : d.name ?? t('debt.mainCard');
  };

  return (
    <View style={styles.card} testID="debt-plan">
      <View style={styles.head}>
        <Text style={styles.title}>{t('debtPlan.title')}</Text>
        <View style={styles.tag}>
          <Text style={styles.tagText}>PRO</Text>
        </View>
      </View>
      <Text style={styles.body}>
        {plan.baseline.months == null
          ? t('debtPlan.baselineNever')
          : t('debtPlan.baseline', { date: when(plan.baseline.months) })}
      </Text>

      {!pro.isPro ? (
        <Pressable
          accessibilityRole="button"
          testID="debt-plan-unlock"
          onPress={() => {
            tapFeedback();
            pro.allow('debtPlan');
          }}
          style={({ pressed }) => [styles.unlock, pressed && { opacity: 0.8 }]}>
          <Text style={styles.unlockText}>{t('debtPlan.unlock')}</Text>
        </Pressable>
      ) : (
        <>
          <Text style={styles.label}>{t('debtPlan.extraLabel')}</Text>
          <View style={styles.chips}>
            {extras.map((amount) => {
              const on = amount === extra;
              return (
                <Pressable
                  key={amount}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    tapFeedback();
                    setExtra(amount);
                  }}
                  style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>+{format(amount)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.result}>
            {plan.plan.months == null
              ? t('debtPlan.planNever')
              : plan.monthsSaved === 1
                ? t('debtPlan.planSoonerOne', { date: when(plan.plan.months) })
                : plan.monthsSaved && plan.monthsSaved > 1
                ? t('debtPlan.planSooner', {
                    date: when(plan.plan.months),
                    months: plan.monthsSaved,
                  })
                : plan.baseline.months == null
                  ? t('debtPlan.planEnds', { date: when(plan.plan.months) })
                  : t('debtPlan.planSame', { date: when(plan.plan.months) })}
          </Text>
          {plan.ratesKnown && plan.interestSaved > 0 ? (
            <Text style={styles.saved}>
              {t('debtPlan.interestSaved', { amount: format(plan.interestSaved) })}
            </Text>
          ) : null}

          <Text style={styles.label}>
            {plan.order === 'cheapest' ? t('debtPlan.orderCheapest') : t('debtPlan.orderSmallest')}
          </Text>
          {plan.ids.map((id, i) => {
            const step = plan.plan.steps.find((s) => s.id === id);
            return (
              <View key={id} style={styles.step}>
                <Text style={styles.stepNum}>{i + 1}</Text>
                <Text style={styles.stepName} numberOfLines={1}>
                  {nameOf(id)}
                </Text>
                <Text style={styles.stepWhen}>{step ? when(step.month) : t('debtPlan.never')}</Text>
              </View>
            );
          })}
          {!plan.ratesKnown ? <Text style={styles.hint}>{t('debtPlan.rateHint')}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: 4,
    gap: 6,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'Fraunces_600SemiBold', fontSize: 18, color: palette.ink, flexShrink: 1 },
  tag: {
    backgroundColor: '#FDF3D6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: '#7A5A00' },
  body: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: palette.inkMuted, lineHeight: 20 },
  unlock: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unlockText: { fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: palette.white },
  label: {
    marginTop: 8,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipOn: { backgroundColor: colors.action.secondary, borderColor: colors.action.secondary },
  chipText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: palette.ink },
  chipTextOn: { color: palette.white },
  result: {
    marginTop: 8,
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: palette.ink,
    lineHeight: 21,
  },
  saved: { fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: colors.status.success },
  step: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
    overflow: 'hidden',
    backgroundColor: '#EEF3F6',
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: palette.ink,
  },
  stepName: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 14, color: palette.ink },
  stepWhen: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: palette.inkMuted },
  hint: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
    lineHeight: 17,
  },
});
