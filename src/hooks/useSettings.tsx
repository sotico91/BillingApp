import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  DEFAULT_QUICK_TEMPLATES,
  DEFAULT_SETTINGS,
  loadQuickTemplates,
  loadSettings,
  saveQuickTemplates,
  saveSettings,
} from '@/src/data/settingsStorage';
import type { Currency, QuickTemplate, UserSettings } from '@/src/types/settings';
import {
  clearCategoryReminders,
  ensureNotificationPermission,
  syncCategoryReminders,
} from '@/src/utils/notifications';

type ReminderLabels = Record<string, { title: string; body: string }>;

type SettingsContextValue = {
  settings: UserSettings;
  ready: boolean;
  quickTemplates: QuickTemplate[];
  completeOnboarding: (input: {
    userName: string;
    currency: Currency;
    enabledCategoryIds: string[];
    notifyOnExpense: boolean;
    reminderCategoryIds: string[];
    reminderHour?: number;
    reminderLabels?: ReminderLabels;
  }) => Promise<void>;
  updateUserName: (userName: string) => Promise<void>;
  updateReminders: (input: {
    reminderCategoryIds: string[];
    reminderCustomConcepts?: string[];
    reminderHour?: number;
    reminderLabels: ReminderLabels;
  }) => Promise<void>;
  updateQuickTemplate: (template: Omit<QuickTemplate, 'id' | 'updatedAt'> & { id?: string }) => Promise<void>;
  removeQuickTemplate: (id: string) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [quickTemplates, setQuickTemplates] = useState<QuickTemplate[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [storedSettings, templates] = await Promise.all([
        loadSettings(),
        loadQuickTemplates(),
      ]);
      if (mounted) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...storedSettings,
          reminderCategoryIds:
            storedSettings.reminderCategoryIds ?? DEFAULT_SETTINGS.reminderCategoryIds,
          reminderCustomConcepts:
            storedSettings.reminderCustomConcepts ?? DEFAULT_SETTINGS.reminderCustomConcepts,
          reminderHour: storedSettings.reminderHour ?? DEFAULT_SETTINGS.reminderHour,
        });
        setQuickTemplates(templates);
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const completeOnboarding = useCallback(
    async (input: {
      userName: string;
      currency: Currency;
      enabledCategoryIds: string[];
      notifyOnExpense: boolean;
      reminderCategoryIds: string[];
      reminderHour?: number;
      reminderLabels?: ReminderLabels;
    }) => {
      const needsPermission =
        input.notifyOnExpense || input.reminderCategoryIds.length > 0;
      if (needsPermission) {
        await ensureNotificationPermission();
      }

      const reminderHour = input.reminderHour ?? 20;
      const next: UserSettings = {
        onboardingDone: true,
        personId: settings.personId || createId(),
        userName: input.userName.trim(),
        currency: input.currency,
        enabledCategoryIds: input.enabledCategoryIds,
        notifyOnExpense: input.notifyOnExpense,
        reminderCategoryIds: input.reminderCategoryIds,
        reminderCustomConcepts: [],
        reminderHour,
      };
      const seeded = DEFAULT_QUICK_TEMPLATES.filter((tpl) =>
        input.enabledCategoryIds.includes(tpl.categoryId)
      );
      setSettings(next);
      setQuickTemplates(seeded);
      await Promise.all([saveSettings(next), saveQuickTemplates(seeded)]);

      if (input.reminderCategoryIds.length > 0 && input.reminderLabels) {
        await syncCategoryReminders({
          hour: reminderHour,
          reminders: input.reminderCategoryIds.map((categoryId) => ({
            categoryId,
            title: input.reminderLabels![categoryId]?.title ?? 'BillingApp',
            body: input.reminderLabels![categoryId]?.body ?? '',
          })),
        });
      } else {
        await clearCategoryReminders();
      }
    },
    [settings.personId]
  );

  const updateUserName = useCallback(async (userName: string) => {
    const next: UserSettings = {
      ...settings,
      userName: userName.trim(),
    };
    setSettings(next);
    await saveSettings(next);
  }, [settings]);

  const updateReminders = useCallback(
    async (input: {
      reminderCategoryIds: string[];
      reminderCustomConcepts?: string[];
      reminderHour?: number;
      reminderLabels: ReminderLabels;
    }) => {
      const reminderHour = input.reminderHour ?? settings.reminderHour;
      const reminderCustomConcepts = input.reminderCustomConcepts ?? [];
      const scheduleIds = Object.keys(input.reminderLabels);
      if (scheduleIds.length > 0) {
        await ensureNotificationPermission();
      }
      const next: UserSettings = {
        ...settings,
        reminderCategoryIds: input.reminderCategoryIds,
        reminderCustomConcepts,
        reminderHour,
      };
      setSettings(next);
      await saveSettings(next);

      if (scheduleIds.length === 0) {
        await clearCategoryReminders();
        return;
      }

      await syncCategoryReminders({
        hour: reminderHour,
        reminders: scheduleIds.map((categoryId) => ({
          categoryId,
          title: input.reminderLabels[categoryId]?.title ?? 'BillingApp',
          body: input.reminderLabels[categoryId]?.body ?? '',
        })),
      });
    },
    [settings]
  );

  const updateQuickTemplate = useCallback(
    async (template: Omit<QuickTemplate, 'id' | 'updatedAt'> & { id?: string }) => {
      const now = new Date().toISOString();
      const withoutCategory = quickTemplates.filter((t) => t.categoryId !== template.categoryId);
      const next: QuickTemplate[] = [
        {
          id: template.id ?? createId(),
          categoryId: template.categoryId,
          amount: template.amount,
          note: template.note,
          updatedAt: now,
        },
        ...withoutCategory,
      ].slice(0, 8);

      setQuickTemplates(next);
      await saveQuickTemplates(next);
    },
    [quickTemplates]
  );

  const removeQuickTemplate = useCallback(
    async (id: string) => {
      const next = quickTemplates.filter((t) => t.id !== id);
      setQuickTemplates(next);
      await saveQuickTemplates(next);
    },
    [quickTemplates]
  );

  const value = useMemo(
    () => ({
      settings,
      ready,
      quickTemplates,
      completeOnboarding,
      updateUserName,
      updateReminders,
      updateQuickTemplate,
      removeQuickTemplate,
    }),
    [
      settings,
      ready,
      quickTemplates,
      completeOnboarding,
      updateUserName,
      updateReminders,
      updateQuickTemplate,
      removeQuickTemplate,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
