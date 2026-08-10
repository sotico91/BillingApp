import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CategoryBreakdown } from '@/src/components/CategoryBreakdown';
import { FadeInBlock } from '@/src/components/FadeInBlock';
import { PeriodToggle } from '@/src/components/PeriodToggle';
import { SavingsDecor } from '@/src/components/SavingsDecor';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Period } from '@/src/types/finance';
import { buildSmartInsights, answerFinanceQuery } from '@/src/utils/smartInsights';
import { toneFromBudgetRatio } from '@/src/utils/signalTone';

export default function InsightsScreen() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { insightsForPeriod, totalForPeriod, transactions, budgetStatus, debts, availableCash } =
    useFinance();
  const [period, setPeriod] = useState<Period>('mes');
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');

  const insights = insightsForPeriod(period);
  const total = totalForPeriod(period, 'expense');
  const top = insights[0];
  const periodLabel = t(`period.${period}` as TranslationKey);
  const smart = buildSmartInsights(transactions, t, format);
  const topBudget = top
    ? budgetStatus.find((b) => b.categoryId === top.categoryId)
    : undefined;
  const topTone = topBudget
    ? toneFromBudgetRatio(topBudget.ratio)
    : top && top.percent >= 35
      ? 'danger'
      : 'neutral';

  const debtTotal = debts.reduce((s, d) => s + d.balance, 0);

  function ask() {
    setAnswer(
      answerFinanceQuery(query, transactions, format, t, {
        defaultPeriod: period,
        debtsTotal: debtTotal,
        availableCash,
      })
    );
  }

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FadeInBlock>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.pageTitle}>{t('insights.title')}</Text>
              <Text style={styles.pageHint}>{t('insights.subtitle')}</Text>
            </View>
            <SavingsDecor size="md" />
          </View>
          <PeriodToggle value={period} onChange={setPeriod} />
        </FadeInBlock>

        <FadeInBlock index={1}>
          <Text style={styles.searchTitle}>{t('insights.searchTitle')}</Text>
          <Text style={styles.searchHint}>{t('insights.searchHint')}</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('insights.searchPlaceholder')}
            placeholderTextColor={palette.inkSoft}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={ask}
          />
          <Pressable style={styles.searchBtn} onPress={ask}>
            <Text style={styles.searchBtnText}>{t('insights.searchAsk')}</Text>
          </Pressable>
          {answer ? <Text style={styles.answer}>{answer}</Text> : null}
        </FadeInBlock>

        <FadeInBlock index={2}>
          {smart.map((card) => (
            <View
              key={card.id}
              style={[
                styles.smartCard,
                card.tone === 'warn' && styles.warn,
                card.tone === 'good' && styles.good,
                card.tone === 'info' && styles.info,
              ]}>
              <Text
                style={[
                  styles.smartText,
                  card.tone === 'warn' && styles.textWarn,
                  card.tone === 'good' && styles.textGood,
                ]}>
                {card.text}
              </Text>
            </View>
          ))}
        </FadeInBlock>

        <FadeInBlock index={3}>
          <Text style={styles.headline}>
            {periodLabel}
            {'\n'}
            <Text style={styles.headlineAmount}>{format(total)}</Text>
          </Text>
          {top ? (
            <View
              style={[
                styles.highlight,
                topTone === 'danger' && styles.highlightDanger,
                topTone === 'warn' && styles.highlightWarn,
                topTone === 'good' && styles.highlightGood,
              ]}>
              <Text
                style={[
                  styles.highlightLabel,
                  topTone === 'danger' && styles.textDanger,
                  topTone === 'good' && styles.textGood,
                ]}>
                {t('insights.topCategory')}
              </Text>
              <Text
                style={[
                  styles.highlightText,
                  topTone === 'danger' && styles.textDanger,
                  topTone === 'good' && styles.textGood,
                ]}>
                {t('insights.topValue', {
                  amount: format(top.total),
                  category: t(`category.${top.categoryId}` as TranslationKey),
                })}
              </Text>
              <Text
                style={[
                  styles.highlightHint,
                  topTone === 'danger' && styles.textDanger,
                  topTone === 'good' && styles.textGood,
                ]}>
                {topTone === 'danger' || topTone === 'warn'
                  ? t('insights.topAlert')
                  : topTone === 'good'
                    ? t('insights.topGood')
                    : t('insights.percentOfTotal', {
                        percent: top.percent.toFixed(0),
                      })}
              </Text>
            </View>
          ) : (
            <Text style={styles.empty}>{t('insights.empty')}</Text>
          )}
        </FadeInBlock>

        <FadeInBlock index={4}>
          <Text style={styles.sectionTitle}>{t('insights.ranking')}</Text>
          <CategoryBreakdown insights={insights} budgetStatus={budgetStatus} />
        </FadeInBlock>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 22, paddingBottom: 120, gap: 14 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  heroCopy: { flex: 1 },
  pageTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    color: palette.brand,
  },
  pageHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.brandMuted,
  },
  searchTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.brand,
  },
  searchHint: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.brandMuted,
    lineHeight: 18,
  },
  searchInput: {
    marginTop: 8,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    color: palette.ink,
  },
  searchBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: palette.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: palette.white,
  },
  answer: {
    marginTop: 10,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: palette.brand,
    backgroundColor: 'rgba(255,255,255,0.16)',
    padding: 12,
    borderRadius: 12,
  },
  smartCard: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  warn: {
    backgroundColor: palette.warnSoft,
    borderColor: 'rgba(255,107,74,0.35)',
  },
  good: {
    backgroundColor: palette.successSoft,
    borderColor: 'rgba(31,157,108,0.35)',
  },
  info: {
    backgroundColor: palette.tealSoft,
    borderColor: 'rgba(46,196,182,0.35)',
  },
  smartText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
    lineHeight: 20,
  },
  headline: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: palette.brandMuted,
  },
  headlineAmount: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 36,
    color: palette.brand,
  },
  highlight: {
    marginTop: 10,
    backgroundColor: palette.accentSoft,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,74,0.25)',
  },
  highlightDanger: {
    backgroundColor: palette.dangerSoft,
    borderColor: 'rgba(214,69,69,0.4)',
  },
  highlightWarn: {
    backgroundColor: palette.warnSoft,
    borderColor: 'rgba(255,107,74,0.35)',
  },
  highlightGood: {
    backgroundColor: palette.successSoft,
    borderColor: 'rgba(31,157,108,0.35)',
  },
  highlightLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.accentDeep,
    textTransform: 'uppercase',
  },
  highlightText: {
    marginTop: 6,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.ink,
  },
  highlightHint: {
    marginTop: 8,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  sectionTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.brand,
    marginBottom: 8,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    color: palette.brandMuted,
  },
  textDanger: { color: palette.danger },
  textGood: { color: palette.success },
  textWarn: { color: palette.accentDeep },
});
