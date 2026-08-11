import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { FadeInBlock } from '@/src/components/FadeInBlock';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { findSpendSub } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { tapFeedback } from '@/src/utils/selectFeedback';

export default function WealthScreen() {
  const { t, language } = useLanguage();
  const { format, parse, currency } = useMoney();
  const { settings, ensureDebtCategory } = useSettings();
  const spendConcepts = settings.spendConcepts ?? [];
  const {
    accounts,
    debts,
    netWorth,
    addDebt,
    removeDebt,
    updateBudget,
    transactionsForPeriod,
    budgetStatus,
  } = useFinance();

  const [showForm, setShowForm] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [debtsOpen, setDebtsOpen] = useState(true);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [installment, setInstallment] = useState('');
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);

  const monthTx = transactionsForPeriod('mes', 'mine');

  const paidByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of monthTx) {
      if (tx.type !== 'debt_payment' && tx.type !== 'expense') continue;
      if (!tx.categoryId) continue;
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
    }
    return map;
  }, [monthTx]);

  const monthlyInstallments = debts.reduce((s, d) => s + (d.installment || 0), 0);
  const paidInstallmentsThisMonth = debts.reduce((sum, debt) => {
    if (!debt.categoryId) return sum;
    return sum + (paidByCategory.get(debt.categoryId) ?? 0);
  }, 0);

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
      // Track installment as monthly tope on that Créditos subcategory.
      await updateBudget(categoryId, parsedInstallment);
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
      { text: t('history.cancel'), style: 'cancel' },
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
          <Text style={styles.subtitle}>{t('wealth.subtitle')}</Text>
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
          <CollapsibleSection
            title={t('wealth.accounts')}
            open={accountsOpen}
            onToggle={() => setAccountsOpen((v) => !v)}
            summary={t('wealth.accountsCollapsed', { count: accounts.length })}>
            {accounts.map((acc) => (
              <View key={acc.id} style={styles.card}>
                <Text style={styles.cardTitle}>{t(acc.nameKey as TranslationKey)}</Text>
                <Text style={styles.amount}>{format(acc.balance)}</Text>
              </View>
            ))}
          </CollapsibleSection>
        </FadeInBlock>

        <FadeInBlock index={2}>
          <CollapsibleSection
            title={t('wealth.debts')}
            open={debtsOpen}
            onToggle={() => setDebtsOpen((v) => !v)}
            summary={
              debts.length === 0
                ? t('wealth.debtsEmptyShort')
                : t('wealth.debtsCollapsed', {
                    count: debts.length,
                    amount: format(monthlyInstallments),
                  })
            }>
            <View style={styles.sectionRow}>
              <Text style={styles.copyHintFlex}>{t('wealth.debtConceptHint')}</Text>
              <Pressable
                onPress={() => {
                  tapFeedback();
                  setShowForm((v) => !v);
                }}
                style={styles.addBtn}>
                <Text style={styles.addBtnText}>
                  {showForm ? t('onboard.back') : t('wealth.addDebt')}
                </Text>
              </Pressable>
            </View>

            {debts.length > 0 ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{t('wealth.fixedMonth')}</Text>
                <Text style={styles.amount}>{format(monthlyInstallments)}</Text>
                <Text style={styles.meta}>
                  {t('wealth.fixedPaid', {
                    paid: format(paidInstallmentsThisMonth),
                    due: format(monthlyInstallments),
                  })}
                </Text>
                <Pressable
                  onPress={() => {
                    tapFeedback();
                    router.push('/(tabs)/plan');
                  }}>
                  <Text style={styles.link}>{t('wealth.openPlan')}</Text>
                </Pressable>
              </View>
            ) : null}

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
                <Text style={styles.copyHint}>{t('wealth.debtBudgetHint')}</Text>
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
              const conceptLabel = debt.categoryId
                ? categoryLabel(debt.categoryId, t, spendConcepts)
                : label;
              const hit = debt.categoryId
                ? findSpendSub(spendConcepts, debt.categoryId)
                : null;
              const paid = debt.categoryId
                ? paidByCategory.get(debt.categoryId) ?? 0
                : 0;
              const budget = debt.categoryId
                ? budgetStatus.find((b) => b.categoryId === debt.categoryId)
                : undefined;
              const due = debt.installment || 0;
              const ratio = due > 0 ? paid / due : 0;
              const over = due > 0 && paid > due;

              return (
                <View key={debt.id} style={styles.card}>
                  <View style={styles.sectionRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{label}</Text>
                      <Text style={styles.conceptChip}>
                        {hit
                          ? t('wealth.linkedConcept', { concept: conceptLabel })
                          : t('wealth.unlinkedConcept')}
                      </Text>
                    </View>
                    <Pressable onPress={() => confirmRemove(debt.id, label)}>
                      <Text style={styles.deleteText}>{t('wealth.debtDelete')}</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.amount}>{format(debt.balance)}</Text>
                  <Text style={styles.meta}>{t('wealth.balanceLeft')}</Text>
                  {due > 0 ? (
                    <>
                      <Text style={styles.meta}>
                        {t('wealth.installment', { amount: format(due) })}
                      </Text>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            {
                              width: `${Math.min(ratio * 100, 100)}%`,
                              backgroundColor: over ? palette.danger : palette.teal,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.meta,
                          over && { color: palette.danger },
                        ]}>
                        {t('wealth.monthProgress', {
                          paid: format(paid),
                          due: format(due),
                        })}
                      </Text>
                    </>
                  ) : null}
                  {budget ? (
                    <Text style={styles.meta}>
                      {t('wealth.topeLinked', {
                        amount: format(budget.limit),
                      })}
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
                </View>
              );
            })}

            {debts.length > 0 ? (
              <Text style={styles.hint}>{t('wealth.howToPay')}</Text>
            ) : null}
          </CollapsibleSection>
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
  subtitle: {
    marginTop: 6,
    marginBottom: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.brandMuted,
    lineHeight: 20,
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
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  copyHintFlex: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
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
  summaryCard: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: 8,
  },
  summaryTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.inkMuted,
    textTransform: 'uppercase',
  },
  link: {
    marginTop: 8,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.accentDeep,
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
  },
  conceptChip: {
    marginTop: 4,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.accentDeep,
  },
  amount: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
    marginTop: 4,
  },
  track: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E8EEF1',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
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
