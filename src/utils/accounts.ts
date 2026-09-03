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
  | 'account.role.principal'
  | 'account.role.secondary'
  | 'account.role.wallet'
  | 'account.role.other'
> {
  if (isPrincipalLiquid(type)) return 'account.role.principal';
  if (type === 'wallet') return 'account.role.wallet';
  if (type === 'savings') return 'account.role.secondary';
  return 'account.role.other';
}

export function accountDisplayName(
  acc: Pick<Account, 'nameKey' | 'name'>,
  t: (key: TranslationKey) => string
): string {
  const custom = acc.name?.trim();
  if (custom) return custom;
  const label = t(acc.nameKey as TranslationKey);
  return label && label !== acc.nameKey ? label : acc.nameKey;
}

/** Common Colombian wallets — tap to add; each keeps its own balance. */
export const WALLET_PRESETS = ['Nequi', 'Daviplata'] as const;

export function slugWalletId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `wallet-${slug || 'custom'}`;
}

export function findWalletByName(accounts: Account[], name: string): Account | undefined {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return undefined;
  const id = slugWalletId(name);
  return accounts.find(
    (a) =>
      a.type === 'wallet' &&
      (a.id === id || (a.name ?? '').trim().toLowerCase() === wanted)
  );
}

export function ensureWalletAccount(
  accounts: Account[],
  name: string
): { accounts: Account[]; account: Account; created: boolean } {
  const trimmed = name.trim();
  const existing = findWalletByName(accounts, trimmed);
  if (existing) return { accounts, account: existing, created: false };

  // Empty placeholder becomes the first named wallet so we don't leave a duplicate $0 pocket.
  const unnamedDefault = accounts.find(
    (a) =>
      a.id === 'wallet' &&
      a.type === 'wallet' &&
      !(a.name ?? '').trim() &&
      a.balance === 0
  );
  if (unnamedDefault) {
    const account: Account = { ...unnamedDefault, name: trimmed };
    return {
      accounts: accounts.map((a) => (a.id === unnamedDefault.id ? account : a)),
      account,
      created: true,
    };
  }

  let id = slugWalletId(trimmed);
  if (accounts.some((a) => a.id === id)) {
    id = `${id}-${Date.now().toString(36)}`;
  }
  const account: Account = {
    id,
    nameKey: 'account.wallet',
    name: trimmed,
    type: 'wallet',
    balance: 0,
  };
  return { accounts: [...accounts, account], account, created: true };
}

/** Add newly introduced default accounts (e.g. virtual wallet) without wiping balances. */
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

/** Cash, savings, virtual wallets, or the main bank — wherever this spend actually left. */
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
    name: a.name,
  }));
}
