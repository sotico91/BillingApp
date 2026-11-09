import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { formatMonthRange, monthRangeWithStart } from '@/src/utils/financeMath';
import { tapFeedback } from '@/src/utils/selectFeedback';

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/**
 * Picks the day the person's month starts (their pay day). Every "this month"
 * in the app follows it: Home, limits, Plan, the month-end forecast and Ask Rumi.
 */
export function MonthStartDaySheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { settings, updateMonthStartDay } = useSettings();
  const current = settings.monthStartDay ?? 1;
  const [day, setDay] = useState(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setDay(current);
  }, [visible, current]);

  async function save() {
    setSaving(true);
    try {
      await updateMonthStartDay(day);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const preview =
    day === 1
      ? t('monthStart.previewCalendar')
      : t('monthStart.preview', { range: formatMonthRange(monthRangeWithStart(day), language) });

  return (
    <AppModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
        ]}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('monthStart.title')}</Text>
          <Text style={styles.copy}>{t('monthStart.body')}</Text>
          <View style={styles.grid}>
            {DAYS.map((d) => {
              const selected = d === day;
              return (
                <Pressable
                  key={d}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t('monthStart.dayA11y', { day: d })}
                  onPress={() => {
                    tapFeedback();
                    setDay(d);
                  }}
                  style={[styles.day, selected && styles.daySelected]}>
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.preview}>{preview}</Text>
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.secondary}>
              <Text style={styles.secondaryText}>{t('history.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => void save()}
              disabled={saving}
              style={[styles.primary, saving && { opacity: 0.7 }]}>
              <Text style={styles.primaryText}>{saving ? t('add.saving') : t('monthStart.save')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,20,28,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  sheet: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.xl,
    padding: 22,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 24,
    color: palette.ink,
  },
  copy: {
    marginTop: 6,
    marginBottom: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3F6',
  },
  daySelected: { backgroundColor: palette.accent },
  dayText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  dayTextSelected: { color: palette.white },
  preview: {
    marginTop: 14,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  secondary: {
    flex: 1,
    backgroundColor: '#EEF3F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: {
    fontFamily: 'DMSans_600SemiBold',
    color: palette.inkMuted,
  },
  primary: {
    flex: 1.3,
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: 'DMSans_600SemiBold',
    color: palette.white,
  },
});
