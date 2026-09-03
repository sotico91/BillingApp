import type { Currency } from '@/src/types/settings';

export type Period = 'hoy' | 'semana' | 'mes';

export type TransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'debt_payment'
  | 'investment'
  | 'withdrawal';

export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'transfer';

export type AccountType =
  | 'bank'
  | 'cash'
  | 'credit'
  | 'savings'
  | 'wallet'
  | 'investment'
  | 'other';

export type CategoryKind = 'expense' | 'income';

export type Category = {
  id: string;
  color: string;
  /** Expense categories for spends; income categories for earnings. */
  kind: CategoryKind;
  isAnt?: boolean;
  budgetGroup?: string;
};

export type Account = {
  id: string;
  nameKey: string;
  type: AccountType;
  balance: number;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  accountId?: string;
  toAccountId?: string;
  /** Linked debt when type is debt_payment. */
  debtId?: string;
  note?: string;
  createdAt: string;
  isRecurring?: boolean;
  /** Who logged this movement (singular person). Immutable after create. */
  registeredById?: string;
  registeredByName?: string;
};

/** Activity / totals scope when a household may share a ledger. */
export type PersonScope = 'mine' | 'all';

/** Legacy expense shape kept for migration */
export type Expense = {
  id: string;
  amount: number;
  categoryId: string;
  note?: string;
  createdAt: string;
};

export type Budget = {
  id: string;
  categoryId: string;
  limit: number;
};

export type Debt = {
  id: string;
  /** Custom label; used when nameKey is absent. */
  name?: string;
  nameKey?: string;
  balance: number;
  installment: number;
  interestRate: number;
  termMonths: number;
  nextPaymentDate: string;
  paidCapital: number;
  paidInterest: number;
  otherCharges: number;
  /** Linked spend subcategory (permanent cuota). */
  categoryId?: string;
  /** Monthly installment treated as permanent expense. */
  isPermanent?: boolean;
};

export type Subscription = {
  id: string;
  /** Custom label; used when nameKey is absent. */
  name?: string;
  nameKey?: string;
  amount: number;
  categoryId: string;
  frequency: 'monthly' | 'yearly';
  active: boolean;
};

export type NetWorthSnapshot = {
  id: string;
  date: string;
  assets: number;
  liabilities: number;
  netWorth: number;
};

export type SmartInsight = {
  id: string;
  tone: 'warn' | 'good' | 'info';
  messageKey: string;
  params?: Record<string, string | number>;
};

export type FinanceState = {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  debts: Debt[];
  subscriptions: Subscription[];
  currency: Currency;
};
