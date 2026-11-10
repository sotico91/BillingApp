import { useMemo, useState, type ReactNode } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useLanguage } from "@/src/i18n/LanguageContext";
import { colors } from "@/src/theme";
import { palette } from "@/src/theme/colors";
import { tapFeedback } from "@/src/utils/selectFeedback";

/** Coral dark enough for AA on the soft coral chip. */
const PAST_INK = colors.action.primaryPressed;

/** How far back the day list goes. */
const DAYS_BACK = 60;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole days from `date` back to `now` (0 = today). */
export function daysAgoOf(date: Date, now = new Date()): number {
  const ms = startOfDay(now).getTime() - startOfDay(date).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** `day`'s date with `keep`'s time of day, so sorting within a day stays put. */
export function onDayKeepingTime(day: Date, keep: Date): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    keep.getHours(),
    keep.getMinutes(),
    keep.getSeconds(),
    keep.getMilliseconds(),
  );
}

/**
 * The day a movement happened. Shows "Hoy ▾"; a tap opens a row of days
 * (Hoy, Ayer, then back two months). Nobody has to touch it to log today.
 */
export function SpendDateChip({
  daysAgo,
  onChange,
  testID = "spend-date",
  leading,
}: {
  daysAgo: number;
  onChange: (daysAgo: number) => void;
  testID?: string;
  /** Shown on the left of the chip, on the same line (a section title), so the chip adds no height. */
  leading?: ReactNode;
}) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const locale = language === "es" ? "es-CO" : "en-US";

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: DAYS_BACK + 1 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return d;
    });
  }, []);

  const short = (i: number) => {
    if (i === 0) return t("date.today");
    if (i === 1) return t("date.yesterday");
    return days[i]
      .toLocaleDateString(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
      .replace(/\./g, "");
  };

  const long = (i: number) => {
    if (i === 0) return t("date.today");
    const day = days[Math.min(i, DAYS_BACK)].toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const cap = day.charAt(0).toLocaleUpperCase() + day.slice(1);
    return i === 1 ? t("quick.dateYesterday", { date: day }) : cap;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.line}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <Pressable
          testID={testID}
          onPress={() => {
            tapFeedback();
            setOpen((o) => !o);
          }}
          accessibilityRole="button"
          accessibilityLabel={t("date.a11y", { date: long(daysAgo) })}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => [
            styles.chip,
            daysAgo > 0 && styles.chipPast,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            name="calendar-blank-outline"
            size={16}
            color={daysAgo > 0 ? PAST_INK : palette.inkMuted}
          />
          <Text style={[styles.chipText, daysAgo > 0 && styles.chipTextPast]}>
            {long(daysAgo)}
          </Text>
          <MaterialCommunityIcons
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={daysAgo > 0 ? PAST_INK : palette.inkMuted}
          />
        </Pressable>
      </View>
      {open ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.days}
        >
          {days.map((_, i) => {
            const selected = i === daysAgo;
            return (
              <Pressable
                key={i}
                testID={`${testID}-${i}`}
                onPress={() => {
                  tapFeedback();
                  onChange(i);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.day, selected && styles.daySelected]}
              >
                <Text
                  style={[styles.dayText, selected && styles.dayTextSelected]}
                >
                  {short(i)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  leading: { flex: 1 },
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#EEF3F6",
  },
  chipPast: { backgroundColor: palette.accentSoft },
  pressed: { opacity: 0.75 },
  chipText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: palette.inkMuted,
  },
  chipTextPast: { color: PAST_INK },
  days: { gap: 6, paddingRight: 8 },
  day: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceSolid,
  },
  daySelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  dayText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: palette.ink,
  },
  dayTextSelected: { color: palette.white },
});
