import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { NamePromptOverlay } from '@/src/components/NamePromptOverlay';
import { OnboardingOverlay } from '@/src/components/OnboardingOverlay';
import { ReminderHygiene } from '@/src/components/ReminderHygiene';
import { AmountPrivacyProvider } from '@/src/hooks/useAmountPrivacy';
import { ExpensesProvider } from '@/src/hooks/useExpenses';
import { SettingsProvider } from '@/src/hooks/useSettings';
import { LanguageProvider, useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import { startBadgeClearOnActive } from '@/src/utils/notifications';
import { prepareSelectFeedback } from '@/src/utils/selectFeedback';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      prepareSelectFeedback();
    }
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    return startBadgeClearOnActive();
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <LanguageProvider>
      <SettingsProvider>
        <AmountPrivacyProvider>
          <ExpensesProvider>
            <StatusBar style="light" />
            <RootNavigator />
            <ReminderHygiene />
            <OnboardingOverlay />
            <NamePromptOverlay />
          </ExpensesProvider>
        </AmountPrivacyProvider>
      </SettingsProvider>
    </LanguageProvider>
  );
}

function RootNavigator() {
  const { t } = useLanguage();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.bg },
        headerTintColor: palette.white,
        headerTitleStyle: {
          fontFamily: 'DMSans_600SemiBold',
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: palette.bg },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="agregar"
        options={{
          presentation: 'modal',
          title: t('add.title'),
          headerLargeTitle: false,
        }}
      />
    </Stack>
  );
}
