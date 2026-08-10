import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import type { Category } from '@/src/types/expense';
import { palette, radii } from '@/src/theme/colors';

type Props = {
  category: Category;
  selected?: boolean;
  onPress?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CategoryChip({ category, selected, onPress }: Props) {
  const { t } = useLanguage();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 220 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 220 });
      }}
      style={[
        styles.chip,
        selected && {
          backgroundColor: category.color,
          borderColor: category.color,
          shadowColor: category.color,
          shadowOpacity: 0.25,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        },
        animatedStyle,
      ]}>
      <View
        style={[
          styles.dot,
          { backgroundColor: selected ? palette.white : category.color },
        ]}
      />
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {t(`category.${category.id}` as TranslationKey)}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceSolid,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
  },
  labelSelected: {
    color: palette.white,
  },
});
