import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getCategoryById } from '@/src/data/categories';
import { flattenSpendSubs } from '@/src/data/spendConcepts';
import { useExpenses } from '@/src/hooks/useExpenses';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { notifyExpenseRegistered } from '@/src/utils/notifications';
import { buildOneTapHabits } from '@/src/utils/oneTapHabits';
import { tapFeedback } from '@/src/utils/selectFeedback';

/**
 * One-tap = repeat a frequent habit (category + amount), not every past expense.
 * New / one-off spends go through the glance FAB → Agregar flow.
 */
export function QuickAddBar() {
  const { t } = useLanguage();
  const { format, formatPlain } = useMoney();
  const { settings, updateQuickTemplate } = useSettings();
  const { addExpense, transactions } = useExpenses();
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyLock = useRef(false);
  const spendConcepts = settings.spendConcepts ?? [];

  const allowedIds = useMemo(
    () =>
      new Set([
        ...settings.enabledCategoryIds,
        ...flattenSpendSubs(spendConcepts).map((s) => s.id),
      ]),
    [settings.enabledCategoryIds, spendConcepts]
  );

  const habits = useMemo(
    () => buildOneTapHabits(transactions, allowedIds),
    [transactions, allowedIds]
  );

  if (habits.length === 0) {
    return null;
  }

  async function handleQuickAdd(habitId: string) {
    const habit = habits.find((x) => x.id === habitId);
    if (!habit || busyLock.current) return;

    busyLock.current = true;
    setBusyId(habitId);
    try {
      await addExpense({
        amount: habit.amount,
        categoryId: habit.categoryId,
        note: habit.note,
      });
      await updateQuickTemplate({
        categoryId: habit.categoryId,
        amount: habit.amount,
        note: habit.note,
      });

      if (settings.notifyOnExpense) {
        await notifyExpenseRegistered(
          t('notify.title'),
          t('notify.body', {
            amount: formatPlain(habit.amount),
            category: categoryLabel(habit.categoryId, t, spendConcepts),
          })
        );
      }
    } finally {
      busyLock.current = false;
      setBusyId(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('home.quickTitle')}</Text>
      <Text style={styles.hint}>{t('home.quickHint')}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {habits.map((habit) => {
          const category = getCategoryById(habit.categoryId);
          const busy = busyId === habit.id;
          return (
            <Pressable
              key={habit.id}
              onPress={() => {
                tapFeedback();
                void handleQuickAdd(habit.id);
              }}
              disabled={!!busyId}
              style={[styles.chip, { borderColor: category.color }]}>
              <View style={[styles.dot, { backgroundColor: category.color }]} />
              <View>
                <Text style={styles.chipTitle}>
                  {categoryLabel(habit.categoryId, t, spendConcepts)}
                </Text>
                <Text style={styles.chipAmount}>{format(habit.amount)}</Text>
              </View>
              {busy ? <ActivityIndicator size="small" color={palette.accent} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 8,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  row: {
    gap: 10,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 140,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chipTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  chipAmount: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
});
