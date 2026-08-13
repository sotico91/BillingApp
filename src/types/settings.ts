export type Currency = 'COP' | 'USD';

export type SpendSub = {
  id: string;
  name: string;
  /** Small/recurring “ant” spend the user wants to watch (café, fútbol…). */
  isAnt?: boolean;
};

/** User-defined spend concept with optional subcategories. */
export type SpendConcept = {
  id: string;
  name: string;
  /** Accent color for this concept (and its subs in lists). */
  color: string;
  subs: SpendSub[];
};

/** Local notification rule for one subcategory. */
export type ReminderRule = {
  /** Spend subcategory id to remind about. */
  subId: string;
  hour: number;
  minute: number;
  /**
   * If set (1–28), fires every month on that day.
   * If omitted, fires every day at hour:minute.
   */
  dayOfMonth?: number;
};

/** @deprecated Flat custom concepts — migrated into spendConcepts. */
export type CustomConcept = {
  id: string;
  name: string;
};

export type UserSettings = {
  onboardingDone: boolean;
  /** First-launch coach marks over the main controls. */
  coachMarksDone: boolean;
  /** Stable id for this install / person. Used to attribute expenses. */
  personId: string;
  userName: string;
  currency: Currency;
  /**
   * Legacy toggle list (built-in ids). Kept for reminders/onboarding compat;
   * expense logging uses spendConcepts.
   */
  enabledCategoryIds: string[];
  /** Primary user-owned concept → subcategory tree. */
  spendConcepts: SpendConcept[];
  /** @deprecated Migrated into spendConcepts. */
  customConcepts?: CustomConcept[];
  /** Bumped when settings schema / catalog changes. */
  catalogVersion?: number;
  notifyOnExpense: boolean;
  /** Per-subcategory local reminder schedules. */
  reminderRules: ReminderRule[];
  /** @deprecated Prefer reminderRules.subId list. */
  reminderCategoryIds: string[];
  /** @deprecated */
  reminderCustomConcepts: string[];
  /** Default hour when creating a new rule. */
  reminderHour: number;
  /** Default minute when creating a new rule. */
  reminderMinute: number;
};

export type QuickTemplate = {
  id: string;
  categoryId: string;
  amount: number;
  note?: string;
  updatedAt: string;
};
