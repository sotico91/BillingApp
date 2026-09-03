import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Account } from '@/src/types/finance';
import { accountRoleKey } from '@/src/utils/accounts';
import { tapFeedback } from '@/src/utils/selectFeedback';

type Props = {
  accounts: Account[];
  selectedId: string;
  onSelect: (id: string) => void;
  variant?: 'chip' | 'card';
};

/** Account picker that shows principal vs secondary and the live balance. */
export function AccountChoiceChips({
  accounts,
  selectedId,
  onSelect,
  variant = 'chip',
}: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const card = variant === 'card';

  return (
    <View style={styles.wrap}>
      {accounts.map((acc) => {
        const on = acc.id === selectedId;
        return (
          <Pressable
            key={acc.id}
            onPress={() => {
              tapFeedback();
              onSelect(acc.id);
            }}
            style={[
              card ? styles.card : styles.chip,
              on && (card ? styles.cardOn : styles.chipOn),
            ]}>
            <Text
              style={[
                card ? styles.cardName : styles.chipName,
                on && styles.onText,
              ]}>
              {t(acc.nameKey as TranslationKey)}
            </Text>
            <Text style={[styles.meta, on && styles.onText]}>
              {t(accountRoleKey(acc.type))} · {format(acc.balance)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F7FAFC',
  },
  chipOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  chipName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  card: {
    minWidth: '46%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F7FAFC',
  },
  cardOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  cardName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  meta: {
    marginTop: 2,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: palette.inkMuted,
  },
  onText: {
    color: palette.white,
  },
});
