import AsyncStorage from '@react-native-async-storage/async-storage';

import { CATEGORIES } from '@/src/data/financeDefaults';
import type { QuickTemplate, UserSettings } from '@/src/types/settings';

const SETTINGS_KEY = 'billing-app:settings:v1';
const QUICK_KEY = 'billing-app:quick-templates:v1';

function createPersonId(): string {
  return `person-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const DEFAULT_SETTINGS: UserSettings = {
  onboardingDone: false,
  personId: '',
  userName: '',
  currency: 'COP',
  enabledCategoryIds: CATEGORIES.filter((c) => c.id !== 'ingresos').map((c) => c.id),
  notifyOnExpense: true,
  reminderCategoryIds: ['cafe', 'delivery', 'transporte'],
  reminderCustomConcepts: [],
  reminderHour: 20,
};

/** Seed one-tap chips so Home feels ready from day one. */
export const DEFAULT_QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'quick-cafe',
    categoryId: 'cafe',
    amount: 8000,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quick-delivery',
    categoryId: 'delivery',
    amount: 35000,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quick-transporte',
    categoryId: 'transporte',
    amount: 12000,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quick-snacks',
    categoryId: 'snacks',
    amount: 5000,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export async function loadSettings(): Promise<UserSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  let settings: UserSettings;
  if (!raw) {
    settings = { ...DEFAULT_SETTINGS, personId: createPersonId() };
    await saveSettings(settings);
    return settings;
  }
  try {
    settings = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as UserSettings) };
  } catch {
    settings = { ...DEFAULT_SETTINGS, personId: createPersonId() };
    await saveSettings(settings);
    return settings;
  }
  if (!settings.personId) {
    settings = { ...settings, personId: createPersonId() };
    await saveSettings(settings);
  }
  return settings;
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadQuickTemplates(): Promise<QuickTemplate[]> {
  const raw = await AsyncStorage.getItem(QUICK_KEY);
  if (!raw) return [...DEFAULT_QUICK_TEMPLATES];
  try {
    const parsed = JSON.parse(raw) as QuickTemplate[];
    return Array.isArray(parsed) ? parsed : [...DEFAULT_QUICK_TEMPLATES];
  } catch {
    return [...DEFAULT_QUICK_TEMPLATES];
  }
}

export async function saveQuickTemplates(templates: QuickTemplate[]): Promise<void> {
  await AsyncStorage.setItem(QUICK_KEY, JSON.stringify(templates));
}
