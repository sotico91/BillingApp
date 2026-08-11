import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FadeInBlock } from '@/src/components/FadeInBlock';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import { categoryLabel } from '@/src/utils/categoryLabel';

export default function WealthScreen() {
  const { t, language } = useLanguage();
  const { format, parse, currency } = useMoney();
  const { settings, ensureDebtCategory } = useSettings();
  const spendConcepts = settings.spendConcepts ?? [];
  const { accounts, debts, subscriptions, netWorth, addDebt, removeDebt } = useFinance();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [installment, setInstallment] = useState('');
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);

  const monthlySubs = subscriptions
    .filter((s) => s.active)
    .reduce(
      (sum, s) => sum + (s.frequency === 'yearly' ? s.amount / 12 : s.amount),
      0
    );

  async function handleSaveDebt() {
    const parsedBalance = parse(balance);
    const parsedInstallment = parse(installment);
    if (!name.trim() || !parsedBalance || !parsedInstallment) {
      Alert.alert(t('wealth.addDebt'), t('wealth.debtNeed'));
      return;
    }
    const parsedRate = Number(rate.replace(',', '.')) || 0;

    setSaving(true);
    try {
      const categoryId = await ensureDebtCategory(name.trim());
      await addDebt({
        name: name.trim(),
        balance: parsedBalance,
        installment: parsedInstallment,
        interestRate: parsedRate,
        categoryId,
      });
      setName('');
      setBalance('');
      setInstallment('');
      setRate('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove(id: string, label: string) {
    Alert.alert(t('wealth.debtDelete'), label, [
      { text: t('add.ok'), style: 'cancel' },
      {
        text: t('wealth.debtDelete'),
        style: 'destructive',
        onPress: () => void removeDebt(id),
      },
    ]);
  }

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
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
          <View style={styles.sectionRow}>
            <Text style={styles.section}>{t('wealth.debts')}</Text>
            <Pressable onPress={() => setShowForm((v) => !v)} style={styles.addBtn}>
              <Text style={styles.addBtnText}>
                {showForm ? t('onboard.back') : t('wealth.addDebt')}
              </Text>
            </Pressable>
          </View>

          {showForm ? (
            <View style={styles.form}>
              <Text style={styles.copyHint}>{t('wealth.debtPermanentHint')}</Text>
              <Text style={styles.label}>{t('wealth.debtName')}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('wealth.debtNamePlaceholder')}
                placeholderTextColor={palette.inkSoft}
                style={styles.input}
              />
              <Text style={styles.label}>{t('wealth.debtBalance')}</Text>
              <TextInput
                value={balance}
                onChangeText={setBalance}
                keyboardType={currency === 'USD' ? 'decimal-pad' : 'number-pad'}
                placeholder="0"
                placeholderTextColor={palette.inkSoft}
                style={styles.input}
              />
              <Text style={styles.label}>{t('wealth.debtInstallment')}</Text>
              <TextInput
                value={installment}
                onChangeText={setInstallment}
                keyboardType={currency === 'USD' ? 'decimal-pad' : 'number-pad'}
                placeholder="0"
                placeholderTextColor={palette.inkSoft}
                style={styles.input}
              />
              <Text style={styles.label}>{t('wealth.debtRate')}</Text>
              <TextInput
                value={rate}
                onChangeText={setRate}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={palette.inkSoft}
                style={styles.input}
              />
              <Pressable
                onPress={() => void handleSaveDebt()}
                disabled={saving}
                style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>
                  {saving ? t('add.saving') : t('wealth.debtSave')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {debts.length === 0 && !showForm ? (
            <View style={styles.card}>
              <Text style={styles.empty}>{t('wealth.debtsEmpty')}</Text>
              <Text style={[styles.meta, { marginTop: 8 }]}>{t('wealth.howToPay')}</Text>
            </View>
          ) : null}

          {debts.map((debt) => {
            const label = debt.nameKey
              ? t(debt.nameKey as TranslationKey)
              : debt.name ?? t('debt.mainCard');
            const capitalShare =
              debt.installment > 0
                ? Math.round(
                    ((debt.installment -
                      debt.installment * (debt.interestRate / 100 / 12)) /
                      debt.installment) *
                      100
                  )
                : 0;
            return (
              <View key={debt.id} style={styles.card}>
                <View style={styles.sectionRow}>
                  <Text style={styles.cardTitle}>{label}</Text>
                  <Pressable onPress={() => confirmRemove(debt.id, label)}>
                    <Text style={styles.deleteText}>{t('wealth.debtDelete')}</Text>
                  </Pressable>
                </View>
                <Text style={styles.amount}>{format(debt.balance)}</Text>
                {debt.installment > 0 ? (
                  <Text style={styles.meta}>
                    {t('wealth.installment', { amount: format(debt.installment) })}
                  </Text>
                ) : null}
                {debt.interestRate > 0 ? (
                  <Text style={styles.meta}>
                    {t('wealth.rate', { rate: debt.interestRate })}
                  </Text>
                ) : null}
                <Text style={styles.meta}>
                  {t('wealth.next', {
                    date: new Date(debt.nextPaymentDate).toLocaleDateString(
                      language === 'es' ? 'es-CO' : 'en-US'
                    ),
                  })}
                </Text>
                {debt.installment > 0 ? (
                  <Text style={styles.meta}>
                    {t('wealth.capitalShare', {
                      percent: Math.max(capitalShare, 35),
                    })}
                  </Text>
                ) : null}
              </View>
            );
          })}

          {debts.length > 0 ? (
            <Text style={styles.hint}>{t('wealth.howToPay')}</Text>
          ) : null}
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
                {categoryLabel(sub.categoryId, t, spendConcepts)} ·{' '}
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
  sectionRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  section: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.brand,
    flex: 1,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: palette.brand,
  },
  addBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.white,
  },
  form: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: 8,
    gap: 6,
  },
  copyHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
    marginBottom: 4,
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkMuted,
    marginTop: 4,
  },
  input: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: palette.ink,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F4F7F8',
  },
  saveBtn: {
    marginTop: 10,
    backgroundColor: palette.brand,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.white,
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
    flex: 1,
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
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    lineHeight: 20,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: 8,
  },
  deleteText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.danger,
  },
});
