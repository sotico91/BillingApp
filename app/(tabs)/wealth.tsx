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

import { WalletQuickAdd } from '@/src/components/AccountChoiceChips';
import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { FadeInBlock } from '@/src/components/FadeInBlock';
import { MoneyText } from '@/src/components/MoneyText';
import { RaisedText } from '@/src/components/RaisedText';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { findSpendSub } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Debt } from '@/src/types/finance';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { tapFeedback } from '@/src/utils/selectFeedback';
import {
  accountRoleKey,
  accountDisplayName,
  isRemovableWallet,
} from '@/src/utils/accounts';

function clampPayDay(raw: number): number | null {
  if (!Number.isFinite(raw)) return null;
  const day = Math.round(raw);
  if (day < 1 || day > 28) return null;
  return day;
}

function nextPaymentIsoFromDay(day: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), day, 12, 0, 0, 0);
  if (d.getTime() < from.getTime()) {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

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
    updateDebt,
    removeDebt,
    renameWallet,
    removeWallet,
    updateBudget,
    transactionsForPeriod,
    budgetStatus,
  } = useFinance();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [debtsOpen, setDebtsOpen] = useState(true);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [installment, setInstallment] = useState('');
  const [rate, setRate] = useState('');
  const [payDay, setPayDay] = useState('1');
  const [saving, setSaving] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [walletNameDraft, setWalletNameDraft] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);

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

  function resetForm() {
    setName('');
    setBalance('');
    setInstallment('');
    setRate('');
    setPayDay('1');
    setEditingId(null);
    setShowForm(false);
  }

  function startCreate() {
    tapFeedback();
    if (showForm && !editingId) {
      resetForm();
      return;
    }
    setEditingId(null);
    setName('');
    setBalance('');
    setInstallment('');
    setRate('');
    setPayDay('1');
    setShowForm(true);
  }

  function startEdit(debt: Debt) {
    tapFeedback();
    const label = debt.nameKey
      ? t(debt.nameKey as TranslationKey)
      : debt.name ?? '';
    const day = new Date(debt.nextPaymentDate).getDate();
    setEditingId(debt.id);
    setName(label);
    setBalance(String(debt.balance || ''));
    setInstallment(String(debt.installment || ''));
    setRate(debt.interestRate > 0 ? String(debt.interestRate) : '');
    setPayDay(String(Number.isNaN(day) ? 1 : Math.min(28, Math.max(1, day))));
    setShowForm(true);
  }

  async function handleSaveDebt() {
    const parsedBalance = parse(balance);
    const parsedInstallment = parse(installment);
    if (!name.trim() || !parsedBalance || !parsedInstallment) {
      Alert.alert(t('wealth.addDebt'), t('wealth.debtNeed'));
      return;
    }
    const parsedRate = Number(rate.replace(',', '.')) || 0;
    const day = clampPayDay(Number(payDay.replace(',', '.')));
    if (!day) {
      Alert.alert(t('wealth.addDebt'), t('wealth.debtPayDayNeed'));
      return;
    }
    const nextPaymentDate = nextPaymentIsoFromDay(day);

    setSaving(true);
    try {
      if (editingId) {
        const existing = debts.find((d) => d.id === editingId);
        const categoryId =
          existing?.categoryId ?? (await ensureDebtCategory(name.trim()));
        await updateDebt(editingId, {
          name: name.trim(),
          balance: parsedBalance,
          installment: parsedInstallment,
          interestRate: parsedRate,
          nextPaymentDate,
          categoryId,
        });
        await updateBudget(categoryId, parsedInstallment);
      } else {
        const categoryId = await ensureDebtCategory(name.trim());
        await addDebt({
          name: name.trim(),
          balance: parsedBalance,
          installment: parsedInstallment,
          interestRate: parsedRate,
          nextPaymentDate,
          categoryId,
        });
        await updateBudget(categoryId, parsedInstallment);
      }
      resetForm();
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
        onPress: () => {
          if (editingId === id) resetForm();
          void removeDebt(id);
        },
      },
    ]);
  }

  function startRenameWallet(acc: { id: string; name?: string; nameKey: string }) {
    tapFeedback();
    setAccountsOpen(true);
    setEditingWalletId(acc.id);
    setWalletNameDraft(accountDisplayName(acc, t));
  }

  async function handleSaveWalletName() {
    if (!editingWalletId || savingWallet) return;
    setSavingWallet(true);
    try {
      const result = await renameWallet(editingWalletId, walletNameDraft);
      if ('error' in result) {
        Alert.alert(
          t('wealth.walletRename'),
          result.error === 'duplicate'
            ? t('wealth.walletNameTaken')
            : t('wealth.walletNameNeed')
        );
        return;
      }
      setEditingWalletId(null);
      setWalletNameDraft('');
    } finally {
      setSavingWallet(false);
    }
  }

  function confirmRemoveWallet(id: string, label: string, balance: number) {
    if (Math.abs(balance) >= 0.01) {
      Alert.alert(t('wealth.walletDelete'), t('wealth.walletDeleteNeedEmpty'));
      return;
    }
    Alert.alert(t('wealth.walletDelete'), label, [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('wealth.walletDelete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const result = await removeWallet(id);
            if ('error' in result) {
              Alert.alert(
                t('wealth.walletDelete'),
                result.error === 'hasBalance'
                  ? t('wealth.walletDeleteNeedEmpty')
                  : t('wealth.walletDeleteProtected')
              );
              return;
            }
            if (editingWalletId === id) {
              setEditingWalletId(null);
              setWalletNameDraft('');
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}>
        <FadeInBlock>
          <RaisedText style={styles.title}>{t('wealth.title')}</RaisedText>
          <Text style={styles.subtitle}>{t('wealth.subtitle')}</Text>
          <View style={styles.netBox}>
            <Text style={styles.netLabel}>{t('wealth.net')}</Text>
            <MoneyText style={styles.netValue}>{format(netWorth.net)}</MoneyText>
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
            {accounts.map((acc) => {
              const isWallet = acc.type === 'wallet';
              const renaming = editingWalletId === acc.id;
              const label = accountDisplayName(acc, t);
              return (
                <View
                  key={acc.id}
                  style={[styles.card, renaming && styles.cardEditing]}>
                  <View style={styles.sectionRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{label}</Text>
                      <Text style={styles.meta}>{t(accountRoleKey(acc.type))}</Text>
                    </View>
                    {isWallet ? (
                      <View style={styles.cardActions}>
                        <Pressable onPress={() => startRenameWallet(acc)}>
                          <Text style={styles.editText}>{t('wealth.walletRename')}</Text>
                        </Pressable>
                        {isRemovableWallet(acc) ? (
                          <Pressable
                            onPress={() =>
                              confirmRemoveWallet(acc.id, label, acc.balance)
                            }>
                            <Text style={styles.deleteText}>
                              {t('wealth.walletDelete')}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  <MoneyText
                    style={[
                      styles.amount,
                      acc.balance < 0 ? styles.amountDebt : null,
                    ]}>
                    {acc.balance < 0
                      ? t('wealth.accountOwes', { amount: format(Math.abs(acc.balance)) })
                      : format(acc.balance)}
                  </MoneyText>
                  {renaming ? (
                    <View style={styles.walletRename}>
                      <TextInput
                        value={walletNameDraft}
                        onChangeText={setWalletNameDraft}
                        placeholder={t('flow.walletNamePlaceholder')}
                        placeholderTextColor={palette.inkSoft}
                        style={styles.input}
                        autoFocus
                        onSubmitEditing={() => void handleSaveWalletName()}
                        returnKeyType="done"
                      />
                      <View style={styles.formActions}>
                        <Pressable
                          onPress={() => {
                            tapFeedback();
                            setEditingWalletId(null);
                            setWalletNameDraft('');
                          }}
                          style={styles.secondaryBtn}>
                          <Text style={styles.secondaryBtnText}>
                            {t('onboard.back')}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleSaveWalletName()}
                          disabled={savingWallet || !walletNameDraft.trim()}
                          style={[
                            styles.saveBtn,
                            styles.saveBtnFlex,
                            (!walletNameDraft.trim() || savingWallet) && {
                              opacity: 0.5,
                            },
                          ]}>
                          <Text style={styles.saveBtnText}>
                            {savingWallet
                              ? t('add.saving')
                              : t('wealth.walletRenameSave')}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
            <Text style={styles.copyHint}>{t('wealth.walletManageHint')}</Text>
            <WalletQuickAdd />
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
              <Pressable onPress={startCreate} style={styles.addBtn}>
                <Text style={styles.addBtnText}>
                  {showForm && !editingId ? t('onboard.back') : t('wealth.addDebt')}
                </Text>
              </Pressable>
            </View>

            {debts.length > 0 ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{t('wealth.fixedMonth')}</Text>
                <MoneyText style={styles.amount}>{format(monthlyInstallments)}</MoneyText>
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
                {editingId ? (
                  <Text style={styles.formTitle}>{t('wealth.debtEditing')}</Text>
                ) : (
                  <Text style={styles.copyHint}>{t('wealth.debtPermanentHint')}</Text>
                )}
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
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={palette.inkSoft}
                  style={styles.input}
                />
                <Text style={styles.label}>{t('wealth.debtInstallment')}</Text>
                <TextInput
                  value={installment}
                  onChangeText={setInstallment}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={palette.inkSoft}
                  style={styles.input}
                />
                <Text style={styles.label}>{t('wealth.debtPayDay')}</Text>
                <TextInput
                  value={payDay}
                  onChangeText={setPayDay}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={palette.inkSoft}
                  style={styles.input}
                />
                <Text style={styles.copyHint}>{t('wealth.debtPayDayHint')}</Text>
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
                <View style={styles.formActions}>
                  {editingId ? (
                    <Pressable
                      onPress={() => {
                        tapFeedback();
                        resetForm();
                      }}
                      style={styles.secondaryBtn}>
                      <Text style={styles.secondaryBtnText}>{t('onboard.back')}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => void handleSaveDebt()}
                    disabled={saving}
                    style={[styles.saveBtn, editingId && styles.saveBtnFlex]}>
                    <Text style={styles.saveBtnText}>
                      {saving
                        ? t('add.saving')
                        : editingId
                          ? t('wealth.debtUpdate')
                          : t('wealth.debtSave')}
                    </Text>
                  </Pressable>
                </View>
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
              const isEditing = editingId === debt.id;

              return (
                <View
                  key={debt.id}
                  style={[styles.card, isEditing && styles.cardEditing]}>
                  <View style={styles.sectionRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{label}</Text>
                      <Text style={styles.conceptChip}>
                        {hit
                          ? t('wealth.linkedConcept', { concept: conceptLabel })
                          : t('wealth.unlinkedConcept')}
                      </Text>
                    </View>
                    <View style={styles.cardActions}>
                      <Pressable onPress={() => startEdit(debt)}>
                        <Text style={styles.editText}>{t('wealth.debtEdit')}</Text>
                      </Pressable>
                      <Pressable onPress={() => confirmRemove(debt.id, label)}>
                        <Text style={styles.deleteText}>{t('wealth.debtDelete')}</Text>
                      </Pressable>
                    </View>
                  </View>
                  <MoneyText style={styles.amount}>{format(debt.balance)}</MoneyText>
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
  content: { padding: 22, paddingBottom: 168, gap: 12 },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    color: palette.brand,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.brandMuted,
    lineHeight: 20,
  },
  netBox: {
    marginTop: 14,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  netLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  netValue: {
    marginTop: 4,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    color: palette.ink,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  copyHintFlex: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.brandMuted,
    lineHeight: 18,
  },
  copyHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  formTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
    marginBottom: 6,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: palette.teal,
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
    marginBottom: 10,
  },
  summaryTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  form: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 10,
    gap: 6,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  label: {
    marginTop: 6,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: palette.ink,
    backgroundColor: '#fff',
  },
  saveBtn: {
    marginTop: 4,
    backgroundColor: palette.teal,
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
  },
  saveBtnFlex: { flex: 1 },
  saveBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.white,
  },
  secondaryBtn: {
    marginTop: 4,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#fff',
  },
  secondaryBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.inkMuted,
  },
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 10,
  },
  walletRename: {
    marginTop: 10,
    gap: 6,
  },
  cardEditing: {
    borderColor: palette.teal,
  },
  cardActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  conceptChip: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  amount: {
    marginTop: 8,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    color: palette.ink,
  },
  amountDebt: {
    color: palette.danger,
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
  meta: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
  },
  track: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E8EEF1',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  editText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.teal,
  },
  deleteText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.danger,
  },
  link: {
    marginTop: 8,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.teal,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    lineHeight: 20,
  },
  hint: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
});
