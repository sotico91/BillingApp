import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCategoryById } from '@/src/data/categories';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Transaction } from '@/src/types/finance';
import { formatExpenseDate } from '@/src/utils/dates';

type Props = {
  expense: Transaction;
  onDelete?: () => void;
  onEdit?: () => void;
  last?: boolean;
  showRegistrant?: boolean;
};

export function ExpenseRow({
  expense,
  onDelete,
  onEdit,
  last,
  showRegistrant = true,
}: Props) {
  const { t, language } = useLanguage();
  const { format } = useMoney();
  const category = expense.categoryId ? getCategoryById(expense.categoryId) : null;

  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View
        style={[
          styles.icon,
          { backgroundColor: `${category?.color ?? palette.inkSoft}22` },
        ]}>
        <View
          style={[styles.dot, { backgroundColor: category?.color ?? palette.inkSoft }]}
        />
      </View>
      <Pressable style={styles.content} onPress={onEdit} disabled={!onEdit}>
        <View style={styles.top}>
          <Text style={styles.category}>
            {t(`type.${expense.type}` as TranslationKey)}
            {expense.categoryId
              ? ` · ${t(`category.${expense.categoryId}` as TranslationKey)}`
              : ''}
          </Text>
          <Text style={styles.amount}>{format(expense.amount)}</Text>
        </View>
        <Text style={styles.meta} numberOfLines={2}>
          {formatExpenseDate(expense.createdAt, language)}
          {expense.paymentMethod
            ? ` · ${t(`method.${expense.paymentMethod}` as TranslationKey)}`
            : ''}
          {showRegistrant && expense.registeredByName
            ? ` · ${t('history.byPerson', { name: expense.registeredByName })}`
            : ''}
          {expense.note ? ` · ${expense.note}` : ''}
        </Text>
      </Pressable>
      <View style={styles.actions}>
        {onEdit ? (
          <Pressable onPress={onEdit} hitSlop={10} style={styles.actionBtn}>
            <Text style={styles.editText}>{t('history.edit')}</Text>
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={10} style={styles.actionBtn}>
            <Text style={styles.deleteText}>{t('history.delete')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  category: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  amount: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  meta: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
  },
  actions: {
    gap: 4,
    alignItems: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  editText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.accentDeep,
  },
  deleteText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.danger,
  },
});
