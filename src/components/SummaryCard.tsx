import { StyleSheet, Text, View } from 'react-native';

import { useMoney } from '@/src/hooks/useMoney';
import { palette, radii } from '@/src/theme/colors';

type Props = {
  label: string;
  amount: number;
  hint?: string;
  large?: boolean;
};

export function SummaryCard({ label, amount, hint, large }: Props) {
  const { format } = useMoney();

  return (
    <View style={[styles.wrap, large && styles.wrapLarge]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, large && styles.amountLarge]}>{format(amount)}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: palette.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  wrapLarge: {
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  amount: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 36,
    color: palette.ink,
    letterSpacing: -1,
  },
  amountLarge: {
    fontSize: 44,
    letterSpacing: -1.4,
  },
  hint: {
    marginTop: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkSoft,
    lineHeight: 20,
  },
});
