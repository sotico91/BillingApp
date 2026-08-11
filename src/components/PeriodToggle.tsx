import { StyleSheet, Text, View } from 'react-native';

import { SelectPressable } from '@/src/components/SelectPressable';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Period } from '@/src/types/expense';

type Props = {
  value: Period;
  onChange: (period: Period) => void;
};

const PERIODS: Period[] = ['hoy', 'semana', 'mes'];

export function PeriodToggle({ value, onChange }: Props) {
  const { t } = useLanguage();

  return (
    <View style={styles.wrap}>
      {PERIODS.map((period) => {
        const selected = period === value;
        return (
          <SelectPressable
            key={period}
            onPress={() => onChange(period)}
            style={[styles.item, selected && styles.itemSelected]}>
            <Text style={[styles.text, selected && styles.textSelected]}>
              {t(`period.${period}` as TranslationKey)}
            </Text>
          </SelectPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: radii.md,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: palette.border,
  },
  item: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
  },
  itemSelected: {
    backgroundColor: palette.surfaceSolid,
    shadowColor: palette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  text: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  textSelected: {
    color: palette.ink,
    fontFamily: 'DMSans_600SemiBold',
  },
});
