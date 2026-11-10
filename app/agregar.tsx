import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppAlertHost } from '@/src/components/AppAlert';
import { DictationBar } from '@/src/components/DictationPanel';
import { ExpenseForm, type SavedMovement } from '@/src/components/ExpenseForm';
import { FriendlyAddFlow } from '@/src/components/FriendlyAddFlow';
import { QuickSpendForm } from '@/src/components/QuickSpendForm';
import type { FriendlyIntent } from '@/src/data/friendlyTemplates';
import { KeyboardSafeScroll } from '@/src/components/KeyboardSafe';
import { useSaveToast } from '@/src/components/SaveToast';
import { categoryVisual } from '@/src/data/spendConcepts';
import { useDictation } from '@/src/hooks/useDictation';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { colors, space } from '@/src/theme';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { openDebts } from '@/src/utils/debts';
import { dictationVocabulary, type DictatedMovement } from '@/src/utils/dictation';
import type { TranslationKey } from '@/src/i18n/translations';

export default function AgregarScreen() {
  const { t } = useLanguage();
  const { format, currency } = useMoney();
  const { settings } = useSettings();
  const { accounts, debts } = useFinance();
  const toast = useSaveToast();
  const params = useLocalSearchParams<{
    categoryId?: string;
    amount?: string;
    note?: string;
    mode?: string;
    intent?: string;
    debtId?: string;
  }>();
  const prefilledCategoryId =
    typeof params.categoryId === 'string' ? params.categoryId : undefined;
  const prefilledAmount =
    typeof params.amount === 'string' && params.amount.trim()
      ? params.amount.trim()
      : undefined;
  const prefilledNote =
    typeof params.note === 'string' ? params.note : undefined;

  const payDebtId =
    typeof params.debtId === 'string' && params.debtId.trim()
      ? params.debtId.trim()
      : undefined;
  const payIntent =
    params.intent === 'debt'
      ? ('debt' as const)
      : params.intent === 'spend'
        ? ('spend' as const)
        : params.intent === 'earn'
          ? ('earn' as const)
          : undefined;

  // Spending is the most common entry, so "Add" opens the one-screen expense
  // form. Links that already know what they want (pay a debt, a reminder) skip it.
  // The guided steps only open with something to do (income, move, debt, a card spend);
  // the advanced form only for links that bring a category (reminders, one-tap habits).
  const [mode, setMode] = useState<'quick' | 'friendly' | 'advanced'>(() =>
    params.mode === 'advanced' || prefilledCategoryId ? 'advanced' : payIntent ? 'friendly' : 'quick'
  );
  const [guidedIntent, setGuidedIntent] = useState<FriendlyIntent | undefined>(undefined);
  // Amount typed in the quick form travels to the guided flow.
  const [guidedAmount, setGuidedAmount] = useState<string | undefined>(undefined);

  // Dictation at the top serves every kind: a spend fills the quick form,
  // anything else opens its guided steps with what was said.
  const [dictatedSpend, setDictatedSpend] = useState<{ id: number; movement: DictatedMovement }>();
  const [guidedDictation, setGuidedDictation] = useState<{ id: number; movement: DictatedMovement }>();
  const [heard, setHeard] = useState<{ text: string; noAmount: boolean } | null>(null);
  const liveDebts = useMemo(() => openDebts(debts), [debts]);
  const dictationDebts = useMemo(
    () =>
      liveDebts.map((d) => ({
        id: d.id,
        names: [d.name ?? '', d.nameKey ? t(d.nameKey as TranslationKey) : ''].filter(Boolean),
        card: d.kind === 'revolving' && (d.revolvingProduct ?? 'card') === 'card',
      })),
    [liveDebts, t]
  );
  const vocabulary = useMemo(() => {
    const concepts = settings.spendConcepts ?? [];
    return dictationVocabulary([
      ...accounts.map((a) => a.name ?? '').filter(Boolean),
      ...dictationDebts.flatMap((d) => d.names),
      ...concepts.flatMap((c) => [c.name, ...c.subs.map((sub) => sub.name)]),
    ]);
  }, [accounts, dictationDebts, settings.spendConcepts]);
  const dictation = useDictation({
    accounts,
    debts: dictationDebts,
    currency,
    vocabulary,
    onHeard: ({ text, movement }) => {
      const id = Date.now();
      setHeard({ text, noAmount: movement.amount === null });
      if (movement.type === 'expense') {
        setDictatedSpend({ id, movement });
        setMode('quick');
        return;
      }
      setDictatedSpend(undefined);
      setGuidedIntent(movement.type === 'income' ? 'earn' : movement.type);
      setGuidedAmount(movement.amount ? String(movement.amount) : undefined);
      setGuidedDictation({ id, movement });
      setMode('friendly');
    },
  });

  useEffect(() => {
    if (params.mode === 'advanced' || prefilledCategoryId) {
      setMode('advanced');
    } else if (params.mode === 'quick') {
      setMode('quick');
    }
  }, [params.mode, prefilledCategoryId]);

  // At the top of every form, scrolling with it: while typing it moves out of the way.
  const dictationBar = dictation.available ? (
    <DictationBar
      phase={dictation.phase}
      transcript={dictation.transcript}
      level={dictation.level}
      heard={heard?.text ?? null}
      noAmount={heard?.noAmount ?? false}
      onStart={() => {
        setHeard(null);
        void dictation.start();
      }}
      onDone={dictation.stop}
      onCancel={dictation.cancel}
    />
  ) : null;

  function handleSaved(result: SavedMovement) {
    const spendConcepts = settings.spendConcepts ?? [];
    const visual = result.categoryId
      ? categoryVisual(result.categoryId, spendConcepts)
      : undefined;
    const label = result.categoryId
      ? categoryLabel(result.categoryId, t, spendConcepts)
      : '';
    const added = result.added ?? result.amount;

    const kicker =
      result.kind === 'income'
        ? t('add.toastIncome')
        : result.kind === 'expense'
          ? t('add.toastExpense')
          : t('add.toastOther');
    const footer =
      result.kind === 'expense'
        ? t('add.savedExpense', { amount: format(result.amount) })
        : result.kind === 'income'
          ? t('add.toastTodayIncome', { amount: format(result.amount) })
          : undefined;

    router.back();
    toast.show({
      tone: result.kind,
      kicker,
      title: label || kicker,
      amount: `${result.kind === 'expense' ? '−' : result.kind === 'income' ? '+' : ''}${format(added)}`,
      footer,
      icon: result.kind === 'expense' ? visual?.icon : undefined,
      color: result.kind === 'expense' ? visual?.color : undefined,
    });
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {mode === 'quick' ? (
          <QuickSpendForm
            header={dictationBar}
            dictated={dictatedSpend}
            onSaved={handleSaved}
            onOpenGuided={(intent, amount) => {
              // Picked by hand: start that flow clean.
              setGuidedDictation(undefined);
              setGuidedIntent(intent);
              setGuidedAmount(amount);
              setMode('friendly');
            }}
          />
        ) : (
          <>
          {mode === 'friendly' ? (
            <FriendlyAddFlow
              key={`${guidedIntent ?? 'pick'}-${guidedAmount ?? ''}-${guidedDictation?.id ?? ''}`}
              initialAmount={guidedAmount}
              dictated={guidedDictation?.movement}
              header={dictationBar}
              onSaved={handleSaved}
              initialIntent={guidedIntent ?? payIntent}
              initialDebtId={payDebtId}
              onBackFromStart={() => {
                setGuidedIntent(undefined);
                setGuidedDictation(undefined);
                setMode('quick');
              }}
            />
          ) : (
            <KeyboardSafeScroll
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.advancedPad}>
              {dictationBar}
              <ExpenseForm
                onSaved={handleSaved}
                initialCategoryId={prefilledCategoryId}
                initialAmount={prefilledAmount}
                initialNote={prefilledNote}
              />
            </KeyboardSafeScroll>
          )}
          </>
        )}
      </View>
      {/* On iOS this screen is a native modal, so its alerts must render inside it. */}
      <AppAlertHost inline />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.screen,
  },
  content: {
    flex: 1,
    padding: space.gutter,
    paddingBottom: space.xxl,
    gap: space.sm,
  },
  advancedPad: {
    paddingBottom: 120,
    gap: space.sm,
  },
});
