import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { Button, sheetStyles } from '@/src/components/ui';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { colors, radius } from '@/src/theme';
import {
  dayStart,
  formatDayRange,
  monthGrid,
  pickDay,
  presetRange,
  sameDay,
  type DayRange,
  type RangePreset,
} from '@/src/utils/dateRange';
import { tapFeedback } from '@/src/utils/selectFeedback';

type Props = {
  visible: boolean;
  /** The range in use, shown selected when the sheet opens. */
  value: DayRange | null;
  onClose: () => void;
  onApply: (range: DayRange) => void;
};

const PRESETS: RangePreset[] = ['last7', 'last30', 'thisYear'];
const WEEKDAYS: Record<'es' | 'en', string[]> = {
  es: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
};

/**
 * Pick any span of days for Activity: tap the first day, then the last.
 * Future days can't be picked; presets cover the common spans.
 */
export function DateRangeSheet({ visible, value, onClose, onApply }: Props) {
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const today = dayStart(new Date());
  const [sel, setSel] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  });
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  useEffect(() => {
    if (!visible) return;
    setSel(value ? { from: value.from, to: value.to } : { from: null, to: null });
    const show = value?.to ?? today;
    setCursor({ year: show.getFullYear(), month: show.getMonth() });
    // Reset only when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const locale = language === 'es' ? 'es-CO' : 'en-US';
  const monthTitle = new Date(cursor.year, cursor.month, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
  const atCurrentMonth =
    cursor.year === today.getFullYear() && cursor.month === today.getMonth();

  // One tapped day is a one-day range.
  const ready: DayRange | null = sel.from ? { from: sel.from, to: sel.to ?? sel.from } : null;

  function shift(delta: number) {
    tapFeedback();
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function inRange(d: Date): boolean {
    if (!ready) return false;
    const x = d.getTime();
    return x >= ready.from.getTime() && x <= ready.to.getTime();
  }

  function apply(range: DayRange) {
    tapFeedback();
    onApply(range);
  }

  return (
    <AppModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('range.close')}
        />
        <View
          style={[sheetStyles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onStartShouldSetResponder={() => true}>
          <View style={sheetStyles.grabber} />
          <View style={sheetStyles.headerRow}>
            <Text style={sheetStyles.title} accessibilityRole="header">
              {t('range.title')}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={sheetStyles.close}
              accessibilityRole="button"
              accessibilityLabel={t('range.close')}>
              <Text style={sheetStyles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <Pressable
                key={p}
                testID={`range-${p}`}
                onPress={() => apply(presetRange(p))}
                accessibilityRole="button"
                style={({ pressed }) => [styles.preset, pressed && styles.pressed]}>
                <Text style={styles.presetText}>{t(`range.${p}` as TranslationKey)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.hint}>{t('range.hint')}</Text>

          <View style={styles.monthRow}>
            <Pressable
              onPress={() => shift(-1)}
              hitSlop={10}
              style={styles.navBtn}
              accessibilityRole="button"
              accessibilityLabel={t('history.prevMonth')}>
              <Text style={styles.navText}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>
              {monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1)}
            </Text>
            <Pressable
              onPress={() => shift(1)}
              disabled={atCurrentMonth}
              hitSlop={10}
              style={[styles.navBtn, atCurrentMonth && styles.navDisabled]}
              accessibilityRole="button"
              accessibilityLabel={t('history.nextMonth')}>
              <Text style={styles.navText}>›</Text>
            </Pressable>
          </View>

          <View style={styles.week}>
            {WEEKDAYS[language].map((w, i) => (
              <Text key={i} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.week}>
              {week.map((d, di) => {
                if (!d) return <View key={di} style={styles.cell} />;
                const future = d.getTime() > today.getTime();
                const edge =
                  (sel.from && sameDay(d, sel.from)) || (sel.to && sameDay(d, sel.to));
                const inside = inRange(d);
                return (
                  <Pressable
                    key={di}
                    disabled={future}
                    onPress={() => {
                      tapFeedback();
                      setSel((s) => pickDay(s, d));
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: !!edge, disabled: future }}
                    accessibilityLabel={d.toLocaleDateString(locale, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                    style={[styles.cell, inside && styles.cellIn]}>
                    <View style={[styles.dayDot, edge && styles.dayEdge]}>
                      <Text
                        style={[
                          styles.dayText,
                          future && styles.dayFuture,
                          edge && styles.dayEdgeText,
                        ]}>
                        {d.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <Button
            label={
              ready
                ? t('range.apply', { range: formatDayRange(ready, language) })
                : t('range.pickFirst')
            }
            disabled={!ready}
            onPress={() => ready && apply(ready)}
            fullWidth
            style={styles.applyBtn}
          />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.bg.scrim,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  preset: {
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.bg.surfaceMuted,
  },
  presetText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: colors.text.primary,
  },
  pressed: { opacity: 0.7 },
  hint: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 14,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: { opacity: 0.3 },
  navText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 24,
    color: colors.text.primary,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: colors.text.primary,
  },
  week: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: colors.text.tertiary,
    paddingVertical: 4,
  },
  cell: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellIn: { backgroundColor: colors.accent.tealSoft },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayEdge: { backgroundColor: colors.bg.brand },
  dayText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: colors.text.primary,
  },
  dayEdgeText: { color: colors.text.onBrand, fontFamily: 'DMSans_700Bold' },
  dayFuture: { color: colors.text.tertiary, opacity: 0.45 },
  applyBtn: { marginTop: 14 },
});
