import { useState } from 'react';
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

export function QuickAddBar() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings, quickTemplates, updateQuickTemplate } = useSettings();
  const { addExpense } = useExpenses();
  const [busyId, setBusyId] = useState<string | null>(null);
  const spendConcepts = settings.spendConcepts ?? [];

  const allowedIds = new Set([
    ...settings.enabledCategoryIds,
    ...flattenSpendSubs(spendConcepts).map((s) => s.id),
  ]);
  const templates = quickTemplates.filter((item) => allowedIds.has(item.categoryId));

  async function handleQuickAdd(templateId: string) {
    const template = templates.find((x) => x.id === templateId);
    if (!template || busyId) return;

    setBusyId(templateId);
    try {
      await addExpense({
        amount: template.amount,
        categoryId: template.categoryId,
        note: template.note,
      });
      await updateQuickTemplate({
        categoryId: template.categoryId,
        amount: template.amount,
        note: template.note,
      });

      if (settings.notifyOnExpense) {
        await notifyExpenseRegistered(
          t('notify.title'),
          t('notify.body', {
            amount: format(template.amount),
            category: categoryLabel(template.categoryId, t, spendConcepts),
          })
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('home.quickTitle')}</Text>
      <Text style={styles.hint}>{t('home.quickHint')}</Text>

      {templates.length === 0 ? (
        <Text style={styles.empty}>{t('home.quickEmpty')}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {templates.map((template) => {
            const category = getCategoryById(template.categoryId);
            const busy = busyId === template.id;
            return (
              <Pressable
                key={template.id}
                onPress={() => void handleQuickAdd(template.id)}
                disabled={!!busyId}
                style={[styles.chip, { borderColor: category.color }]}>
                <View style={[styles.dot, { backgroundColor: category.color }]} />
                <View>
                  <Text style={styles.chipTitle}>
                    {categoryLabel(template.categoryId, t, spendConcepts)}
                  </Text>
                  <Text style={styles.chipAmount}>{format(template.amount)}</Text>
                </View>
                {busy ? <ActivityIndicator size="small" color={palette.accent} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
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
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkSoft,
    marginTop: 4,
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
