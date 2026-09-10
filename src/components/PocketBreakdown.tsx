import { StyleSheet, Text, View } from 'react-native';

import { MoneyText } from '@/src/components/MoneyText';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import type { PocketSpend } from '@/src/utils/pockets';

type Props = {
  pockets: PocketSpend[];
};

export function PocketBreakdown({ pockets }: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();

  if (pockets.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.empty}>{t('insights.pocketsEmpty')}</Text>
      </View>
    );
  }

  const max = Math.max(...pockets.map((p) => p.total), 1);

  return (
    <View style={styles.list}>
      {pockets.map((item) => (
        <View key={item.accountId} style={styles.item}>
          <View style={styles.header}>
            <View style={styles.nameRow}>
              <View style={[styles.swatch, { backgroundColor: item.color }]} />
              <Text style={styles.name}>{item.name}</Text>
            </View>
            <MoneyText style={styles.total}>{format(item.total)}</MoneyText>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.max(6, (item.total / max) * 100)}%`,
                  backgroundColor: item.color,
                },
              ]}
            />
          </View>
          <Text style={styles.meta}>
            {t('insights.percentOfTotal', { percent: Math.round(item.percent) })}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  emptyWrap: {
    paddingVertical: 8,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    lineHeight: 20,
  },
  item: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
    flexShrink: 1,
  },
  total: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,28,36,0.06)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  meta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkSoft,
  },
});
