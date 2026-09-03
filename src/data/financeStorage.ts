import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_BUDGETS,
  DEFAULT_DEBTS,
  DEFAULT_SUBSCRIPTIONS,
} from '@/src/data/financeDefaults';
import { mergeDefaultAccounts, settleLiquidOverdrafts } from '@/src/utils/accounts';
import type {
  Account,
  Budget,
  Debt,
  Expense,
  Subscription,
  Transaction,
} from '@/src/types/finance';

const TX_KEY = 'billing-app:transactions:v2';
const ACCOUNTS_KEY = 'billing-app:accounts:v2';
const BUDGETS_KEY = 'billing-app:budgets:v2';
const DEBTS_KEY = 'billing-app:debts:v2';
const SUBS_KEY = 'billing-app:subscriptions:v2';
const LEGACY_EXPENSES = 'gastos-hormiga:expenses:v1';

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadTransactions(): Promise<Transaction[]> {
  const existing = await loadJson<Transaction[] | null>(TX_KEY, null);
  if (existing && Array.isArray(existing)) {
    return existing.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const legacy = await loadJson<Expense[]>(LEGACY_EXPENSES, []);
  const migrated: Transaction[] = legacy.map((e) => ({
    id: e.id,
    type: 'expense' as const,
    amount: e.amount,
    categoryId: e.categoryId,
    paymentMethod: 'cash' as const,
    accountId: 'cash',
    note: e.note,
    createdAt: e.createdAt,
  }));
  await AsyncStorage.setItem(TX_KEY, JSON.stringify(migrated));
  return migrated;
}

export async function saveTransactions(items: Transaction[]): Promise<void> {
  await AsyncStorage.setItem(TX_KEY, JSON.stringify(items));
}

export async function loadAccounts(): Promise<Account[]> {
  const stored = await loadJson<Account[] | null>(ACCOUNTS_KEY, null);
  const { accounts, changed } = mergeDefaultAccounts(stored);
  const settled = settleLiquidOverdrafts(accounts);
  if (changed || settled.changed) {
    await saveAccounts(settled.accounts);
  }
  return settled.accounts;
}

export async function saveAccounts(items: Account[]): Promise<void> {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(items));
}

export async function loadBudgets(): Promise<Budget[]> {
  const stored = await loadJson<Budget[] | null>(BUDGETS_KEY, null);
  if (!stored || !Array.isArray(stored)) return [...DEFAULT_BUDGETS];
  return stored;
}

export async function saveBudgets(items: Budget[]): Promise<void> {
  await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(items));
}

export async function loadDebts(): Promise<Debt[]> {
  const stored = await loadJson<Debt[] | null>(DEBTS_KEY, null);
  if (!stored || !Array.isArray(stored)) return [...DEFAULT_DEBTS];
  return stored.map((d) => {
    if (d.nameKey) return d;
    if (d.id === 'debt-card') return { ...d, nameKey: 'debt.mainCard', name: undefined };
    return d;
  });
}

export async function saveDebts(items: Debt[]): Promise<void> {
  await AsyncStorage.setItem(DEBTS_KEY, JSON.stringify(items));
}

export async function loadSubscriptions(): Promise<Subscription[]> {
  const stored = await loadJson<Subscription[] | null>(SUBS_KEY, null);
  if (!stored || !Array.isArray(stored)) return [...DEFAULT_SUBSCRIPTIONS];
  return stored.map((s) => {
    if (s.nameKey) return s;
    if (s.id === 'sub-gym') return { ...s, nameKey: 'sub.gym', name: undefined };
    if (s.id === 'sub-stream') return { ...s, nameKey: 'sub.streaming', name: undefined };
    return s;
  });
}

export async function saveSubscriptions(items: Subscription[]): Promise<void> {
  await AsyncStorage.setItem(SUBS_KEY, JSON.stringify(items));
}
