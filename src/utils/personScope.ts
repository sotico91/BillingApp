import type { PersonScope, Transaction } from '@/src/types/finance';

/** Keep only movements logged by this person (or untagged legacy rows). */
export function filterByPersonScope(
  transactions: Transaction[],
  scope: PersonScope,
  personId: string
): Transaction[] {
  if (scope === 'all' || !personId) return transactions;
  return transactions.filter(
    (tx) => !tx.registeredById || tx.registeredById === personId
  );
}

export function isRegisteredByMe(tx: Transaction, personId: string): boolean {
  if (!personId) return true;
  return !tx.registeredById || tx.registeredById === personId;
}

export function uniqueRegistrants(transactions: Transaction[]): string[] {
  const names = new Set<string>();
  for (const tx of transactions) {
    if (tx.registeredByName?.trim()) names.add(tx.registeredByName.trim());
  }
  return Array.from(names);
}
