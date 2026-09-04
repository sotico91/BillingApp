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

/** One-tap shortcuts. Any other name is a separate wallet with its own balance. */
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

export function isRemovableWallet(acc: Pick<Account, 'id' | 'type'>): boolean {
  return acc.type === 'wallet' && acc.id !== 'wallet';
}

export function renameWalletAccount(
  accounts: Account[],
  id: string,
  name: string
):
  | { accounts: Account[]; account: Account }
  | { error: 'missing' | 'empty' | 'duplicate' } {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'empty' };
  const current = accounts.find((a) => a.id === id);
  if (!current || current.type !== 'wallet') return { error: 'missing' };
  const clash = findWalletByName(accounts, trimmed);
  if (clash && clash.id !== id) return { error: 'duplicate' };
  const account = { ...current, name: trimmed };
  return {
    accounts: accounts.map((a) => (a.id === id ? account : a)),
    account,
  };
}

export function removeWalletAccount(
  accounts: Account[],
  id: string
): { accounts: Account[] } | { error: 'missing' | 'protected' | 'hasBalance' } {
  const current = accounts.find((a) => a.id === id);
  if (!current || current.type !== 'wallet') return { error: 'missing' };
  if (!isRemovableWallet(current)) return { error: 'protected' };
  if (Math.abs(current.balance) >= 0.01) return { error: 'hasBalance' };
  return { accounts: accounts.filter((a) => a.id !== id) };
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

function liquidWithFunds(accounts: Account[], minBalance: number): Account[] {
  return accounts
    .filter((a) => isSpendableLiquid(a.type) && a.balance >= minBalance)
    .sort((a, b) => b.balance - a.balance);
}

function accountCovers(
  acc: Account | undefined,
  amount?: number
): acc is Account {
  if (!acc || !isSpendableLiquid(acc.type)) return false;
  if (amount != null && amount > 0) return acc.balance >= amount;
  return acc.balance > 0;
}

/**
 * Prefer the pocket the user last used only if it can pay. Otherwise use leftover
 * in wallets/savings (or any liquid pocket that still has money).
 */
export function resolveSpendAccountId(
  accounts: Account[],
  preferredId: string | undefined,
  amount?: number
): string {
  const preferred = preferredId
    ? accounts.find((a) => a.id === preferredId)
    : undefined;
  if (accountCovers(preferred, amount)) return preferred.id;

  const need = amount != null && amount > 0 ? amount : 0.01;
  const enough = liquidWithFunds(accounts, need);
  if (enough[0]) return enough[0].id;
  const any = liquidWithFunds(accounts, 0.01);
  if (any[0]) return any[0].id;
  return preferred?.id ?? defaultIncomeAccountId(accounts);
}

export function defaultSpendAccountId(
  accounts: Account[],
  opts?: { lastAccountId?: string; amount?: number }
): string {
  return resolveSpendAccountId(accounts, opts?.lastAccountId, opts?.amount);
}

/**
 * Don't leave cash/bank in the red while wallets or savings still have leftover.
 * Covers overdrafts from secondary pockets first, then other liquid accounts.
 */
export function settleLiquidOverdrafts(accounts: Account[]): {
  accounts: Account[];
  changed: boolean;
} {
  const next = accounts.map((a) => ({ ...a }));
  const liquid = next.filter((a) => isSpendableLiquid(a.type));
  let changed = false;

  const overs = liquid
    .filter((a) => a.balance < 0)
    .sort((a, b) => {
      const pa = isPrincipalLiquid(a.type) ? 0 : 1;
      const pb = isPrincipalLiquid(b.type) ? 0 : 1;
      return pa - pb;
    });

  for (const over of overs) {
    let need = -over.balance;
    const donors = liquid
      .filter((a) => a.id !== over.id && a.balance > 0)
      .sort((a, b) => {
        const sa = isSecondaryLiquid(a.type) ? 1 : 0;
        const sb = isSecondaryLiquid(b.type) ? 1 : 0;
        if (sa !== sb) return sb - sa;
        return b.balance - a.balance;
      });
    for (const donor of donors) {
      if (need <= 0) break;
      const give = Math.min(donor.balance, need);
      if (give <= 0) continue;
      donor.balance -= give;
      over.balance += give;
      need -= give;
      changed = true;
    }
  }

  return { accounts: next, changed };
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
