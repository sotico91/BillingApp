import type { Account, Debt, DebtKind, RevolvingProduct } from '@/src/types/finance';

const DEBT_PAY_PREFIX = 'debt:';

export function payAccountIdForDebt(debtId: string): string {
  return `${DEBT_PAY_PREFIX}${debtId}`;
}

export function isDebtPayAccountId(id: string | undefined): boolean {
  return Boolean(id?.startsWith(DEBT_PAY_PREFIX));
}

export function debtIdFromPayAccountId(id: string | undefined): string | undefined {
  if (!id?.startsWith(DEBT_PAY_PREFIX)) return undefined;
  return id.slice(DEBT_PAY_PREFIX.length) || undefined;
}

export function revolvingAsPayAccounts(
  debts: Debt[],
  labelFor: (debt: Debt) => string
): Account[] {
  return debts.filter(isRevolving).map((debt) => ({
    id: payAccountIdForDebt(debt.id),
    nameKey: 'account.creditCard',
    name: labelFor(debt),
    type: 'credit',
    balance: creditAvailable(debt),
  }));
}

export function debtKind(debt: Pick<Debt, 'kind'>): DebtKind {
  return debt.kind === 'revolving' ? 'revolving' : 'installment';
}

export function isRevolving(debt: Pick<Debt, 'kind'>): boolean {
  return debtKind(debt) === 'revolving';
}

export function revolvingProduct(
  debt: Pick<Debt, 'kind' | 'revolvingProduct'>
): RevolvingProduct {
  if (!isRevolving(debt)) return 'card';
  return debt.revolvingProduct ?? 'card';
}

/** Cupo still available to charge. Over-limit reads as 0. */
export function creditAvailable(
  debt: Pick<Debt, 'kind' | 'creditLimit' | 'balance'>
): number {
  if (!isRevolving(debt)) return 0;
  return Math.max(0, (debt.creditLimit ?? 0) - (debt.balance || 0));
}

export function applyRevolvingCharge(
  debts: Debt[],
  debtId: string | undefined,
  amount: number,
  direction: 1 | -1
): Debt[] {
  if (!debtId || !amount) return debts;
  return debts.map((debt) => {
    if (debt.id !== debtId) return debt;
    return { ...debt, balance: Math.max(0, (debt.balance || 0) + amount * direction) };
  });
}

export function totalOwed(debts: Debt[]): number {
  return debts.reduce((sum, debt) => sum + (debt.balance || 0), 0);
}

export function monthlyDue(debts: Debt[]): number {
  return debts.reduce((sum, debt) => sum + (debt.installment || 0), 0);
}

export function revolvingAvailableTotal(debts: Debt[]): number {
  return debts.reduce((sum, debt) => sum + creditAvailable(debt), 0);
}

export function productLabelKey(
  product: RevolvingProduct
): 'wealth.productCard' | 'wealth.productCredicheque' | 'wealth.productLine' {
  if (product === 'credicheque') return 'wealth.productCredicheque';
  if (product === 'line') return 'wealth.productLine';
  return 'wealth.productCard';
}

/**
 * Amount parsers in the app reject 0. Revolving used / this-month pay can be 0.
 */
export function parseNonNegativeAmount(
  raw: string,
  parsePositive: (value: string) => number | null
): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const positive = parsePositive(trimmed);
  if (positive != null) return positive;
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits === '' || /^0+$/.test(digits)) return 0;
  return null;
}
