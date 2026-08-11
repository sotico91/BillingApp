import { StyleSheet, Text, View } from 'react-native';

import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { categoryLabel } from '@/src/utils/categoryLabel';
import type { PredictedSpend } from '@/src/utils/financeMath';

type Props = {
  items: PredictedSpend[];
};

export function PredictedSpendsCard({ items }: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const spendConcepts = settings.spendConcepts ?? [];

  if (items.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>{t('home.predictEmpty')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {items.map((item, index) => {
        const name =
          item.label?.trim() ||
          categoryLabel(item.categoryId, t, spendConcepts);
        const pending = item.status === 'pending';
        return (
          <View
            key={item.id}
            style={[
              styles.row,
              index < items.length - 1 && styles.rowDivider,
              !pending && styles.rowPaid,
            ]}>
            <View style={styles.rowMain}>
              <Text style={[styles.name, !pending && styles.namePaid]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.meta}>
                {pending
                  ? t('home.predictDay', { day: item.typicalDay })
                  : t('home.predictPaid')}
              </Text>
            </View>
            <Text style={[styles.amount, !pending && styles.amountPaid]}>
              {format(item.amount)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: palette.border,
  },
  empty: {
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  rowPaid: {
    opacity: 0.72,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  namePaid: {
    color: palette.inkMuted,
  },
  meta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  amount: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  amountPaid: {
    color: palette.inkMuted,
    textDecorationLine: 'line-through',
  },
});
