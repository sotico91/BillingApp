import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Expense } from '@/src/types/expense';

const STORAGE_KEY = 'gastos-hormiga:expenses:v1';

export async function loadExpenses(): Promise<Expense[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Expense[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export async function saveExpenses(expenses: Expense[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}
