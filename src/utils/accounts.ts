import { DEFAULT_ACCOUNTS } from '@/src/data/financeDefaults';
import type { Account, AccountType } from '@/src/types/finance';
import type { TranslationKey } from '@/src/i18n/translations';

export function isPrincipalLiquid(type: AccountType): boolean {
  return type === 'cash' || type === 'bank';
}

export function isSecondaryLiquid(type: AccountType): boolean {
  return type === 'savings' || type === 'wallet';
}

export function accountRoleKey(
  type: AccountType
): Extract<
  TranslationKey,
  'account.role.principal' | 'account.role.secondary' | 'account.role.other'
> {
  if (isPrincipalLiquid(type)) return 'account.role.principal';
  if (isSecondaryLiquid(type)) return 'account.role.secondary';
  return 'account.role.other';
}

/** Add newly introduced default accounts (e.g. Nequi/wallet) without wiping balances. */
export function mergeDefaultAccounts(stored: Account[] | null | undefined): {
  accounts: Account[];
  changed: boolean;
} {
  const list = Array.isArray(stored) ? stored : [];
  const byId = new Map(list.map((a) => [a.id, a]));
  const accounts: Account[] = [];
  let changed = list.length === 0;

  for (const def of DEFAULT_ACCOUNTS) {
    const existing = byId.get(def.id);
    if (existing) {
      accounts.push({
        ...existing,
        nameKey: existing.nameKey || def.nameKey,
        type: existing.type || def.type,
      });
      byId.delete(def.id);
    } else {
      accounts.push({ ...def, balance: 0 });
      changed = true;
    }
  }

  for (const extra of byId.values()) {
    accounts.push(extra);
  }

  return { accounts, changed };
}

export function defaultIncomeAccountId(accounts: Account[]): string {
  return accounts.find((a) => a.type === 'bank')?.id ?? accounts[0]?.id ?? 'bank-main';
}

/** Cash, savings, Nequi/wallets, or the main bank — wherever this spend actually left. */
export function isSpendableLiquid(type: AccountType): boolean {
  return (
    type === 'cash' ||
    type === 'bank' ||
    type === 'savings' ||
    type === 'wallet'
  );
}

export function defaultSpendAccountId(
  accounts: Account[],
  opts?: { lastAccountId?: string }
): string {
  const last = opts?.lastAccountId
    ? accounts.find((a) => a.id === opts.lastAccountId)
    : undefined;
  if (last) return last.id;

  const liquid = accounts.filter((a) => isSpendableLiquid(a.type));
  const withMoney = [...liquid]
    .filter((a) => a.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  if (withMoney[0]) return withMoney[0].id;
  return defaultIncomeAccountId(accounts);
}

export function defaultTransferDestinationId(
  accounts: Account[],
  fromId?: string
): string {
  const savings = accounts.find((a) => a.type === 'savings' && a.id !== fromId);
  if (savings) return savings.id;
  const wallet = accounts.find((a) => a.type === 'wallet' && a.id !== fromId);
  if (wallet) return wallet.id;
  return accounts.find((a) => a.id !== fromId)?.id ?? 'savings';
}

export function mapLiquidAccounts(
  accounts: Account[],
  kind: 'principal' | 'secondary'
) {
  const match =
    kind === 'principal' ? isPrincipalLiquid : isSecondaryLiquid;
  return accounts.filter((a) => match(a.type)).map((a) => ({
    id: a.id,
    type: a.type,
    balance: a.balance,
    nameKey: a.nameKey,
  }));
}
