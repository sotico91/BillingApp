import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import type { OneTapHabit } from '@/src/utils/oneTapHabits';
import { tapFeedback } from '@/src/utils/selectFeedback';

type Props = {
  visible: boolean;
  habit: OneTapHabit | null;
  label: string;
  format: (n: number) => string;
  currency: string;
  parse: (raw: string) => number | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  onEditFull: (amount: number) => void;
};

export function QuickRepeatSheet({
  visible,
  habit,
  label,
  format,
  currency,
  parse,
  busy,
  onClose,
  onConfirm,
  onEditFull,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [amountText, setAmountText] = useState('');

  useEffect(() => {
    if (!visible || !habit) return;
    setEditing(false);
    setAmountText(String(habit.amount));
  }, [visible, habit?.categoryId, habit?.amount]);

  if (!habit) return null;

  const parsed = parse(amountText);
  const canConfirm = parsed != null && parsed > 0 && !busy;

  function handleClose() {
    if (busy) return;
    Keyboard.dismiss();
    tapFeedback();
    onClose();
  }

  function handleConfirm() {
    if (!canConfirm || parsed == null) return;
    tapFeedback();
    onConfirm(parsed);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <View style={styles.root}>
        {/* Sibling backdrop so flex children do not swallow outside taps. */}
        <Pressable
          style={styles.backdropTap}
          onPress={handleClose}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('home.quickConfirmClose')}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.keyboardWrap,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          pointerEvents="box-none">
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.headerRow}>
              <Text style={styles.eyebrow}>{t('home.quickConfirmTitle')}</Text>
              <Pressable
                onPress={handleClose}
                disabled={busy}
                hitSlop={12}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('home.quickConfirmClose')}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.label}>{label}</Text>
            {habit.isAnt ? (
              <View style={styles.antBadge}>
                <Text style={styles.antBadgeText}>{t('home.quickAntBadge')}</Text>
              </View>
            ) : null}

            {editing ? (
              <>
                <Text style={styles.fieldLabel}>{t('home.quickConfirmAmount')}</Text>
                <TextInput
                  value={amountText}
                  onChangeText={setAmountText}
                  keyboardType="decimal-pad"
                  autoFocus
                  placeholder="0"
                  placeholderTextColor={palette.inkSoft}
                  style={styles.input}
                />
              </>
            ) : (
              <Text style={styles.amount}>{format(habit.amount)}</Text>
            )}

            <Text style={styles.hint}>{t('home.quickConfirmHint')}</Text>

            <View style={styles.actions}>
              {!editing ? (
                <>
                  <Pressable
                    onPress={handleConfirm}
                    disabled={!canConfirm}
                    style={[styles.primaryBtn, !canConfirm && styles.btnDisabled]}>
                    <Text style={styles.primaryText}>{t('home.quickConfirmYes')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      tapFeedback();
                      setEditing(true);
                    }}
                    style={styles.secondaryBtn}>
                    <Text style={styles.secondaryText}>{t('home.quickConfirmChange')}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={handleConfirm}
                    disabled={!canConfirm}
                    style={[styles.primaryBtn, !canConfirm && styles.btnDisabled]}>
                    <Text style={styles.primaryText}>{t('home.quickConfirmSave')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      tapFeedback();
                      setEditing(false);
                      setAmountText(String(habit.amount));
                    }}
                    style={styles.secondaryBtn}>
                    <Text style={styles.secondaryText}>{t('onboard.back')}</Text>
                  </Pressable>
                </>
              )}
              <Pressable
                onPress={() => {
                  tapFeedback();
                  const amt = editing ? parse(amountText) ?? habit.amount : habit.amount;
                  onEditFull(amt > 0 ? amt : habit.amount);
                }}
                style={styles.linkBtn}>
                <Text style={styles.linkText}>{t('home.quickConfirmFull')}</Text>
              </Pressable>
              <Pressable
                onPress={handleClose}
                disabled={busy}
                style={styles.cancelBtn}>
                <Text style={styles.cancelText}>{t('home.quickConfirmClose')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardWrap: {
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    width: '100%',
  },
  sheet: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: palette.border,
  },
  closeBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  eyebrow: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  label: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.ink,
  },
  antBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF4E6',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  antBadgeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: '#B45309',
  },
  amount: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    color: palette.ink,
    marginTop: 4,
  },
  fieldLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: 4,
  },
  input: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    color: palette.ink,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F7FAFC',
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: palette.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  secondaryBtn: {
    backgroundColor: '#F7FAFC',
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  secondaryText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  linkBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  linkText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.accent,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: palette.inkMuted,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
