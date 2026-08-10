import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FadeInBlock } from '@/src/components/FadeInBlock';
import { ReminderSettingsCard } from '@/src/components/ReminderSettingsCard';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import { toneFromBudgetRatio } from '@/src/utils/signalTone';

export default function PlanScreen() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { budgetStatus, antForPeriod } = useFinance();
  const ant = antForPeriod('mes');

  const activeBudgets = budgetStatus.filter((b) => b.spent > 0);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FadeInBlock>
          <Text style={styles.title}>{t('plan.title')}</Text>
          <Text style={styles.subtitle}>{t('plan.subtitle')}</Text>
        </FadeInBlock>

        <FadeInBlock index={1}>
          <Text style={styles.section}>{t('reminder.title')}</Text>
          <ReminderSettingsCard />
        </FadeInBlock>

        <FadeInBlock index={2}>
          <Text style={styles.section}>{t('plan.budgets')}</Text>
          {activeBudgets.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.empty}>{t('plan.budgetsEmpty')}</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {activeBudgets.map((b, index) => {
                const tone = toneFromBudgetRatio(b.ratio);
                const over = b.remaining < 0;
                const pct = Math.min(Math.round(b.ratio * 100), 999);
                return (
                  <View
                    key={b.categoryId}
                    style={[
                      styles.row,
                      index < activeBudgets.length - 1 && styles.rowDivider,
                    ]}>
                    <View style={styles.rowTop}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {t(`category.${b.categoryId}` as TranslationKey)}
                      </Text>
                      <Text
                        style={[
                          styles.rowPct,
                          tone === 'danger' && styles.textDanger,
                          tone === 'warn' && styles.textWarn,
                          tone === 'good' && styles.textGood,
                        ]}>
                        {pct}%
                      </Text>
                    </View>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${Math.min(b.ratio * 100, 100)}%`,
                            backgroundColor:
                              tone === 'danger'
                                ? palette.danger
                                : tone === 'warn'
                                  ? palette.accent
                                  : tone === 'good'
                                    ? palette.success
                                    : palette.teal,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.rowMeta}>
                      {format(b.spent)} / {format(b.limit)}
                      {' · '}
                      {over
                        ? t('plan.over', { amount: format(Math.abs(b.remaining)) })
                        : t('plan.left', { amount: format(b.remaining) })}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </FadeInBlock>

        <FadeInBlock index={3}>
          <Text style={styles.section}>{t('plan.antTitle')}</Text>
          <View style={styles.listCard}>
            <View style={styles.antHeader}>
              <Text style={styles.rowTitle}>{t('home.antTotal')}</Text>
              <Text style={styles.antTotal}>{format(ant.total)}</Text>
            </View>
            {ant.items.length === 0 ? (
              <Text style={styles.empty}>{t('plan.antEmpty')}</Text>
            ) : (
              ant.items.map((item, index) => (
                <View
                  key={item.categoryId}
                  style={[
                    styles.antRow,
                    index < ant.items.length - 1 && styles.rowDivider,
                  ]}>
                  <Text style={styles.rowMeta}>
                    {t(`category.${item.categoryId}` as TranslationKey)}
                  </Text>
                  <Text style={styles.antAmount}>{format(item.amount)}</Text>
                </View>
              ))
            )}
          </View>
        </FadeInBlock>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 22, paddingBottom: 120, gap: 14 },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    color: palette.brand,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.brandMuted,
    lineHeight: 20,
  },
  section: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.brand,
    marginBottom: 8,
  },
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  listCard: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: palette.border,
  },
  row: {
    paddingVertical: 14,
    gap: 8,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowTitle: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  rowPct: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: palette.inkMuted,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,28,36,0.06)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  rowMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    lineHeight: 20,
    paddingVertical: 12,
  },
  antHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  antTotal: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: palette.ink,
  },
  antRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  antAmount: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  textDanger: { color: palette.danger },
  textWarn: { color: palette.accentDeep },
  textGood: { color: palette.success },
});
