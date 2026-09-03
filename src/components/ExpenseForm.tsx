import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { CategoryChip } from '@/src/components/CategoryChip';
import { InlineSubAdd } from '@/src/components/InlineSubAdd';
import { AccountChoiceChips } from '@/src/components/AccountChoiceChips';
import { categoriesForKind } from '@/src/data/categories';
import { findSpendSub, spendSubsAsCategories } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { PaymentMethod, TransactionType } from '@/src/types/finance';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { incomeDestinationAccounts } from '@/src/utils/netWorth';
import {
  defaultIncomeAccountId,
  defaultSpendAccountId,
  defaultTransferDestinationId,
} from '@/src/utils/accounts';
import { notifyExpenseRegistered } from '@/src/utils/notifications';

export type SavedMovement = {
  kind: 'expense' | 'income' | 'other';
  amount: number;
};

type Props = {
  onSaved?: (result: SavedMovement) => void;
  initialCategoryId?: string;
  initialAmount?: string;
  initialNote?: string;
};

const TYPES: TransactionType[] = [
  'expense',
  'income',
  'transfer',
  'debt_payment',
  'investment',
  'withdrawal',
];

const METHODS: PaymentMethod[] = ['cash', 'debit', 'credit', 'transfer'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ExpenseForm({
  onSaved,
  initialCategoryId,
  initialAmount,
  initialNote,
}: Props) {
  const { t } = useLanguage();
  const { format, formatPlain, parse, currency } = useMoney();
  const { settings, updateQuickTemplate } = useSettings();
  const { addTransaction, totalForPeriod, accounts, debts } = useFinance();
  const spendConcepts = settings.spendConcepts ?? [];

  const prefilledHit = initialCategoryId
    ? findSpendSub(spendConcepts, initialCategoryId)
    : null;
  const [amount, setAmount] = useState(initialAmount ?? '');
  const [type, setType] = useState<TransactionType>('expense');
  const [conceptId, setConceptId] = useState(
    prefilledHit?.concept.id ?? spendConcepts[0]?.id ?? ''
  );
  const [categoryId, setCategoryId] = useState(
    initialCategoryId ?? spendConcepts[0]?.subs[0]?.id ?? 'otros'
  );
  const [debtId, setDebtId] = useState<string | null>(debts[0]?.id ?? null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [accountId, setAccountId] = useState(() =>
    defaultSpendAccountId(accounts)
  );
  const [toAccountId, setToAccountId] = useState(() =>
    defaultTransferDestinationId(accounts)
  );
  const [note, setNote] = useState(initialNote ?? '');
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);

  const categoryChoices = useMemo(() => {
    if (type === 'income') {
      return categoriesForKind('income', settings.enabledCategoryIds);
    }
    if (type === 'debt_payment') {
      return [];
    }
    const concept = spendConcepts.find((c) => c.id === conceptId) ?? spendConcepts[0];
    if (!concept) return spendSubsAsCategories(spendConcepts);
    return spendSubsAsCategories([concept]);
  }, [type, settings.enabledCategoryIds, spendConcepts, conceptId]);

  const accountChoices = useMemo(
    () => (type === 'income' ? incomeDestinationAccounts(accounts) : accounts),
    [type, accounts]
  );

  useEffect(() => {
    if (type === 'income' || type === 'transfer' || type === 'investment') return;
    const parsed = parse(amount);
    const current = accounts.find((a) => a.id === accountId);
    const need = parsed ?? 0;
    const covers =
      current &&
      (need > 0 ? current.balance >= need : current.balance > 0);
    if (covers) return;
    const next = defaultSpendAccountId(accounts, { amount: need || undefined });
    if (next !== accountId) setAccountId(next);
  }, [accounts, accountId, type, amount, parse]);

  const scale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function selectType(next: TransactionType) {
    setType(next);
    if (next === 'income') {
      setCategoryId('salario');
      setAccountId(defaultIncomeAccountId(accounts));
    } else if (next === 'expense') {
      const first = spendConcepts[0];
      setConceptId(first?.id ?? '');
      setCategoryId(first?.subs[0]?.id ?? 'otros');
      setAccountId(defaultSpendAccountId(accounts, { amount: parse(amount) ?? undefined }));
    } else if (next === 'debt_payment') {
      setDebtId(debts[0]?.id ?? null);
      setCategoryId(debts[0]?.categoryId ?? 'otros');
    }
  }

  async function handleSave() {
    if (savingLock.current) return;
    const parsed = parse(amount);
    if (!parsed) {
      Alert.alert(t('add.invalidTitle'), t('add.invalidMessage'));
      return;
    }

    savingLock.current = true;
    setSaving(true);
    try {
      const beforeTodayExpense = totalForPeriod('hoy', 'expense');
      const beforeTodayIncome = totalForPeriod('hoy', 'income');
      const selectedDebt = debts.find((d) => d.id === debtId);
      await addTransaction({
        type,
        amount: parsed,
        categoryId:
          type === 'debt_payment'
            ? selectedDebt?.categoryId ?? categoryId
            : categoryId,
        paymentMethod: type === 'income' ? undefined : method,
        accountId,
        toAccountId:
          type === 'transfer' || type === 'investment' ? toAccountId : undefined,
        debtId: type === 'debt_payment' ? debtId ?? undefined : undefined,
        note,
      });

      if (type === 'expense') {
        await updateQuickTemplate({
          categoryId,
          amount: parsed,
          note: note.trim() || undefined,
        });
      }

      const resolvedCategoryId =
        type === 'debt_payment'
          ? selectedDebt?.categoryId ?? categoryId
          : categoryId;

      if (
        settings.notifyOnExpense &&
        (type === 'expense' || type === 'income')
      ) {
        void notifyExpenseRegistered(
          t('notify.title'),
          t('notify.body', {
            amount: formatPlain(parsed),
            category: categoryLabel(
              type === 'expense' ? resolvedCategoryId : categoryId,
              t,
              spendConcepts
            ),
          })
        ).catch(() => undefined);
      }

      setAmount('');
      setNote('');
      if (type === 'expense') {
        onSaved?.({ kind: 'expense', amount: beforeTodayExpense + parsed });
      } else if (type === 'income') {
        onSaved?.({ kind: 'income', amount: beforeTodayIncome + parsed });
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

  const preview = parse(amount);

  return (
    <View style={styles.form}>
      <Text style={styles.kicker}>{t('add.kicker')}</Text>
      <View style={styles.amountBlock}>
        <Text style={styles.currencyMark}>$</Text>
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

      <Text style={styles.label}>{t('add.type')}</Text>
      <View style={styles.chips}>
        {TYPES.map((item) => (
          <Pressable
            key={item}
            onPress={() => selectType(item)}
            style={[styles.pill, type === item && styles.pillOn]}>
            <Text style={[styles.pillText, type === item && styles.pillTextOn]}>
              {t(`type.${item}` as TranslationKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      {type !== 'income' ? (
        <>
          <Text style={styles.label}>{t('add.method')}</Text>
          <View style={styles.chips}>
            {METHODS.map((item) => (
              <Pressable
                key={item}
                onPress={() => setMethod(item)}
                style={[styles.pill, method === item && styles.pillOn]}>
                <Text style={[styles.pillText, method === item && styles.pillTextOn]}>
                  {t(`method.${item}` as TranslationKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.label}>
        {type === 'income'
          ? t('flow.whichAccountIncome')
          : type === 'expense'
            ? t('flow.whichAccountSpend')
            : t('add.account')}
      </Text>
      <AccountChoiceChips
        accounts={accountChoices}
        selectedId={accountId}
        onSelect={setAccountId}
      />

      {(type === 'transfer' || type === 'investment') && (
        <>
          <Text style={styles.label}>{t('flow.whichAccountTo')}</Text>
          <AccountChoiceChips
            accounts={accounts.filter((a) => a.id !== accountId)}
            selectedId={toAccountId}
            onSelect={setToAccountId}
          />
        </>
      )}

      {type === 'expense' && spendConcepts.length > 0 ? (
        <>
          <Text style={styles.label}>{t('flow.chooseConcept')}</Text>
          <View style={styles.chips}>
            {spendConcepts.map((concept) => (
              <Pressable
                key={concept.id}
                onPress={() => {
                  setConceptId(concept.id);
                  setCategoryId(concept.subs[0]?.id ?? categoryId);
                }}
                style={[styles.pill, conceptId === concept.id && styles.pillOn]}>
                <Text
                  style={[styles.pillText, conceptId === concept.id && styles.pillTextOn]}>
                  {concept.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {type === 'debt_payment' ? (
        <>
          <Text style={styles.label}>{t('flow.chooseDebt')}</Text>
          <View style={styles.chips}>
            {debts.map((debt) => (
              <Pressable
                key={debt.id}
                onPress={() => {
                  setDebtId(debt.id);
                  if (debt.installment > 0) setAmount(String(debt.installment));
                  setCategoryId(debt.categoryId ?? 'otros');
                }}
                style={[styles.pill, debtId === debt.id && styles.pillOn]}>
                <Text style={[styles.pillText, debtId === debt.id && styles.pillTextOn]}>
                  {debt.name ?? t('debt.mainCard')}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : type === 'expense' && categoryChoices.length === 1 ? null : (
        <>
          <Text style={styles.label}>
            {type === 'expense' ? t('flow.chooseSub') : t('add.category')}
          </Text>
          <View style={styles.chips}>
            {categoryChoices.map((category) => (
              <CategoryChip
                key={category.id}
                category={category}
                label={categoryLabel(category.id, t, spendConcepts)}
                selected={category.id === categoryId}
                onPress={() => setCategoryId(category.id)}
              />
            ))}
          </View>
        </>
      )}

      {type === 'expense' && conceptId ? (
        <InlineSubAdd
          conceptId={conceptId}
          onAdded={(subId) => setCategoryId(subId)}
        />
      ) : null}

      <Text style={styles.label}>{t('add.note')}</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={t('add.notePlaceholder')}
        placeholderTextColor={palette.inkSoft}
        style={styles.noteInput}
        returnKeyType="done"
        blurOnSubmit
      />

      <AnimatedPressable
        onPress={handleSave}
        disabled={saving}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 16, stiffness: 240 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 240 });
        }}
        style={[styles.submit, saving && styles.submitPressed, buttonStyle]}>
        <Text style={styles.submitText}>
          {saving ? t('add.saving') : t('add.save')}
        </Text>
      </AnimatedPressable>

      {preview ? (
        <Text style={styles.preview}>
          {t('add.willSave', { amount: formatPlain(preview ?? 0) })}
        </Text>
      ) : (
        <Text style={styles.preview}>{t('add.hint')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 10,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
  },
  kicker: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 26,
    color: palette.ink,
    letterSpacing: -0.5,
  },
  amountBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: palette.accent,
    paddingBottom: 8,
  },
  currencyMark: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    color: palette.accent,
    marginBottom: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 48,
    color: palette.ink,
    letterSpacing: -1.5,
    paddingVertical: 4,
  },
  label: {
    marginTop: 8,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  pillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
  pillTextOn: {
    color: palette.white,
  },
  noteInput: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: palette.ink,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  submit: {
    marginTop: 14,
    backgroundColor: palette.accent,
    borderRadius: radii.lg,
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitPressed: { opacity: 0.9 },
  submitText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 17,
    color: palette.white,
  },
  preview: {
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkSoft,
  },
});
