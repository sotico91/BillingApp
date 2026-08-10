import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FadeInBlock } from '@/src/components/FadeInBlock';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';

export default function WealthScreen() {
  const { t, language } = useLanguage();
  const { format } = useMoney();
  const { accounts, debts, subscriptions, netWorth } = useFinance();

  const monthlySubs = subscriptions
    .filter((s) => s.active)
    .reduce(
      (sum, s) => sum + (s.frequency === 'yearly' ? s.amount / 12 : s.amount),
      0
    );

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FadeInBlock>
          <Text style={styles.title}>{t('wealth.title')}</Text>
          <View style={styles.netBox}>
            <Text style={styles.netLabel}>{t('wealth.net')}</Text>
            <Text style={styles.netValue}>{format(netWorth.net)}</Text>
            <Text style={styles.meta}>
              {t('wealth.assets')}: {format(netWorth.assets)}
            </Text>
            <Text style={styles.meta}>
              {t('wealth.liabilities')}: {format(netWorth.liabilities)}
            </Text>
          </View>
        </FadeInBlock>

        <FadeInBlock index={1}>
          <Text style={styles.section}>{t('wealth.accounts')}</Text>
          {accounts.map((acc) => (
            <View key={acc.id} style={styles.card}>
              <Text style={styles.cardTitle}>{t(acc.nameKey as TranslationKey)}</Text>
              <Text style={styles.amount}>{format(acc.balance)}</Text>
            </View>
          ))}
        </FadeInBlock>

        <FadeInBlock index={2}>
          <Text style={styles.section}>{t('wealth.debts')}</Text>
          {debts.map((debt) => {
            const capitalShare =
              debt.installment > 0
                ? Math.round(((debt.installment - debt.installment * (debt.interestRate / 100 / 12)) /
                    debt.installment) *
                    100)
                : 0;
            return (
              <View key={debt.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {debt.nameKey
                    ? t(debt.nameKey as TranslationKey)
                    : debt.name ?? t('debt.mainCard')}
                </Text>
                <Text style={styles.amount}>{format(debt.balance)}</Text>
                <Text style={styles.meta}>
                  {t('wealth.installment', { amount: format(debt.installment) })}
                </Text>
                <Text style={styles.meta}>
                  {t('wealth.rate', { rate: debt.interestRate })}
                </Text>
                <Text style={styles.meta}>
                  {t('wealth.next', {
                    date: new Date(debt.nextPaymentDate).toLocaleDateString(
                      language === 'es' ? 'es-CO' : 'en-US'
                    ),
                  })}
                </Text>
                <Text style={styles.meta}>
                  {t('wealth.capitalShare', {
                    percent: Math.max(capitalShare, 35),
                  })}
                </Text>
              </View>
            );
          })}
        </FadeInBlock>

        <FadeInBlock index={3}>
          <Text style={styles.section}>{t('wealth.subs')}</Text>
          <View style={styles.card}>
            <Text style={styles.meta}>
              {t('wealth.monthlySubs')}: {format(monthlySubs)}
            </Text>
            <Text style={styles.meta}>
              {t('wealth.yearlySubs')}: {format(monthlySubs * 12)}
            </Text>
          </View>
          {subscriptions.map((sub) => (
            <View key={sub.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {sub.nameKey
                  ? t(sub.nameKey as TranslationKey)
                  : sub.name ?? t('sub.streaming')}
              </Text>
              <Text style={styles.amount}>{format(sub.amount)}</Text>
              <Text style={styles.meta}>
                {t(`category.${sub.categoryId}` as TranslationKey)} ·{' '}
                {t(`freq.${sub.frequency}` as TranslationKey)}
              </Text>
            </View>
          ))}
        </FadeInBlock>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 22, paddingBottom: 120, gap: 12 },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    color: palette.brand,
  },
  netBox: {
    marginTop: 10,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  netLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkMuted,
    textTransform: 'uppercase',
  },
  netValue: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    color: palette.ink,
    marginVertical: 4,
  },
  section: {
    marginTop: 8,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.brand,
  },
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: 8,
  },
  cardTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  amount: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
    marginTop: 4,
  },
  meta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: 2,
  },
});
