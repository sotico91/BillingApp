import type {
  Account,
  Budget,
  Category,
  CategoryKind,
  Debt,
  Subscription,
} from '@/src/types/finance';

export const CATEGORIES: Category[] = [
  { id: 'cafe', kind: 'expense', color: '#A56B45', isAnt: true, budgetGroup: 'food' },
  { id: 'delivery', kind: 'expense', color: '#FF6B4A', isAnt: true, budgetGroup: 'food' },
  { id: 'snacks', kind: 'expense', color: '#F4C95D', isAnt: true, budgetGroup: 'food' },
  { id: 'alimentacion', kind: 'expense', color: '#E07A5F', budgetGroup: 'food' },
  { id: 'transporte', kind: 'expense', color: '#2EC4B6', budgetGroup: 'transport' },
  { id: 'gasolina', kind: 'expense', color: '#F18F01', budgetGroup: 'transport' },
  { id: 'entretenimiento', kind: 'expense', color: '#9B5DE5', budgetGroup: 'entertainment' },
  { id: 'cine', kind: 'expense', color: '#C77DFF', budgetGroup: 'entertainment' },
  { id: 'compras', kind: 'expense', color: '#00BBF9', budgetGroup: 'shopping' },
  { id: 'vivienda', kind: 'expense', color: '#3E6B8A', budgetGroup: 'housing' },
  { id: 'luz', kind: 'expense', color: '#FFD166', budgetGroup: 'utilities' },
  { id: 'agua', kind: 'expense', color: '#4CC9F0', budgetGroup: 'utilities' },
  { id: 'gas', kind: 'expense', color: '#FF9F1C', budgetGroup: 'utilities' },
  { id: 'internet', kind: 'expense', color: '#4361EE', budgetGroup: 'utilities' },
  { id: 'telefonia', kind: 'expense', color: '#3A0CA3', budgetGroup: 'utilities' },
  { id: 'suscripciones', kind: 'expense', color: '#F15BB5', isAnt: true, budgetGroup: 'other' },
  { id: 'salud', kind: 'expense', color: '#00F5D4', budgetGroup: 'other' },
  { id: 'educacion', kind: 'expense', color: '#06D6A0', budgetGroup: 'other' },
  { id: 'otros', kind: 'expense', color: '#7A8790', isAnt: true, budgetGroup: 'other' },
  { id: 'salario', kind: 'income', color: '#2A9D8F', budgetGroup: 'income' },
  { id: 'freelance', kind: 'income', color: '#1B9AAA', budgetGroup: 'income' },
  { id: 'bonos', kind: 'income', color: '#3DDC97', budgetGroup: 'income' },
  { id: 'reembolsos', kind: 'income', color: '#6BCB77', budgetGroup: 'income' },
  /** Legacy catch-all income label kept for older transactions. */
  { id: 'ingresos', kind: 'income', color: '#2A9D8F', budgetGroup: 'income' },
];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'cash', nameKey: 'account.cash', type: 'cash', balance: 0 },
  { id: 'bank-main', nameKey: 'account.bankMain', type: 'bank', balance: 0 },
  { id: 'credit-card', nameKey: 'account.creditCard', type: 'credit', balance: 0 },
  { id: 'savings', nameKey: 'account.savings', type: 'savings', balance: 0 },
  { id: 'investments', nameKey: 'account.investments', type: 'investment', balance: 0 },
];

/** No seeded limits — user sets topes only for concepts they care about. */
export const DEFAULT_BUDGETS: Budget[] = [];

/** Start empty — user adds real debts. */
export const DEFAULT_DEBTS: Debt[] = [];

/** Start empty — user adds real subscriptions (streaming, gym, etc.). */
export const DEFAULT_SUBSCRIPTIONS: Subscription[] = [];

export function getCategoryById(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES.find((c) => c.id === 'otros')!;
}

export function getAntCategoryIds(): string[] {
  return CATEGORIES.filter((c) => c.isAnt).map((c) => c.id);
}

export function isIncomeCategory(category: Category): boolean {
  return category.kind === 'income';
}

export function expenseCategories(): Category[] {
  return CATEGORIES.filter((c) => c.kind === 'expense');
}

export function incomeCategories(): Category[] {
  return CATEGORIES.filter((c) => c.kind === 'income');
}

const CUSTOM_COLORS = ['#7A8790', '#5C6B73', '#8D99AE', '#6C757D', '#495057'];

/** Turn user-defined concepts into Category rows for pickers. */
export function customConceptsAsCategories(
  customs: { id: string; name: string }[]
): Category[] {
  return customs.map((c, index) => ({
    id: c.id,
    kind: 'expense' as const,
    color: CUSTOM_COLORS[index % CUSTOM_COLORS.length],
    isAnt: true,
    budgetGroup: 'custom',
  }));
}

/** Categories shown when logging a spend or an earn. */
export function categoriesForKind(
  kind: CategoryKind,
  enabledIds: string[],
  customs: { id: string; name: string }[] = []
): Category[] {
  if (kind === 'income') {
    return incomeCategories();
  }
  const builtIn = expenseCategories().filter((c) => enabledIds.includes(c.id));
  const custom = customConceptsAsCategories(customs).filter((c) =>
    enabledIds.includes(c.id)
  );
  return [...builtIn, ...custom];
}

export function defaultCategoryIdForKind(
  kind: CategoryKind,
  enabledIds: string[],
  customs: { id: string; name: string }[] = []
): string {
  const list = categoriesForKind(kind, enabledIds, customs);
  if (kind === 'income') {
    return list.find((c) => c.id === 'salario')?.id ?? list[0]?.id ?? 'ingresos';
  }
  return list[0]?.id ?? 'otros';
}

export function slugConceptId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `custom-${slug || 'concepto'}`;
}
