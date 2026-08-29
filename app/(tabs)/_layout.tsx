import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import { AmountPrivacyToggle } from '@/src/components/AmountPrivacyToggle';
import { FloatingGlanceFab } from '@/src/components/FloatingGlanceFab';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { useKeyboardVisible } from '@/src/hooks/useKeyboardVisible';
import { palette } from '@/src/theme/colors';
import { tapFeedback } from '@/src/utils/selectFeedback';

export default function TabLayout() {
  const { t } = useLanguage();
  const keyboardVisible = useKeyboardVisible();

  return (
    <View style={styles.root}>
      <Tabs
        screenListeners={{
          tabPress: () => {
            tapFeedback();
          },
        }}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: palette.accent,
          tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
          tabBarStyle: {
            position: 'absolute',
            display: keyboardVisible ? 'none' : 'flex',
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#163642',
            borderTopWidth: 0,
            elevation: 0,
            height: 84,
            paddingTop: 6,
          },
          tabBarBackground: () => (
            <BlurView
              intensity={Platform.OS === 'ios' ? 70 : 40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ),
          tabBarLabelStyle: {
            fontFamily: 'DMSans_600SemiBold',
            fontSize: 10,
            letterSpacing: 0.3,
            marginBottom: 6,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.home'),
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: 'house.fill', android: 'home', web: 'home' }}
                tintColor={color}
                size={22}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="historial"
          options={{
            title: t('tabs.history'),
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: 'list.bullet', android: 'list', web: 'list' }}
                tintColor={color}
                size={22}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="plan"
          options={{
            title: t('tabs.plan'),
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: 'target', android: 'flag', web: 'flag' }}
                tintColor={color}
                size={22}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="wealth"
          options={{
            title: t('tabs.wealth'),
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{
                  ios: 'building.columns.fill',
                  android: 'account_balance',
                  web: 'account_balance',
                }}
                tintColor={color}
                size={22}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: t('tabs.insights'),
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{
                  ios: 'chart.bar.fill',
                  android: 'bar_chart',
                  web: 'bar_chart',
                }}
                tintColor={color}
                size={22}
              />
            ),
          }}
        />
      </Tabs>
      <AmountPrivacyToggle />
      <FloatingGlanceFab />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
