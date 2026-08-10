import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';

export default function NotFoundScreen() {
  const { t } = useLanguage();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('notFound.title')}</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('notFound.back')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: palette.bg,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.brand,
    letterSpacing: -0.3,
  },
  link: {
    marginTop: 16,
    paddingVertical: 12,
  },
  linkText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.gold,
    letterSpacing: 0.3,
  },
});
