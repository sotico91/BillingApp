import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ExpenseForm, type SavedMovement } from '@/src/components/ExpenseForm';
import { FriendlyAddFlow } from '@/src/components/FriendlyAddFlow';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';

export default function AgregarScreen() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const [mode, setMode] = useState<'friendly' | 'advanced'>('friendly');

  function handleSaved(result: SavedMovement) {
    const messageKey =
      result.kind === 'income'
        ? 'add.savedIncome'
        : result.kind === 'expense'
          ? 'add.savedExpense'
          : 'add.savedOther';
    Alert.alert(t('add.savedTitle'), t(messageKey, { amount: format(result.amount) }), [
      {
        text: t('add.ok'),
        onPress: () => router.back(),
      },
    ]);
  }

  return (
    <ScreenBackground edges="none">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('add.title')}</Text>

          <View style={styles.modeSwitch}>
            <Pressable
              onPress={() => setMode('friendly')}
              style={[styles.modeBtn, mode === 'friendly' && styles.modeOn]}>
              <Text style={[styles.modeText, mode === 'friendly' && styles.modeTextOn]}>
                {t('flow.friendly')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('advanced')}
              style={[styles.modeBtn, mode === 'advanced' && styles.modeOn]}>
              <Text style={[styles.modeText, mode === 'advanced' && styles.modeTextOn]}>
                {t('flow.advanced')}
              </Text>
            </Pressable>
          </View>

          {mode === 'friendly' ? (
            <FriendlyAddFlow
              onSaved={handleSaved}
              onSwitchAdvanced={() => setMode('advanced')}
            />
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.advancedPad}>
              <ExpenseForm onSaved={handleSaved} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flex: 1,
    padding: 22,
    paddingBottom: 28,
    gap: 12,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    color: palette.brand,
    letterSpacing: -0.8,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii.md,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  modeOn: {
    backgroundColor: palette.surfaceSolid,
  },
  modeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.brandMuted,
  },
  modeTextOn: {
    color: palette.ink,
    fontFamily: 'DMSans_600SemiBold',
  },
  advancedPad: {
    paddingBottom: 24,
  },
});
