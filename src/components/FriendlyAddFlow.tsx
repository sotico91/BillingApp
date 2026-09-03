import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  FRIENDLY_INTENTS,
  FRIENDLY_TEMPLATES,
  intentToType,
  type FriendlyIntent,
} from '@/src/data/friendlyTemplates';
import { categoriesForKind, defaultCategoryIdForKind } from '@/src/data/categories';
import { findConceptById } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { PaymentMethod } from '@/src/types/finance';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { incomeDestinationAccounts } from '@/src/utils/netWorth';
import { notifyExpenseRegistered } from '@/src/utils/notifications';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { AccountChoiceChips } from '@/src/components/AccountChoiceChips';
import { InlineSubAdd } from '@/src/components/InlineSubAdd';
import { useKeyboardVisible } from '@/src/hooks/useKeyboardVisible';
import type { SavedMovement } from '@/src/components/ExpenseForm';
import {
  accountDisplayName,
  defaultIncomeAccountId,
  defaultSpendAccountId,
  defaultTransferDestinationId,
} from '@/src/utils/accounts';

type Props = {
  onSaved?: (result: SavedMovement) => void;
  onSwitchAdvanced?: () => void;
};

const METHODS: PaymentMethod[] = ['cash', 'debit', 'credit', 'transfer'];

export function FriendlyAddFlow({ onSaved, onSwitchAdvanced }: Props) {
  const { t } = useLanguage();
  const { format, formatPlain, parse, currency } = useMoney();
  const { settings, updateQuickTemplate, ensureSpendConceptSub } = useSettings();
  const { addTransaction, totalForPeriod, accounts, debts, transactions } = useFinance();
  const keyboardVisible = useKeyboardVisible();

  const spendConcepts = settings.spendConcepts ?? [];
  const incomeAccounts = useMemo(() => incomeDestinationAccounts(accounts), [accounts]);

  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<FriendlyIntent>('spend');
  const [amount, setAmount] = useState('');
  const [conceptId, setConceptId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('cafe');
  const [debtId, setDebtId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('debit');
  const [accountId, setAccountId] = useState(() =>
    defaultSpendAccountId(accounts)
  );
  const [toAccountId, setToAccountId] = useState(() =>
    defaultTransferDestinationId(accounts, 'bank-main')
  );
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [fromTemplate, setFromTemplate] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const savingLock = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const lastSpendAccountId = useMemo(() => {
    if (categoryId) {
      const forCat = transactions.find(
        (tx) =>
          tx.type === 'expense' && tx.categoryId === categoryId && tx.accountId
      );
      if (forCat?.accountId) return forCat.accountId;
    }
    return transactions.find((tx) => tx.type === 'expense' && tx.accountId)
      ?.accountId;
  }, [transactions, categoryId]);

  useEffect(() => {
    if (intent === 'earn') {
      if (!accounts.some((a) => a.id === accountId)) {
        setAccountId(defaultIncomeAccountId(accounts));
      }
      return;
    }
    if (intent === 'move') {
      if (!accounts.some((a) => a.id === accountId)) {
        setAccountId(defaultIncomeAccountId(accounts));
      }
      return;
    }
    const parsed = parse(amount);
    const current = accounts.find((a) => a.id === accountId);
    const need = parsed ?? 0;
    const covers =
      current &&
      (need > 0 ? current.balance >= need : current.balance > 0);
    if (covers) return;
    const next = defaultSpendAccountId(accounts, {
      lastAccountId: lastSpendAccountId,
      amount: need || undefined,
    });
    if (next !== accountId) setAccountId(next);
  }, [accounts, accountId, intent, lastSpendAccountId, amount, parse]);

  useEffect(() => {
    if (intent !== 'spend' && intent !== 'debt') return;
    const parsed = parse(amount);
    const next = defaultSpendAccountId(accounts, {
      lastAccountId: lastSpendAccountId,
      amount: parsed ?? undefined,
    });
    if (next !== accountId) setAccountId(next);
  }, [categoryId]);

  const accountChoices = intent === 'earn' ? incomeAccounts : accounts;

  const incomeChoices = useMemo(
    () => categoriesForKind('income', settings.enabledCategoryIds),
    [settings.enabledCategoryIds]
  );

  const selectedConcept = useMemo(
    () => (conceptId ? findConceptById(spendConcepts, conceptId) : undefined),
    [conceptId, spendConcepts]
  );

  const templates = FRIENDLY_TEMPLATES;

  const asksPaymentMethod = intent === 'spend' || intent === 'move' || intent === 'debt';
  const totalSteps = intent === 'spend' ? 6 : 5;
  const progress = ((step + 1) / totalSteps) * 100;
  const paymentStep = intent === 'spend' ? 4 : 3;
  const reviewStep = intent === 'spend' ? 5 : 4;

  async function applyTemplate(id: string) {
    const tpl = FRIENDLY_TEMPLATES.find((x) => x.id === id);
    if (!tpl || applyingTemplate) return;
    tapFeedback();
    setApplyingTemplate(true);
    try {
      setIntent(tpl.intent);
      if (tpl.amountHint) setAmount(String(tpl.amountHint));
      if (tpl.intent === 'move') {
        setAccountId(defaultIncomeAccountId(accounts));
        setToAccountId(
          tpl.id === 'tpl-save'
            ? accounts.find((a) => a.type === 'savings')?.id ?? 'savings'
            : defaultTransferDestinationId(accounts, 'bank-main')
        );
      }
      if (tpl.intent === 'earn') {
        setAccountId(defaultIncomeAccountId(accounts));
      }
      if (tpl.intent === 'spend') {
        setAccountId(
          defaultSpendAccountId(accounts, {
            lastAccountId: lastSpendAccountId,
            amount: tpl.amountHint,
          })
        );
      }

      if (tpl.intent === 'spend' && tpl.spend) {
        const path = await ensureSpendConceptSub({
          conceptId: tpl.spend.conceptId,
          conceptName: t(tpl.spend.conceptNameKey),
          subName: t(tpl.titleKey as TranslationKey),
          color: tpl.spend.color,
          isAnt: tpl.spend.isAnt,
        });
        if (!path) {
          Alert.alert(t('flow.chooseConcept'), t('flow.noConceptsBody'));
          return;
        }
        setConceptId(path.conceptId);
        setCategoryId(path.subId);
        setFromTemplate(true);
      } else {
        setConceptId(null);
        setCategoryId(tpl.categoryId ?? 'otros');
        setFromTemplate(false);
      }
      setStep(1);
    } finally {
      setApplyingTemplate(false);
    }
  }

  function goNext() {
    if (step === 1) {
      const parsed = parse(amount);
      if (!parsed) {
        Alert.alert(t('add.invalidTitle'), t('add.invalidMessage'));
        return;
      }
      if (
        fromTemplate &&
        intent === 'spend' &&
        conceptId &&
        categoryId
      ) {
        setStep(paymentStep);
        return;
      }
    }
    if (step === 2 && intent === 'debt') {
      if (debts.length === 0) return;
      if (!debtId) {
        Alert.alert(t('flow.chooseDebt'), t('wealth.debtNeed'));
        return;
      }
    }
    if (step === 2 && intent === 'spend') {
      if (spendConcepts.length === 0) return;
      if (!conceptId) {
        Alert.alert(t('flow.chooseConcept'), t('flow.noConceptsBody'));
        return;
      }
      const concept = findConceptById(spendConcepts, conceptId);
      if (concept && concept.subs.length === 1) {
        setCategoryId(concept.subs[0].id);
        setStep(paymentStep);
        return;
      } else if (concept && !concept.subs.some((s) => s.id === categoryId)) {
        setCategoryId(concept.subs[0]?.id ?? categoryId);
      }
    }
    if (step === 3 && intent === 'spend') {
      const concept = conceptId ? findConceptById(spendConcepts, conceptId) : undefined;
      if (!concept || !concept.subs.some((s) => s.id === categoryId)) {
        Alert.alert(t('flow.chooseSub'), t('flow.noConceptsBody'));
        return;
      }
    }
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  async function save() {
    if (savingLock.current) return;
    const parsed = parse(amount);
    if (!parsed) {
      Alert.alert(t('add.invalidTitle'), t('add.invalidMessage'));
      return;
    }

    savingLock.current = true;
    setSaving(true);
    try {
      const type = intentToType(intent);
      const beforeExpense = totalForPeriod('hoy', 'expense');
      const beforeIncome = totalForPeriod('hoy', 'income');
      const selectedDebt = debts.find((d) => d.id === debtId);
      const debtLabel = selectedDebt
        ? selectedDebt.nameKey
          ? t(selectedDebt.nameKey as TranslationKey)
          : selectedDebt.name ?? t('debt.mainCard')
        : categoryLabel(categoryId, t, spendConcepts);
      const resolvedCategoryId =
        intent === 'debt' ? selectedDebt?.categoryId ?? 'otros' : categoryId;

      await addTransaction({
        type,
        amount: parsed,
        categoryId: resolvedCategoryId,
        paymentMethod: asksPaymentMethod ? method : undefined,
        accountId,
        toAccountId: intent === 'move' ? toAccountId : undefined,
        debtId: intent === 'debt' ? debtId ?? undefined : undefined,
        note: intent === 'debt' ? note.trim() || debtLabel : note,
      });

      if (type === 'expense') {
        await updateQuickTemplate({
          categoryId: resolvedCategoryId,
          amount: parsed,
          note: note.trim() || undefined,
        });
      }

      // Never block save on notification permission / scheduling (esp. Android).
      // Only expense/income confirms — transfers must not reuse a prior category label.
      if (settings.notifyOnExpense && (type === 'expense' || type === 'income')) {
        const category =
          type === 'income'
            ? categoryLabel(categoryId, t, spendConcepts)
            : debtLabel;
        void notifyExpenseRegistered(
          t('notify.title'),
          t('notify.body', { amount: formatPlain(parsed), category })
        ).catch(() => undefined);
      }

      if (type === 'expense') {
        onSaved?.({ kind: 'expense', amount: beforeExpense + parsed });
      } else if (type === 'income') {
        onSaved?.({ kind: 'income', amount: beforeIncome + parsed });
      } else {
        onSaved?.({ kind: 'other', amount: parsed });
      }
    } catch {
      Alert.alert(t('add.invalidTitle'), t('add.saveError'));
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }

  const hideNext =
    (intent === 'debt' && step === 2 && debts.length === 0) ||
    (intent === 'spend' && step === 2 && spendConcepts.length === 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.stepLabel}>
        {t('flow.stepOf', { current: step + 1, total: totalSteps })}
      </Text>

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}>
        {step === 0 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            <Text style={styles.title}>{t('flow.whatHappened')}</Text>
            <View style={styles.intentGrid}>
              {FRIENDLY_INTENTS.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    tapFeedback();
                    setFromTemplate(false);
                    setIntent(item.id);
                    if (item.id === 'earn') {
                      setConceptId(null);
                      setCategoryId(
                        defaultCategoryIdForKind('income', settings.enabledCategoryIds)
                      );
                      setAccountId(defaultIncomeAccountId(accounts));
                    }
                    if (item.id === 'spend') {
                      setConceptId(null);
                      setCategoryId('');
                      setAccountId(
                        defaultSpendAccountId(accounts, {
                          lastAccountId: lastSpendAccountId,
                          amount: parse(amount) ?? undefined,
                        })
                      );
                    }
                    if (item.id === 'move') {
                      setConceptId(null);
                      setCategoryId('otros');
                      setAccountId(defaultIncomeAccountId(accounts));
                      setToAccountId(
                        defaultTransferDestinationId(
                          accounts,
                          defaultIncomeAccountId(accounts)
                        )
                      );
                    }
                    if (item.id === 'debt') {
                      setConceptId(null);
                      setCategoryId('otros');
                      setDebtId(debts[0]?.id ?? null);
                    }
                    goNext();
                  }}
                  style={styles.intentCard}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                  <Text style={styles.intentTitle}>
                    {t(item.titleKey as TranslationKey)}
                  </Text>
                  <Text style={styles.intentSub}>
                    {t(item.subtitleKey as TranslationKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.section}>{t('flow.pickTemplate')}</Text>
            <View style={styles.tplGrid}>
              {templates.map((tpl) => (
                <Pressable
                  key={tpl.id}
                  onPress={() => void applyTemplate(tpl.id)}
                  disabled={applyingTemplate}
                  style={[styles.tplCard, applyingTemplate && { opacity: 0.6 }]}>
                  <Text style={styles.emoji}>{tpl.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tplTitle}>
                      {t(tpl.titleKey as TranslationKey)}
                    </Text>
                    <Text style={styles.tplSub}>
                      {t(tpl.subtitleKey as TranslationKey)}
                    </Text>
                    {tpl.amountHint ? (
                      <Text style={styles.tplAmount}>
                        {t('flow.suggested')}: {format(tpl.amountHint)}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {step === 1 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            <Text style={styles.title}>{t('flow.howMuch')}</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={palette.inkSoft}
                style={styles.amountInput}
                autoFocus
              />
            </View>
            <Text style={styles.amountHint}>{t('add.amountDecimalHint')}</Text>
          </Animated.View>
        ) : null}

        {step === 2 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            {intent === 'debt' ? (
              <>
                <Text style={styles.title}>{t('flow.chooseDebt')}</Text>
                {debts.length === 0 ? (
                  <View style={styles.emptyDebt}>
                    <Text style={styles.emptyDebtTitle}>{t('flow.noDebtsTitle')}</Text>
                    <Text style={styles.emptyDebtBody}>{t('flow.noDebtsBody')}</Text>
                    <Pressable
                      onPress={() => router.replace('/(tabs)/wealth')}
                      style={styles.wealthBtn}>
                      <Text style={styles.wealthBtnText}>{t('flow.goToWealth')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.catGrid}>
                    {debts.map((debt) => {
                      const label = debt.nameKey
                        ? t(debt.nameKey as TranslationKey)
                        : debt.name ?? t('debt.mainCard');
                      const selected = debt.id === debtId;
                      return (
                        <Pressable
                          key={debt.id}
                          onPress={() => {
                            setDebtId(debt.id);
                            if (debt.installment > 0) {
                              setAmount(String(debt.installment));
                            }
                          }}
                          style={[styles.catCard, selected && styles.catCardOn]}>
                          <Text style={[styles.catText, selected && styles.catTextOn]}>
                            {label}
                          </Text>
                          <Text style={[styles.catSub, selected && styles.catTextOn]}>
                            {format(debt.balance)}
                            {debt.installment > 0
                              ? ` · ${t('wealth.installment', { amount: format(debt.installment) })}`
                              : ''}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            ) : intent === 'spend' ? (
              <>
                <Text style={styles.title}>{t('flow.chooseConcept')}</Text>
                {spendConcepts.length === 0 ? (
                  <View style={styles.emptyDebt}>
                    <Text style={styles.emptyDebtTitle}>{t('flow.noConceptsTitle')}</Text>
                    <Text style={styles.emptyDebtBody}>{t('flow.noConceptsBody')}</Text>
                    <Pressable
                      onPress={() => router.replace('/(tabs)/plan')}
                      style={styles.wealthBtn}>
                      <Text style={styles.wealthBtnText}>{t('flow.goToPlan')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.catGrid}>
                    {spendConcepts.map((concept) => {
                      const selected = concept.id === conceptId;
                      return (
                        <Pressable
                          key={concept.id}
                          onPress={() => {
                            setConceptId(concept.id);
                            if (!concept.subs.some((s) => s.id === categoryId)) {
                              setCategoryId(concept.subs[0]?.id ?? '');
                            }
                          }}
                          style={[styles.catCard, selected && styles.catCardOn]}>
                          <Text style={[styles.catText, selected && styles.catTextOn]}>
                            {concept.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            ) : intent === 'earn' ? (
              <>
                <Text style={styles.title}>{t('flow.chooseCategory')}</Text>
                <View style={styles.catGrid}>
                  {incomeChoices.map((cat) => {
                    const selected = cat.id === categoryId;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => {
                          tapFeedback();
                          setCategoryId(cat.id);
                        }}
                        style={[
                          styles.catCard,
                          selected && {
                            backgroundColor: cat.color,
                            borderColor: cat.color,
                          },
                        ]}>
                        <Text
                          style={[styles.catText, selected && styles.catTextOn]}>
                          {categoryLabel(cat.id, t, spendConcepts)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>{t('flow.intent.move')}</Text>
                <Text style={styles.intentSub}>{t('flow.intent.moveSub')}</Text>
              </>
            )}
          </Animated.View>
        ) : null}

        {step === 3 && intent === 'spend' ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            <Text style={styles.title}>{t('flow.chooseSub')}</Text>
            <View style={styles.catGrid}>
              {(selectedConcept?.subs ?? []).map((sub) => {
                const selected = sub.id === categoryId;
                return (
                  <Pressable
                    key={sub.id}
                    onPress={() => {
                      tapFeedback();
                      setCategoryId(sub.id);
                    }}
                    style={[styles.catCard, selected && styles.catCardOn]}>
                    <Text style={[styles.catText, selected && styles.catTextOn]}>
                      {sub.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {conceptId ? (
              <InlineSubAdd
                conceptId={conceptId}
                onAdded={(subId) => setCategoryId(subId)}
              />
            ) : null}
          </Animated.View>
        ) : null}

        {step === paymentStep ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            {asksPaymentMethod ? (
              <>
                <Text style={styles.title}>{t('flow.howPaid')}</Text>
                <View style={styles.catGrid}>
                  {METHODS.map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => {
                        tapFeedback();
                        setMethod(m);
                      }}
                      style={[styles.catCard, method === m && styles.catCardOn]}>
                      <Text style={[styles.catText, method === m && styles.catTextOn]}>
                        {t(`method.${m}` as TranslationKey)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <Text
              style={[
                styles.title,
                asksPaymentMethod ? { marginTop: 18, fontSize: 22 } : null,
              ]}>
              {intent === 'earn'
                ? t('flow.whichAccountIncome')
                : intent === 'spend'
                  ? t('flow.whichAccountSpend')
                  : t('flow.whichAccount')}
            </Text>
            <AccountChoiceChips
              variant={intent === 'move' ? 'card' : 'chip'}
              accounts={accountChoices}
              selectedId={accountId}
              onSelect={setAccountId}
            />
            {intent === 'move' ? (
              <>
                <Text style={[styles.title, { marginTop: 18, fontSize: 24 }]}>
                  {t('flow.whichAccountTo')}
                </Text>
                <AccountChoiceChips
                  variant="card"
                  accounts={accounts.filter((a) => a.id !== accountId)}
                  selectedId={toAccountId}
                  onSelect={setToAccountId}
                />
              </>
            ) : null}
          </Animated.View>
        ) : null}

        {step === reviewStep ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            <Text style={styles.title}>{t('flow.review')}</Text>
            <View style={styles.summary}>
              <SummaryLine
                label={t('flow.summaryAmount')}
                value={formatPlain(parse(amount) ?? 0)}
              />
              <SummaryLine
                label={t('flow.summaryType')}
                value={t(`type.${intentToType(intent)}` as TranslationKey)}
              />
              {intent !== 'move' ? (
                <SummaryLine
                  label={
                    intent === 'debt' ? t('flow.chooseDebt') : t('flow.summaryCategory')
                  }
                  value={
                    intent === 'debt'
                      ? (() => {
                          const debt = debts.find((d) => d.id === debtId);
                          if (!debt) return '—';
                          return debt.nameKey
                            ? t(debt.nameKey as TranslationKey)
                            : debt.name ?? t('debt.mainCard');
                        })()
                      : categoryLabel(categoryId, t, spendConcepts)
                  }
                />
              ) : null}
              {asksPaymentMethod ? (
                <SummaryLine
                  label={t('flow.summaryMethod')}
                  value={t(`method.${method}` as TranslationKey)}
                />
              ) : null}
              <SummaryLine
                label={
                  intent === 'earn'
                    ? t('flow.summaryAccountIncome')
                    : t('flow.summaryAccount')
                }
                value={accountDisplayName(
                  accounts.find((a) => a.id === accountId) ?? {
                    nameKey: 'account.cash',
                  },
                  t
                )}
              />
              {intent === 'move' ? (
                <SummaryLine
                  label={t('flow.summaryAccountTo')}
                  value={accountDisplayName(
                    accounts.find((a) => a.id === toAccountId) ?? {
                      nameKey: 'account.savings',
                    },
                    t
                  )}
                />
              ) : null}
            </View>
            <Text style={styles.noteLabel}>{t('flow.noteOptional')}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('add.notePlaceholder')}
              placeholderTextColor={palette.inkSoft}
              style={styles.noteInput}
              returnKeyType="done"
              blurOnSubmit
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 280);
              }}
            />
          </Animated.View>
        ) : null}
      </ScrollView>

      {keyboardVisible ? null : (
      <View style={styles.footer}>
        {step > 0 ? (
          <Pressable
            onPress={() => {
              if (intent === 'spend' && step === paymentStep) {
                if (fromTemplate) {
                  setStep(1);
                  return;
                }
                const concept = conceptId
                  ? findConceptById(spendConcepts, conceptId)
                  : undefined;
                if (concept?.subs.length === 1) {
                  setStep(2);
                  return;
                }
              }
              setStep((s) => s - 1);
            }}
            style={styles.secondary}>
            <Text style={styles.secondaryText}>{t('flow.back')}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onSwitchAdvanced} style={styles.secondary}>
            <Text style={styles.secondaryText}>{t('flow.advanced')}</Text>
          </Pressable>
        )}

        {step === 0 ? null : step < totalSteps - 1 ? (
          hideNext ? null : (
            <Pressable onPress={goNext} style={styles.primary}>
              <Text style={styles.primaryText}>{t('flow.next')}</Text>
            </Pressable>
          )
        ) : (
          <Pressable
            onPress={() => void save()}
            disabled={saving || (intent === 'debt' && !debtId)}
            style={[styles.primary, saving && { opacity: 0.7 }]}>
            <Text style={styles.primaryText}>
              {saving ? t('add.saving') : t('flow.save')}
            </Text>
          </Pressable>
        )}
      </View>
      )}
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E8EEF2',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.accent,
    borderRadius: 999,
  },
  stepLabel: {
    marginTop: 10,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkSoft,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  body: {
    paddingTop: 12,
    paddingBottom: 48,
    gap: 12,
  },
  block: { gap: 12 },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: palette.ink,
    letterSpacing: -0.5,
  },
  section: {
    marginTop: 8,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.inkMuted,
  },
  intentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  intentCard: {
    width: '48%',
    backgroundColor: '#F7FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 120,
  },
  emoji: { fontSize: 28, marginBottom: 8 },
  intentTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  intentSub: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
    lineHeight: 16,
  },
  tplGrid: { gap: 8 },
  tplCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#FFF8F4',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,74,0.2)',
  },
  tplTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  tplSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  tplAmount: {
    marginTop: 2,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 13,
    color: palette.accentDeep,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: palette.accent,
    gap: 4,
  },
  currency: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 36,
    color: palette.accent,
    marginBottom: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 48,
    color: palette.ink,
    paddingVertical: 6,
  },
  amountHint: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCard: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  catCardOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  catText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
  },
  catTextOn: { color: palette.white },
  catSub: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  emptyDebt: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
  },
  emptyDebtTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  emptyDebtBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    lineHeight: 20,
  },
  wealthBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  wealthBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.white,
  },
  summary: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  summaryValue: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  noteLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    color: palette.ink,
    backgroundColor: '#fff',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
  },
  secondary: {
    flex: 1,
    backgroundColor: '#EEF3F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: {
    fontFamily: 'DMSans_600SemiBold',
    color: palette.inkMuted,
  },
  primary: {
    flex: 1.3,
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: 'DMSans_600SemiBold',
    color: palette.white,
  },
});
