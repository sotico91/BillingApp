import type { Account, Budget, Category, Debt, Subscription } from '@/src/types/finance';

export const CATEGORIES: Category[] = [
  { id: 'cafe', color: '#A56B45', isAnt: true, budgetGroup: 'food' },
  { id: 'delivery', color: '#FF6B4A', isAnt: true, budgetGroup: 'food' },
  { id: 'snacks', color: '#F4C95D', isAnt: true, budgetGroup: 'food' },
  { id: 'alimentacion', color: '#E07A5F', budgetGroup: 'food' },
  { id: 'transporte', color: '#2EC4B6', budgetGroup: 'transport' },
  { id: 'entretenimiento', color: '#9B5DE5', budgetGroup: 'entertainment' },
  { id: 'compras', color: '#00BBF9', budgetGroup: 'shopping' },
  { id: 'vivienda', color: '#3E6B8A', budgetGroup: 'housing' },
  { id: 'suscripciones', color: '#F15BB5', isAnt: true, budgetGroup: 'other' },
  { id: 'salud', color: '#00F5D4', budgetGroup: 'other' },
  { id: 'ingresos', color: '#2A9D8F', budgetGroup: 'income' },
  { id: 'otros', color: '#7A8790', isAnt: true, budgetGroup: 'other' },
];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'cash', nameKey: 'account.cash', type: 'cash', balance: 200000 },
  { id: 'bank-main', nameKey: 'account.bankMain', type: 'bank', balance: 2500000 },
  { id: 'credit-card', nameKey: 'account.creditCard', type: 'credit', balance: -850000 },
  { id: 'savings', nameKey: 'account.savings', type: 'savings', balance: 1200000 },
  { id: 'investments', nameKey: 'account.investments', type: 'investment', balance: 3000000 },
];

export const DEFAULT_BUDGETS: Budget[] = [
  { id: 'b-cafe', categoryId: 'cafe', limit: 120000 },
  { id: 'b-delivery', categoryId: 'delivery', limit: 250000 },
  { id: 'b-snacks', categoryId: 'snacks', limit: 80000 },
  { id: 'b-food', categoryId: 'alimentacion', limit: 800000 },
  { id: 'b-transport', categoryId: 'transporte', limit: 300000 },
  { id: 'b-fun', categoryId: 'entretenimiento', limit: 250000 },
  { id: 'b-shop', categoryId: 'compras', limit: 400000 },
  { id: 'b-home', categoryId: 'vivienda', limit: 1500000 },
  { id: 'b-subs', categoryId: 'suscripciones', limit: 200000 },
  { id: 'b-other', categoryId: 'otros', limit: 200000 },
];

export const DEFAULT_DEBTS: Debt[] = [
  {
    id: 'debt-card',
    nameKey: 'debt.mainCard',
    balance: 850000,
    installment: 220000,
    interestRate: 28.5,
    termMonths: 12,
    nextPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
    paidCapital: 150000,
    paidInterest: 80000,
    otherCharges: 15000,
  },
];

export const DEFAULT_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-stream',
    nameKey: 'sub.streaming',
    amount: 27900,
    categoryId: 'suscripciones',
    frequency: 'monthly',
    active: true,
  },
  {
    id: 'sub-gym',
    nameKey: 'sub.gym',
    amount: 120000,
    categoryId: 'suscripciones',
    frequency: 'monthly',
    active: true,
  },
];

export function getCategoryById(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function getAntCategoryIds(): string[] {
  return CATEGORIES.filter((c) => c.isAnt).map((c) => c.id);
}
