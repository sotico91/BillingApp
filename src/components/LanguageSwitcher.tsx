import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/src/i18n/LanguageContext';
import type { Language } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';

const OPTIONS: Language[] = ['en', 'es'];

type Props = {
  variant?: 'dark' | 'light';
};

export function LanguageSwitcher({ variant = 'dark' }: Props) {
  const { language, setLanguage, t } = useLanguage();
  const light = variant === 'light';

  return (
    <View style={[styles.wrap, light && styles.wrapLight]}>
      <Text style={[styles.label, light && styles.labelLight]}>{t('language.label')}</Text>
      <View style={[styles.toggle, light && styles.toggleLight]}>
        {OPTIONS.map((option) => {
          const selected = option === language;
          return (
            <Pressable
              key={option}
              onPress={() => setLanguage(option)}
              style={[
                styles.option,
                selected && (light ? styles.optionSelectedLight : styles.optionSelected),
              ]}>
              <Text
                style={[
                  styles.optionText,
                  light && styles.optionTextLight,
                  selected && styles.optionTextSelected,
                ]}>
                {t(option === 'en' ? 'language.en' : 'language.es')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  wrapLight: {
    backgroundColor: '#F3F7F9',
    borderColor: palette.border,
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.brandMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  labelLight: {
    color: palette.inkMuted,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  toggleLight: {
    backgroundColor: '#E4EBEF',
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  optionSelected: {
    backgroundColor: palette.white,
  },
  optionSelectedLight: {
    backgroundColor: palette.white,
  },
  optionText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.6,
  },
  optionTextLight: {
    color: palette.inkMuted,
  },
  optionTextSelected: {
    color: palette.ink,
  },
});
