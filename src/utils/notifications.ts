import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

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
    content: { title, body },
    trigger: null,
  });
}

export type ReminderCopy = {
  categoryId: string;
  title: string;
  body: string;
};

/**
 * Local daily reminders (not remote push).
 * Safe for free Apple Personal Team — no aps-environment entitlement.
 */
export async function syncCategoryReminders(opts: {
  reminders: ReminderCopy[];
  hour: number;
  minute?: number;
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

  const minute = opts.minute ?? 0;
  let count = 0;

  for (const item of opts.reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: `billing-reminder-${item.categoryId}`,
      content: {
        title: item.title,
        body: item.body,
        data: { categoryId: item.categoryId, type: 'expense-reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: opts.hour,
        minute,
      },
    });
    count += 1;
  }

  return count;
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
