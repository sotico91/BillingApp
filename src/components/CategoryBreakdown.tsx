import { StyleSheet, Text, View } from 'react-native';

import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { categoryLabel } from '@/src/utils/categoryLabel';
import {
  toneFromBudgetRatio,
  type SignalTone,
} from '@/src/utils/signalTone';

type Insight = {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  percent: number;
  count: number;
};

type BudgetHint = {
  categoryId: string;
  ratio: number;
  remaining: number;
};

type Props = {
  insights: Insight[];
  emptyLabel?: string;
  budgetStatus?: BudgetHint[];
};

export function CategoryBreakdown({ insights, emptyLabel, budgetStatus }: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const spendConcepts = settings.spendConcepts ?? [];

  if (insights.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.empty}>{emptyLabel ?? t('insights.emptyPeriod')}</Text>
      </View>
    );
  }

  const max = Math.max(...insights.map((i) => i.total), 1);
  const maxCount = Math.max(...insights.map((i) => i.count), 0);
  const mostFrequentId =
    maxCount >= 3
      ? insights.find((i) => i.count === maxCount)?.categoryId
      : undefined;

  const budgetMap = new Map(
    (budgetStatus ?? []).map((b) => [b.categoryId, b] as const)
  );

  return (
    <View style={styles.list}>
      {insights.map((item, index) => {
        const budget = budgetMap.get(item.categoryId);
        const budgetTone = budget ? toneFromBudgetRatio(budget.ratio) : 'neutral';
        const isTopSpend = index === 0 && item.percent >= 30;
        const isMostFrequent = item.categoryId === mostFrequentId;
        const tone: SignalTone =
          budgetTone === 'danger' || budgetTone === 'warn'
            ? budgetTone
            : isMostFrequent || isTopSpend
              ? 'danger'
              : budgetTone === 'good'
                ? 'good'
                : 'neutral';

        return (
          <View
            key={item.categoryId}
            style={[
              styles.item,
              tone === 'danger' && styles.itemDanger,
              tone === 'warn' && styles.itemWarn,
              tone === 'good' && styles.itemGood,
            ]}>
            <View style={styles.header}>
              <View style={styles.nameRow}>
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor:
                        tone === 'danger'
                          ? palette.danger
                          : tone === 'good'
                            ? palette.success
                            : item.color,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.name,
                    tone === 'danger' && styles.textDanger,
                    tone === 'good' && styles.textGood,
                  ]}>
                  {categoryLabel(item.categoryId, t, spendConcepts)}
                </Text>
              </View>
              <Text
                style={[
                  styles.total,
                  tone === 'danger' && styles.textDanger,
                  tone === 'good' && styles.textGood,
                ]}>
                {format(item.total)}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    backgroundColor:
                      tone === 'danger'
                        ? palette.danger
                        : tone === 'warn'
                          ? palette.accent
                          : tone === 'good'
                            ? palette.success
                            : item.color,
                    width: `${Math.max((item.total / max) * 100, 6)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.meta}>
              {item.percent.toFixed(0)}% · {item.count}{' '}
              {item.count === 1 ? t('insights.expense') : t('insights.expenses')}
              {budget
                ? ` · ${Math.round(budget.ratio * 100)}% ${t('insights.ofBudget')}`
                : ''}
            </Text>
            {isMostFrequent ? (
              <Text style={styles.badgeDanger}>{t('insights.mostFrequent')}</Text>
            ) : null}
            {budgetTone === 'danger' ? (
              <Text style={styles.badgeDanger}>{t('insights.overBudget')}</Text>
            ) : null}
            {budgetTone === 'warn' && !isMostFrequent ? (
              <Text style={styles.badgeWarn}>{t('insights.nearBudget')}</Text>
            ) : null}
            {budgetTone === 'good' && !isTopSpend && !isMostFrequent ? (
              <Text style={styles.badgeGood}>{t('insights.underBudget')}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    shadowColor: palette.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  item: {
    gap: 8,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: palette.border,
  },
  itemDanger: {
    backgroundColor: palette.dangerSoft,
    borderColor: 'rgba(214,69,69,0.35)',
  },
  itemWarn: {
    backgroundColor: palette.warnSoft,
    borderColor: 'rgba(255,107,74,0.35)',
  },
  itemGood: {
    backgroundColor: palette.successSoft,
    borderColor: 'rgba(31,157,108,0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
    flexShrink: 1,
  },
  total: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  textDanger: { color: palette.danger },
  textGood: { color: palette.success },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,28,36,0.06)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  meta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkSoft,
  },
  badgeDanger: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeWarn: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.accentDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeGood: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.success,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  emptyWrap: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 20,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: palette.inkMuted,
    lineHeight: 22,
  },
});
