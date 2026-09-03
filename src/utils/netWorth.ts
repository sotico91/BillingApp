import type { Account } from '@/src/types/finance';

/** Where income can land — never credit (that would hide money from net worth assets). */
export function isIncomeDestinationAccount(account: Account): boolean {
  return account.type !== 'credit';
}

/** Accounts you can spend from (includes credit). */
export function spendSourceAccounts(accounts: Account[]): Account[] {
  return accounts;
}

export function incomeDestinationAccounts(accounts: Account[]): Account[] {
  return accounts.filter(isIncomeDestinationAccount);
}

/**
 * Net worth from account balances + installment debts.
 * - Assets: positive balances (incl. prepaid credit)
 * - Liabilities: credit card debt, overdraft on cash/bank/savings/wallet, plus debts list
 */
export function computeNetWorth(
  accounts: Account[],
  debts: { balance: number }[]
): { assets: number; liabilities: number; net: number } {
  let assets = 0;
  let liabilities = 0;

  for (const a of accounts) {
    if (a.balance >= 0) {
      assets += a.balance;
    } else {
      liabilities += Math.abs(a.balance);
    }
  }

  for (const d of debts) {
    liabilities += Math.max(d.balance, 0);
  }

  return { assets, liabilities, net: assets - liabilities };
}
