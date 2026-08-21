import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import type { ReminderRule } from '@/src/types/settings';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isReminder = notification.request.content.data?.type === 'expense-reminder';
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      // Only reminder alerts bump the home-screen icon badge.
      shouldSetBadge: isReminder,
    };
  },
});

const ANDROID_CHANNEL_ID = 'billing-alerts';
/** Dedicated channel so badge + importance apply on devices that already had the old channel. */
const ANDROID_REMINDER_CHANNEL_ID = 'billing-reminders';

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  // Omit `sound` so Android uses the system default.
  // Passing sound: 'default' is treated as a custom file name and LogBox-errors.
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'BillingApp',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B3A4B',
    showBadge: true,
  });
  await Notifications.setNotificationChannelAsync(ANDROID_REMINDER_CHANNEL_ID, {
    name: 'BillingApp reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B3A4B',
    showBadge: true,
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  await ensureAndroidChannels();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return requested.granted;
}

/** Clears the app-icon badge (iOS number / Android launcher badge when supported). */
export async function clearAppBadge(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    /* launcher may not support badges */
  }
}

/**
 * Call once from root layout: clear badge when the user opens or returns to the app.
 */
export function startBadgeClearOnActive(): () => void {
  if (Platform.OS === 'web') return () => undefined;

  void clearAppBadge();

  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') void clearAppBadge();
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener(() => {
    void clearAppBadge();
  });

  return () => {
    sub.remove();
    responseSub.remove();
  };
}

let lastExpenseNotify: { key: string; at: number } | null = null;
const EXPENSE_NOTIFY_ID = 'billing-expense-confirm';

export async function notifyExpenseRegistered(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const key = `${title}\n${body}`;
  const now = Date.now();
  // Guard against double-taps / remounts stacking the same confirm dozens of times.
  if (
    lastExpenseNotify &&
    lastExpenseNotify.key === key &&
    now - lastExpenseNotify.at < 4000
  ) {
    return;
  }
  lastExpenseNotify = { key, at: now };

  const content = {
    title,
    body,
    data: { type: 'expense-registered' as const },
    ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null),
  };

  // Same identifier replaces a prior confirm instead of stacking duplicates.
  try {
    await Notifications.dismissNotificationAsync(EXPENSE_NOTIFY_ID);
  } catch {
    /* nothing to dismiss */
  }

  await Notifications.scheduleNotificationAsync({
    identifier: EXPENSE_NOTIFY_ID,
    content,
    trigger: null,
  });
}

export type ReminderCopy = {
  categoryId: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
  /** 1–28 for monthly; omit for daily. */
  dayOfMonth?: number;
};

/**
 * Local reminders (not remote push).
 * Safe for free Apple Personal Team — no aps-environment entitlement.
 * Supports daily or monthly (day-of-month) schedules per subcategory.
 * Sets app-icon badge when the reminder fires (cleared when the app is opened).
 */
export async function syncCategoryReminders(opts: {
  reminders: ReminderCopy[];
}): Promise<number> {
  if (Platform.OS === 'web') return 0;

  const granted = await ensureNotificationPermission();
  if (!granted) return 0;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith('billing-reminder-'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  let count = 0;

  for (const item of opts.reminders) {
    const day = item.dayOfMonth;
    const trigger: Notifications.NotificationTriggerInput =
      day != null && day >= 1 && day <= 28
        ? {
            type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
            day,
            hour: item.hour,
            minute: item.minute,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: item.hour,
            minute: item.minute,
          };

    await Notifications.scheduleNotificationAsync({
      identifier: `billing-reminder-${item.categoryId}`,
      content: {
        title: item.title,
        body: item.body,
        // Show “1” (or refresh) on the home-screen icon when the reminder fires.
        badge: 1,
        data: {
          categoryId: item.categoryId,
          type: 'expense-reminder',
          dayOfMonth: day ?? null,
        },
        // iOS: system default sound. Android: channel controls sound (no custom file).
        ...(Platform.OS === 'ios' ? { sound: true } : null),
        ...(Platform.OS === 'android' ? { channelId: ANDROID_REMINDER_CHANNEL_ID } : null),
      },
      trigger,
    });
    count += 1;
  }

  return count;
}

/** @deprecated Prefer syncCategoryReminders with per-item hour/minute. */
export async function syncRemindersFromRules(
  rules: ReminderRule[],
  labels: Record<string, { title: string; body: string }>
): Promise<number> {
  return syncCategoryReminders({
    reminders: rules.map((rule) => ({
      categoryId: rule.subId,
      title: labels[rule.subId]?.title ?? 'BillingApp',
      body: labels[rule.subId]?.body ?? '',
      hour: rule.hour,
      minute: rule.minute,
      dayOfMonth: rule.dayOfMonth,
    })),
  });
}

export async function clearCategoryReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith('billing-reminder-'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

/** Cancel reminders whose subcategory is no longer allowed. */
export async function cancelRemindersExcept(allowedCategoryIds: Set<string>): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith('billing-reminder-'))
      .filter((n) => {
        const categoryId = n.identifier.replace(/^billing-reminder-/, '');
        return !allowedCategoryIds.has(categoryId);
      })
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}
