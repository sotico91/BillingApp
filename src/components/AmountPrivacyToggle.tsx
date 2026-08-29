import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAmountPrivacy } from '@/src/hooks/useAmountPrivacy';
import { useKeyboardVisible } from '@/src/hooks/useKeyboardVisible';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import { tapFeedback } from '@/src/utils/selectFeedback';

type Props = {
  /** Embed inline (e.g. home header) instead of floating. */
  inline?: boolean;
  light?: boolean;
};

export function AmountPrivacyToggle({ inline = false, light = false }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { amountsVisible, toggleAmountsVisible } = useAmountPrivacy();
  const keyboardVisible = useKeyboardVisible();

  const tint =
    amountsVisible || light || !inline ? palette.white : palette.ink;

  const button = (
    <Pressable
      onPress={() => {
        tapFeedback();
        toggleAmountsVisible();
      }}
      hitSlop={10}
      style={[
        styles.btn,
        light && styles.btnLight,
        amountsVisible && styles.btnOn,
        inline && styles.btnInline,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: amountsVisible }}
      accessibilityLabel={
        amountsVisible ? t('privacy.hideAmounts') : t('privacy.showAmounts')
      }>
      <SymbolView
        name={{
          ios: amountsVisible ? 'eye.fill' : 'eye.slash.fill',
          android: amountsVisible ? 'visibility' : 'visibility_off',
          web: amountsVisible ? 'visibility' : 'visibility_off',
        }}
        tintColor={tint}
        size={inline ? 17 : 20}
      />
    </Pressable>
  );

  if (inline) return button;
  if (keyboardVisible) return null;

  // Left side so it never fights the glance FAB on the right — visible on every tab.
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.floatWrap,
        { bottom: Math.max(insets.bottom, 12) + 78, left: 16 },
      ]}>
      {button}
    </View>
  );
}

const styles = StyleSheet.create({
  floatWrap: {
    position: 'absolute',
    zIndex: 40,
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#163642',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  btnInline: {
    width: 36,
    height: 36,
    borderRadius: 18,
    shadowOpacity: 0,
    backgroundColor: 'rgba(8,20,28,0.12)',
    borderColor: 'rgba(8,20,28,0.08)',
  },
  btnLight: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  btnOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
});
