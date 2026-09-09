import { Pressable, StyleSheet, Text } from 'react-native';

import { useHowToGuide } from '@/src/hooks/useHowToGuide';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import { tapFeedback } from '@/src/utils/selectFeedback';

type Props = {
  /** White-on-teal, for the Home hero next to ⋯. */
  light?: boolean;
  variant?: 'icon' | 'chip';
};

export function HowToGuideButton({ light = false, variant = 'icon' }: Props) {
  const { t } = useLanguage();
  const { openGuide } = useHowToGuide();

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        openGuide();
      }}
      hitSlop={10}
      accessibilityLabel={t('guide.openA11y')}
      style={[
        variant === 'chip' ? styles.chip : styles.icon,
        light && (variant === 'chip' ? styles.chipLight : styles.iconLight),
      ]}>
      <Text
        style={[
          variant === 'chip' ? styles.chipText : styles.iconText,
          light && styles.lightText,
        ]}>
        {variant === 'chip' ? t('guide.menu') : '?'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,20,28,0.08)',
  },
  iconLight: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  iconText: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 18,
    color: palette.ink,
    marginTop: -1,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  chipLight: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  chipText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.white,
  },
  lightText: {
    color: palette.white,
  },
});
