import { useMemo, useState } from 'react';
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
import { CATEGORIES } from '@/src/data/categories';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { PaymentMethod, TransactionType } from '@/src/types/finance';
import { notifyExpenseRegistered } from '@/src/utils/notifications';

type Props = {
  onSaved?: (todayTotal: number) => void;
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

export function ExpenseForm({ onSaved }: Props) {
  const { t } = useLanguage();
  const { format, parse, currency } = useMoney();
  const { settings, updateQuickTemplate } = useSettings();
  const { addTransaction, totalForPeriod, accounts } = useFinance();

  const enabledCategories = useMemo(
    () => CATEGORIES.filter((c) => settings.enabledCategoryIds.includes(c.id)),
    [settings.enabledCategoryIds]
  );

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState(enabledCategories[0]?.id ?? 'otros');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? 'cash');
  const [toAccountId, setToAccountId] = useState('savings');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const scale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  async function handleSave() {
    const parsed = parse(amount);
    if (!parsed) {
      Alert.alert(t('add.invalidTitle'), t('add.invalidMessage'));
      return;
    }

    setSaving(true);
    try {
      const beforeToday = totalForPeriod('hoy', 'expense');
      await addTransaction({
        type,
        amount: parsed,
        categoryId: type === 'expense' || type === 'income' ? categoryId : categoryId,
        paymentMethod: type === 'income' ? undefined : method,
        accountId,
        toAccountId:
          type === 'transfer' || type === 'investment' ? toAccountId : undefined,
        note,
      });

      if (type === 'expense') {
        await updateQuickTemplate({
          categoryId,
          amount: parsed,
          note: note.trim() || undefined,
        });
      }

      if (settings.notifyOnExpense) {
        await notifyExpenseRegistered(
          t('notify.title'),
          t('notify.body', {
            amount: format(parsed),
            category: t(`category.${categoryId}` as TranslationKey),
          })
        );
      }

      setAmount('');
      setNote('');
      onSaved?.(type === 'expense' ? beforeToday + parsed : beforeToday);
    } finally {
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
          keyboardType={currency === 'USD' ? 'decimal-pad' : 'number-pad'}
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
            onPress={() => setType(item)}
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
        {type === 'income' ? t('flow.whichAccountIncome') : t('add.account')}
      </Text>
      <View style={styles.chips}>
        {accounts.map((acc) => (
          <Pressable
            key={acc.id}
            onPress={() => setAccountId(acc.id)}
            style={[styles.pill, accountId === acc.id && styles.pillOn]}>
            <Text style={[styles.pillText, accountId === acc.id && styles.pillTextOn]}>
              {t(acc.nameKey as TranslationKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      {(type === 'transfer' || type === 'investment') && (
        <>
          <Text style={styles.label}>→</Text>
          <View style={styles.chips}>
            {accounts
              .filter((a) => a.id !== accountId)
              .map((acc) => (
                <Pressable
                  key={acc.id}
                  onPress={() => setToAccountId(acc.id)}
                  style={[styles.pill, toAccountId === acc.id && styles.pillOn]}>
                  <Text
                    style={[
                      styles.pillText,
                      toAccountId === acc.id && styles.pillTextOn,
                    ]}>
                    {t(acc.nameKey as TranslationKey)}
                  </Text>
                </Pressable>
              ))}
          </View>
        </>
      )}

      <Text style={styles.label}>{t('add.category')}</Text>
      <View style={styles.chips}>
        {enabledCategories.map((category) => (
          <CategoryChip
            key={category.id}
            category={category}
            selected={category.id === categoryId}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </View>

      <Text style={styles.label}>{t('add.note')}</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={t('add.notePlaceholder')}
        placeholderTextColor={palette.inkSoft}
        style={styles.noteInput}
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
        <Text style={styles.preview}>{t('add.willSave', { amount: format(preview) })}</Text>
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
