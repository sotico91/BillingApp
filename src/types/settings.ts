export type Currency = 'COP' | 'USD';

export type UserSettings = {
  onboardingDone: boolean;
  /** Stable id for this install / person. Used to attribute expenses. */
  personId: string;
  userName: string;
  currency: Currency;
  enabledCategoryIds: string[];
  notifyOnExpense: boolean;
  /** Categories that get a daily local reminder. */
  reminderCategoryIds: string[];
  /** Custom concept names when “Otros” is used (e.g. recibos). */
  reminderCustomConcepts: string[];
  /** Local hour (0-23) for daily reminders. */
  reminderHour: number;
};

export type QuickTemplate = {
  id: string;
  categoryId: string;
  amount: number;
  note?: string;
  updatedAt: string;
};
