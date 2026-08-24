import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  DEFAULT_ACCOUNTS,
  DEFAULT_SUBSCRIPTIONS,
  getCategoryById,
} from '@/src/data/financeDefaults';
import { findSpendSub, resolveConceptColor } from '@/src/data/spendConcepts';
import {
  loadAccounts,
  loadBudgets,
  loadDebts,
  loadSubscriptions,
  loadTransactions,
  saveAccounts,
  saveBudgets,
  saveDebts,
  saveSubscriptions,
  saveTransactions,
} from '@/src/data/financeStorage';
import type {
  Account,
  Budget,
  Debt,
  Period,
  Subscription,
  Transaction,
  TransactionType,
  PaymentMethod,
} from '@/src/types/finance';
import { useSettings } from '@/src/hooks/useSettings';
import { useCalendarClock } from '@/src/hooks/useCalendarClock';
import {
  antExpenseBreakdown,
  detectRecurring,
  filterByCalendarMonth,
  filterByPeriod,
  percentOfBase,
  predictMonthlySpends,
  sumByType,
  unpaidInstallmentsForMonth,
  accruedInstallmentsTotal,
  type PredictedSpend,
} from '@/src/utils/financeMath';
import { computeNetWorth } from '@/src/utils/netWorth';
import {
  filterByPersonScope,
  isRegisteredByMe,
} from '@/src/utils/personScope';
import type { PersonScope } from '@/src/types/finance';

type NewTxInput = {
  type: TransactionType;
  amount: number;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  accountId?: string;
  toAccountId?: string;
  debtId?: string;
  note?: string;
  createdAt?: string;
  isRecurring?: boolean;
};

type CategoryInsight = {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  percent: number;
  count: number;
};

type FinanceContextValue = {
  loading: boolean;
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  debts: Debt[];
  subscriptions: Subscription[];
  addTransaction: (input: NewTxInput) => Promise<Transaction>;
  addDebt: (input: {
    name: string;
    balance: number;
    installment: number;
    interestRate?: number;
    nextPaymentDate?: string;
    categoryId?: string;
  }) => Promise<Debt>;
  updateDebt: (
    id: string,
    patch: Partial<
      Pick<Debt, 'name' | 'balance' | 'installment' | 'interestRate' | 'nextPaymentDate' | 'categoryId'>
    >
  ) => Promise<Debt | null>;
  removeDebt: (id: string) => Promise<void>;
  updateTransaction: (
    id: string,
    patch: Partial<
      Pick<
        Transaction,
        | 'type'
        | 'amount'
        | 'categoryId'
        | 'paymentMethod'
        | 'accountId'
        | 'toAccountId'
        | 'note'
        | 'createdAt'
      >
    >
  ) => Promise<Transaction | null>;
  removeTransaction: (id: string) => Promise<void>;
  canEditTransaction: (tx: Transaction) => boolean;
  resetFinance: () => Promise<void>;
  restoreFromBackup: (backup: {
    transactions: Transaction[];
    accounts: Account[];
    budgets: Budget[];
    debts: Debt[];
    subscriptions: Subscription[];
  }) => Promise<void>;
  updateBudget: (categoryId: string, limit: number) => Promise<void>;
  removeBudget: (categoryId: string) => Promise<void>;
  transactionsForPeriod: (period: Period, scope?: PersonScope) => Transaction[];
  transactionsForMonth: (
    year: number,
    monthIndex: number,
    scope?: PersonScope
  ) => Transaction[];
  totalForPeriod: (
    period: Period,
    type?: TransactionType,
    scope?: PersonScope
  ) => number;
  insightsForPeriod: (period: Period, kind?: 'expense' | 'income') => CategoryInsight[];
  antForPeriod: (period: Period) => ReturnType<typeof antExpenseBreakdown>;
  recurringTransactions: Transaction[];
  predictedThisMonth: PredictedSpend[];
  availableCash: number;
  /** Liquid accounts that make up availableCash (cash / bank / savings). */
  availableByAccount: Array<{
    id: string;
    type: Account['type'];
    balance: number;
    nameKey: string;
  }>;
  netWorth: { assets: number; liabilities: number; net: number };
  budgetStatus: Array<{
    categoryId: string;
    limit: number;
    spent: number;
    remaining: number;
    ratio: number;
  }>;
  // legacy compatibility for older components
  expenses: Transaction[];
  addExpense: (input: {
    amount: number;
    categoryId: string;
    note?: string;
    createdAt?: string;
  }) => Promise<Transaction>;
  removeExpense: (id: string) => Promise<void>;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyAccountDelta(
  accounts: Account[],
  tx: Transaction,
  direction: 1 | -1 = 1
): Account[] {
  const next = accounts.map((a) => ({ ...a }));
  const find = (id?: string) => next.find((a) => a.id === id);
  const amount = tx.amount * direction;

  if (tx.type === 'expense' || tx.type === 'withdrawal' || tx.type === 'debt_payment') {
    const acc = find(tx.accountId);
    if (acc) acc.balance -= amount;
  }
  if (tx.type === 'income') {
    const acc = find(tx.accountId);
    if (acc) acc.balance += amount;
  }
  if (tx.type === 'transfer') {
    const from = find(tx.accountId);
    const to = find(tx.toAccountId);
    if (from) from.balance -= amount;
    if (to) to.balance += amount;
  }
  if (tx.type === 'investment') {
    const from = find(tx.accountId);
    const to = find(tx.toAccountId) ?? find('investments');
    if (from) from.balance -= amount;
    if (to) to.balance += amount;
  }
  return next;
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { settings, ready: settingsReady, pruneQuickTemplatesToExistingExpenses } =
    useSettings();
  const { now, monthKey } = useCalendarClock();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [attributed, setAttributed] = useState(false);

  useEffect(() => {
    if (!settingsReady) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const [tx, acc, bud, deb, sub] = await Promise.all([
        loadTransactions(),
        loadAccounts(),
        loadBudgets(),
        loadDebts(),
        loadSubscriptions(),
      ]);
      if (!mounted) return;
      setTransactions(tx);
      setAccounts(acc);
      setBudgets(bud);
      setDebts(deb);
      setSubscriptions(sub);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [settingsReady]);

  // Backfill ownership so legacy rows belong to this singular person.
  useEffect(() => {
    if (loading || !settingsReady || !settings.personId || attributed) return;
    const needs = transactions.some((t) => !t.registeredById);
    if (!needs) {
      setAttributed(true);
      return;
    }
    const ownerName = settings.userName.trim() || 'Me';
    const next = transactions.map((t) =>
      t.registeredById
        ? t
        : {
            ...t,
            registeredById: settings.personId,
            registeredByName: ownerName,
          }
    );
    setTransactions(next);
    setAttributed(true);
    void saveTransactions(next);
  }, [
    loading,
    settingsReady,
    settings.personId,
    settings.userName,
    transactions,
    attributed,
  ]);

  const addTransaction = useCallback(
    async (input: NewTxInput) => {
      const tx: Transaction = {
        id: createId(),
        type: input.type,
        amount: input.amount,
        categoryId: input.categoryId,
        paymentMethod: input.paymentMethod,
        accountId: input.accountId ?? 'cash',
        toAccountId: input.toAccountId,
        debtId: input.debtId,
        note: input.note?.trim() || undefined,
        createdAt: input.createdAt ?? new Date().toISOString(),
        isRecurring: input.isRecurring,
        registeredById: settings.personId || undefined,
        registeredByName: settings.userName.trim() || undefined,
      };
      const nextTx = [tx, ...transactions].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
      const nextAccounts = applyAccountDelta(accounts, tx);
      let nextDebts = debts;
      if (tx.type === 'debt_payment' && tx.debtId) {
        nextDebts = debts.map((d) => {
          if (d.id !== tx.debtId) return d;
          const paid = Math.min(tx.amount, d.balance);
          const nextDate = new Date();
          nextDate.setMonth(nextDate.getMonth() + 1);
          return {
            ...d,
            balance: Math.max(0, d.balance - paid),
            paidCapital: d.paidCapital + paid,
            nextPaymentDate: nextDate.toISOString(),
          };
        });
      }
      setTransactions(nextTx);
      setAccounts(nextAccounts);
      setDebts(nextDebts);
      await Promise.all([
        saveTransactions(nextTx),
        saveAccounts(nextAccounts),
        saveDebts(nextDebts),
      ]);
      return tx;
    },
    [transactions, accounts, debts, settings.personId, settings.userName]
  );

  const addDebt = useCallback(
    async (input: {
      name: string;
      balance: number;
      installment: number;
      interestRate?: number;
      nextPaymentDate?: string;
      categoryId?: string;
    }) => {
      const nextDate =
        input.nextPaymentDate ??
        (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 1);
          return d.toISOString();
        })();
      const debt: Debt = {
        id: createId(),
        name: input.name.trim(),
        balance: input.balance,
        installment: input.installment,
        interestRate: input.interestRate ?? 0,
        termMonths: 0,
        nextPaymentDate: nextDate,
        paidCapital: 0,
        paidInterest: 0,
        otherCharges: 0,
        categoryId: input.categoryId,
        isPermanent: true,
      };
      const next = [debt, ...debts];
      setDebts(next);
      await saveDebts(next);
      return debt;
    },
    [debts]
  );

  const updateDebt = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<
          Debt,
          'name' | 'balance' | 'installment' | 'interestRate' | 'nextPaymentDate' | 'categoryId'
        >
      >
    ) => {
      const existing = debts.find((d) => d.id === id);
      if (!existing) return null;
      const updated: Debt = {
        ...existing,
        ...patch,
        name: patch.name !== undefined ? patch.name.trim() : existing.name,
      };
      const next = debts.map((d) => (d.id === id ? updated : d));
      setDebts(next);
      await saveDebts(next);
      return updated;
    },
    [debts]
  );

  const removeDebt = useCallback(
    async (id: string) => {
      const next = debts.filter((d) => d.id !== id);
      setDebts(next);
      await saveDebts(next);
    },
    [debts]
  );

  const canEditTransaction = useCallback(
    (tx: Transaction) => isRegisteredByMe(tx, settings.personId),
    [settings.personId]
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      const existing = transactions.find((t) => t.id === id);
      if (!existing) return;
      if (!isRegisteredByMe(existing, settings.personId)) return;
      const nextTx = transactions.filter((t) => t.id !== id);
      const nextAccounts = applyAccountDelta(accounts, existing, -1);
      setTransactions(nextTx);
      setAccounts(nextAccounts);
      await Promise.all([saveTransactions(nextTx), saveAccounts(nextAccounts)]);
      // One-tap = repeat an existing spend; drop chips when nothing remains to repeat.
      if (existing.type === 'expense') {
        await pruneQuickTemplatesToExistingExpenses(
          nextTx
            .filter((t) => t.type === 'expense')
            .map((t) => ({ categoryId: t.categoryId, amount: t.amount }))
        );
      }
    },
    [transactions, accounts, settings.personId, pruneQuickTemplatesToExistingExpenses]
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<
          Transaction,
          | 'type'
          | 'amount'
          | 'categoryId'
          | 'paymentMethod'
          | 'accountId'
          | 'toAccountId'
          | 'note'
          | 'createdAt'
        >
      >
    ) => {
      const existing = transactions.find((t) => t.id === id);
      if (!existing) return null;
      if (!isRegisteredByMe(existing, settings.personId)) return null;

      const updated: Transaction = {
        ...existing,
        ...patch,
        // Ownership stays with the person who originally registered it.
        registeredById: existing.registeredById,
        registeredByName: existing.registeredByName,
        note:
          patch.note !== undefined
            ? patch.note.trim() || undefined
            : existing.note,
      };

      const nextTx = transactions
        .map((t) => (t.id === id ? updated : t))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      let nextAccounts = applyAccountDelta(accounts, existing, -1);
      nextAccounts = applyAccountDelta(nextAccounts, updated, 1);

      setTransactions(nextTx);
      setAccounts(nextAccounts);
      await Promise.all([saveTransactions(nextTx), saveAccounts(nextAccounts)]);
      return updated;
    },
    [transactions, accounts, settings.personId]
  );

  const resetFinance = useCallback(async () => {
    const blankAccounts = DEFAULT_ACCOUNTS.map((a) => ({
      ...a,
      balance: 0,
    }));
    const nextBudgets: Budget[] = [];
    const nextDebts: Debt[] = [];
    const nextSubs = [...DEFAULT_SUBSCRIPTIONS];
    const nextTx: Transaction[] = [];

    setTransactions(nextTx);
    setAccounts(blankAccounts);
    setBudgets(nextBudgets);
    setDebts(nextDebts);
    setSubscriptions(nextSubs);

    await Promise.all([
      saveTransactions(nextTx),
      saveAccounts(blankAccounts),
      saveBudgets(nextBudgets),
      saveDebts(nextDebts),
      saveSubscriptions(nextSubs),
    ]);
  }, []);

  const restoreFromBackup = useCallback(
    async (backup: {
      transactions: Transaction[];
      accounts: Account[];
      budgets: Budget[];
      debts: Debt[];
      subscriptions: Subscription[];
    }) => {
      const nextTx = [...backup.transactions].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
      setTransactions(nextTx);
      setAccounts(backup.accounts);
      setBudgets(backup.budgets);
      setDebts(backup.debts);
      setSubscriptions(backup.subscriptions);
      setAttributed(true);
      await Promise.all([
        saveTransactions(nextTx),
        saveAccounts(backup.accounts),
        saveBudgets(backup.budgets),
        saveDebts(backup.debts),
        saveSubscriptions(backup.subscriptions),
      ]);
    },
    []
  );

  const updateBudget = useCallback(
    async (categoryId: string, limit: number) => {
      const exists = budgets.find((b) => b.categoryId === categoryId);
      const next = exists
        ? budgets.map((b) => (b.categoryId === categoryId ? { ...b, limit } : b))
        : [...budgets, { id: createId(), categoryId, limit }];
      setBudgets(next);
      await saveBudgets(next);
    },
    [budgets]
  );

  const removeBudget = useCallback(
    async (categoryId: string) => {
      const next = budgets.filter((b) => b.categoryId !== categoryId);
      setBudgets(next);
      await saveBudgets(next);
    },
    [budgets]
  );

  const scopedTransactions = useCallback(
    (scope: PersonScope = 'mine') =>
      filterByPersonScope(transactions, scope, settings.personId),
    [transactions, settings.personId]
  );

  const transactionsForPeriod = useCallback(
    (period: Period, scope: PersonScope = 'mine') =>
      filterByPeriod(scopedTransactions(scope), period, now),
    [scopedTransactions, now, monthKey]
  );

  const transactionsForMonth = useCallback(
    (year: number, monthIndex: number, scope: PersonScope = 'mine') =>
      filterByCalendarMonth(scopedTransactions(scope), year, monthIndex),
    [scopedTransactions]
  );

  const totalForPeriod = useCallback(
    (
      period: Period,
      type: TransactionType = 'expense',
      scope: PersonScope = 'mine'
    ) => {
      const list = transactionsForPeriod(period, scope);
      if (type === 'expense') {
        const actual = list
          .filter((t) => t.type === 'expense' || t.type === 'debt_payment')
          .reduce((s, t) => s + t.amount, 0);
        if (period !== 'mes') return actual;
        return (
          actual +
          accruedInstallmentsTotal(
            scopedTransactions(scope),
            debts,
            now.getFullYear(),
            now.getMonth()
          )
        );
      }
      return sumByType(list, type);
    },
    [transactionsForPeriod, scopedTransactions, debts, now]
  );

  const insightsForPeriod = useCallback(
    (period: Period, kind: 'expense' | 'income' = 'expense'): CategoryInsight[] => {
      const list = transactionsForPeriod(period, 'mine').filter((t) =>
        kind === 'income'
          ? t.type === 'income'
          : t.type === 'expense' || t.type === 'debt_payment'
      );
      const concepts = settings.spendConcepts ?? [];
      const map = new Map<string, { total: number; count: number }>();
      for (const e of list) {
        const hit = e.categoryId ? findSpendSub(concepts, e.categoryId) : null;
        const key = hit?.concept.id ?? e.categoryId ?? '__none__';
        const cur = map.get(key) ?? { total: 0, count: 0 };
        cur.total += e.amount;
        cur.count += 1;
        map.set(key, cur);
      }
      let total = list.reduce((sum, e) => sum + e.amount, 0);
      if (kind === 'expense' && period === 'mes') {
        const extra = unpaidInstallmentsForMonth(
          scopedTransactions('mine'),
          debts,
          now.getFullYear(),
          now.getMonth()
        );
        for (const item of extra) {
          const hit = findSpendSub(concepts, item.categoryId);
          const key = hit?.concept.id ?? item.categoryId;
          const cur = map.get(key) ?? { total: 0, count: 0 };
          cur.total += item.amount;
          cur.count += 1;
          map.set(key, cur);
          total += item.amount;
        }
      }
      return Array.from(map.entries())
        .map(([categoryId, stats]) => ({
          categoryId,
          name: categoryId,
          color: resolveConceptColor(categoryId, concepts),
          total: stats.total,
          count: stats.count,
          // Share of this period's money out — never of a single row.
          percent: percentOfBase(stats.total, total),
        }))
        .sort((a, b) => b.total - a.total);
    },
    [transactionsForPeriod, settings.spendConcepts, scopedTransactions, debts, now]
  );

  const antForPeriod = useCallback(
    (period: Period) =>
      antExpenseBreakdown(
        transactionsForPeriod(period, 'mine'),
        settings.spendConcepts ?? []
      ),
    [transactionsForPeriod, settings.spendConcepts]
  );

  const recurringTransactions = useMemo(
    () => detectRecurring(transactions),
    [transactions]
  );

  const predictedThisMonth = useMemo(() => {
    const mine = filterByPersonScope(transactions, 'mine', settings.personId);
    return predictMonthlySpends(mine, debts, now);
  }, [transactions, debts, now, monthKey, settings.personId]);

  const availableByAccount = useMemo(
    () =>
      accounts
        .filter((a) => a.type === 'cash' || a.type === 'bank' || a.type === 'savings')
        .map((a) => ({
          id: a.id,
          type: a.type,
          balance: Math.max(a.balance, 0),
          nameKey: a.nameKey,
        })),
    [accounts]
  );

  const availableCash = useMemo(
    () => availableByAccount.reduce((s, a) => s + a.balance, 0),
    [availableByAccount]
  );

  const netWorth = useMemo(
    () => computeNetWorth(accounts, debts),
    [accounts, debts]
  );

  const budgetStatus = useMemo(() => {
    const month = transactionsForPeriod('mes', 'mine').filter(
      (t) => t.type === 'expense' || t.type === 'debt_payment'
    );
    const extra = unpaidInstallmentsForMonth(
      scopedTransactions('mine'),
      debts,
      now.getFullYear(),
      now.getMonth()
    );
    const extraByCat = new Map<string, number>();
    for (const item of extra) {
      extraByCat.set(item.categoryId, (extraByCat.get(item.categoryId) ?? 0) + item.amount);
    }
    return budgets.map((b) => {
      const spent =
        month
          .filter((t) => t.categoryId === b.categoryId)
          .reduce((s, t) => s + t.amount, 0) + (extraByCat.get(b.categoryId) ?? 0);
      const remaining = b.limit - spent;
      return {
        categoryId: b.categoryId,
        limit: b.limit,
        spent,
        remaining,
        ratio: b.limit > 0 ? spent / b.limit : 0,
      };
    });
  }, [budgets, transactionsForPeriod, scopedTransactions, debts, now]);

  const addExpense = useCallback(
    async (input: {
      amount: number;
      categoryId: string;
      note?: string;
      createdAt?: string;
    }) =>
      addTransaction({
        type: 'expense',
        amount: input.amount,
        categoryId: input.categoryId,
        note: input.note,
        createdAt: input.createdAt,
        paymentMethod: 'cash',
        accountId: 'cash',
      }),
    [addTransaction]
  );

  const value = useMemo(
    () => ({
      loading,
      transactions,
      accounts,
      budgets,
      debts,
      subscriptions,
      addTransaction,
      addDebt,
      updateDebt,
      removeDebt,
      updateTransaction,
      removeTransaction,
      canEditTransaction,
      resetFinance,
      restoreFromBackup,
      updateBudget,
      removeBudget,
      transactionsForPeriod,
      transactionsForMonth,
      totalForPeriod,
      insightsForPeriod,
      antForPeriod,
      recurringTransactions,
      predictedThisMonth,
      availableCash,
      availableByAccount,
      netWorth,
      budgetStatus,
      expenses: filterByPersonScope(transactions, 'mine', settings.personId).filter(
        (t) => t.type === 'expense'
      ),
      addExpense,
      removeExpense: removeTransaction,
    }),
    [
      loading,
      transactions,
      accounts,
      budgets,
      debts,
      subscriptions,
      addTransaction,
      addDebt,
      updateDebt,
      removeDebt,
      updateTransaction,
      removeTransaction,
      canEditTransaction,
      resetFinance,
      restoreFromBackup,
      updateBudget,
      removeBudget,
      transactionsForPeriod,
      transactionsForMonth,
      totalForPeriod,
      insightsForPeriod,
      antForPeriod,
      recurringTransactions,
      predictedThisMonth,
      availableCash,
      availableByAccount,
      netWorth,
      budgetStatus,
      addExpense,
      settings.personId,
    ]
  );

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}

/** Back-compat alias while screens migrate */
export function useExpenses(): FinanceContextValue {
  return useFinance();
}

export { FinanceProvider as ExpensesProvider };
