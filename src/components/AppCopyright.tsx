import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  PRIVACY_POLICY_FALLBACK_URL,
  PRIVACY_POLICY_URL,
} from '@/src/constants/store';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import { tapFeedback } from '@/src/utils/selectFeedback';

const COPYRIGHT_YEAR = 2026;
const DEVELOPER = 'Sotico91';

/** Footer credit + copyright for settings-style screens. */
export function AppCopyright() {
  const { t } = useLanguage();

  async function openPrivacy() {
    tapFeedback();
    try {
      const can = await Linking.canOpenURL(PRIVACY_POLICY_URL);
      await Linking.openURL(can ? PRIVACY_POLICY_URL : PRIVACY_POLICY_FALLBACK_URL);
    } catch {
      /* ignore */
    }
  }

  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.developed}>
        {t('about.developedBy', { name: DEVELOPER })}
      </Text>
      <Text style={styles.copy}>
        {t('about.copyright', { year: COPYRIGHT_YEAR, name: DEVELOPER })}
      </Text>
      <Text style={styles.rights}>{t('about.allRights')}</Text>
      <Pressable onPress={() => void openPrivacy()} hitSlop={8} style={styles.privacyBtn}>
        <Text style={styles.privacy}>{t('about.privacyPolicy')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  developed: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.brand,
    textAlign: 'center',
  },
  copy: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.brandMuted,
    textAlign: 'center',
  },
  rights: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: palette.brandMuted,
    textAlign: 'center',
    opacity: 0.85,
  },
  privacyBtn: {
    marginTop: 8,
    paddingVertical: 4,
  },
  privacy: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.accent,
    textAlign: 'center',
  },
});
