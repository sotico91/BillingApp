import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { ReminderRule } from '@/src/types/settings';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL_ID = 'billing-alerts';

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  // Omit `sound` so Android uses the system default.
  // Passing sound: 'default' is treated as a custom file name and LogBox-errors.
  // Channel id bumped so devices that already created the old channel pick this up.
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'BillingApp',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B3A4B',
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function notifyExpenseRegistered(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null),
    },
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
        data: {
          categoryId: item.categoryId,
          type: 'expense-reminder',
          dayOfMonth: day ?? null,
        },
        // iOS: system default sound. Android: channel controls sound (no custom file).
        ...(Platform.OS === 'ios' ? { sound: true } : null),
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null),
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
