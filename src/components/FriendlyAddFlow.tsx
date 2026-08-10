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
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  FRIENDLY_INTENTS,
  FRIENDLY_TEMPLATES,
  intentToType,
  type FriendlyIntent,
} from '@/src/data/friendlyTemplates';
import { CATEGORIES } from '@/src/data/categories';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { PaymentMethod } from '@/src/types/finance';
import { notifyExpenseRegistered } from '@/src/utils/notifications';

type Props = {
  onSaved?: (todayExpenseTotal: number) => void;
  onSwitchAdvanced?: () => void;
};

const METHODS: PaymentMethod[] = ['cash', 'debit', 'credit', 'transfer'];

export function FriendlyAddFlow({ onSaved, onSwitchAdvanced }: Props) {
  const { t } = useLanguage();
  const { format, parse, currency } = useMoney();
  const { settings, updateQuickTemplate } = useSettings();
  const { addTransaction, totalForPeriod, accounts } = useFinance();

  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<FriendlyIntent>('spend');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('cafe');
  const [method, setMethod] = useState<PaymentMethod>('debit');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? 'cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const enabledCategories = useMemo(
    () => CATEGORIES.filter((c) => settings.enabledCategoryIds.includes(c.id)),
    [settings.enabledCategoryIds]
  );

  const categoryChoices = useMemo(() => {
    if (intent !== 'earn') return enabledCategories;
    const income = CATEGORIES.find((c) => c.id === 'ingresos');
    if (!income) return enabledCategories;
    if (enabledCategories.some((c) => c.id === 'ingresos')) return enabledCategories;
    return [income, ...enabledCategories];
  }, [enabledCategories, intent]);

  const templates = useMemo(
    () =>
      FRIENDLY_TEMPLATES.filter(
        (tpl) =>
          settings.enabledCategoryIds.includes(tpl.categoryId) ||
          tpl.intent !== 'spend'
      ),
    [settings.enabledCategoryIds]
  );

  const asksPaymentMethod = intent === 'spend' || intent === 'move' || intent === 'debt';
  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  function applyTemplate(id: string) {
    const tpl = FRIENDLY_TEMPLATES.find((x) => x.id === id);
    if (!tpl) return;
    setIntent(tpl.intent);
    setCategoryId(tpl.categoryId);
    if (tpl.amountHint) setAmount(String(tpl.amountHint));
    if (tpl.intent === 'move') {
      setAccountId('bank-main');
    }
    if (tpl.intent === 'earn') {
      setAccountId(accounts.find((a) => a.type === 'bank')?.id ?? accounts[0]?.id ?? 'cash');
    }
    setStep(1);
  }

  function goNext() {
    if (step === 1) {
      const parsed = parse(amount);
      if (!parsed) {
        Alert.alert(t('add.invalidTitle'), t('add.invalidMessage'));
        return;
      }
    }
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  async function save() {
    const parsed = parse(amount);
    if (!parsed) {
      Alert.alert(t('add.invalidTitle'), t('add.invalidMessage'));
      return;
    }

    setSaving(true);
    try {
      const type = intentToType(intent);
      const before = totalForPeriod('hoy', 'expense');
      await addTransaction({
        type,
        amount: parsed,
        categoryId,
        paymentMethod: asksPaymentMethod ? method : undefined,
        accountId,
        toAccountId: intent === 'move' ? 'savings' : undefined,
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

      onSaved?.(type === 'expense' ? before + parsed : before);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.stepLabel}>
        {t('flow.stepOf', { current: step + 1, total: totalSteps })}
      </Text>

      <ScrollView
        keyboardShouldPersistTaps="handled"
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
                    setIntent(item.id);
                    if (item.id === 'earn') {
                      setCategoryId('ingresos');
                      setAccountId(
                        accounts.find((a) => a.type === 'bank')?.id ??
                          accounts[0]?.id ??
                          'cash'
                      );
                    }
                    if (item.id === 'spend') setCategoryId('cafe');
                    if (item.id === 'move') setCategoryId('otros');
                    if (item.id === 'debt') setCategoryId('otros');
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
                  onPress={() => applyTemplate(tpl.id)}
                  style={styles.tplCard}>
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
                keyboardType={currency === 'USD' ? 'decimal-pad' : 'number-pad'}
                placeholder="0"
                placeholderTextColor={palette.inkSoft}
                style={styles.amountInput}
                autoFocus
              />
            </View>
          </Animated.View>
        ) : null}

        {step === 2 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            <Text style={styles.title}>{t('flow.chooseCategory')}</Text>
            <View style={styles.catGrid}>
              {categoryChoices.map((cat) => {
                const selected = cat.id === categoryId;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategoryId(cat.id)}
                    style={[
                      styles.catCard,
                      selected && {
                        backgroundColor: cat.color,
                        borderColor: cat.color,
                      },
                    ]}>
                    <Text
                      style={[styles.catText, selected && styles.catTextOn]}>
                      {t(`category.${cat.id}` as TranslationKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        {step === 3 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            {asksPaymentMethod ? (
              <>
                <Text style={styles.title}>{t('flow.howPaid')}</Text>
                <View style={styles.catGrid}>
                  {METHODS.map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setMethod(m)}
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
                asksPaymentMethod ? { marginTop: 18, fontSize: 24 } : null,
              ]}>
              {intent === 'earn' ? t('flow.whichAccountIncome') : t('flow.whichAccount')}
            </Text>
            <View style={styles.catGrid}>
              {accounts.map((acc) => (
                <Pressable
                  key={acc.id}
                  onPress={() => setAccountId(acc.id)}
                  style={[
                    styles.catCard,
                    accountId === acc.id && styles.catCardOn,
                  ]}>
                  <Text
                    style={[
                      styles.catText,
                      accountId === acc.id && styles.catTextOn,
                    ]}>
                    {t(acc.nameKey as TranslationKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {step === 4 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            <Text style={styles.title}>{t('flow.review')}</Text>
            <View style={styles.summary}>
              <SummaryLine
                label={t('flow.summaryAmount')}
                value={format(parse(amount) ?? 0)}
              />
              <SummaryLine
                label={t('flow.summaryType')}
                value={t(`type.${intentToType(intent)}` as TranslationKey)}
              />
              <SummaryLine
                label={t('flow.summaryCategory')}
                value={t(`category.${categoryId}` as TranslationKey)}
              />
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
                value={t(
                  (accounts.find((a) => a.id === accountId)?.nameKey ??
                    'account.cash') as TranslationKey
                )}
              />
            </View>
            <Text style={styles.noteLabel}>{t('flow.noteOptional')}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('add.notePlaceholder')}
              placeholderTextColor={palette.inkSoft}
              style={styles.noteInput}
            />
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 ? (
          <Pressable onPress={() => setStep((s) => s - 1)} style={styles.secondary}>
            <Text style={styles.secondaryText}>{t('flow.back')}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onSwitchAdvanced} style={styles.secondary}>
            <Text style={styles.secondaryText}>{t('flow.advanced')}</Text>
          </Pressable>
        )}

        {step === 0 ? null : step < totalSteps - 1 ? (
          <Pressable onPress={goNext} style={styles.primary}>
            <Text style={styles.primaryText}>{t('flow.next')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void save()}
            disabled={saving}
            style={[styles.primary, saving && { opacity: 0.7 }]}>
            <Text style={styles.primaryText}>
              {saving ? t('add.saving') : t('flow.save')}
            </Text>
          </Pressable>
        )}
      </View>
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
    minHeight: 520,
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
    paddingBottom: 16,
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
