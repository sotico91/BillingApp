import type { Account, Debt, Transaction } from '@/src/types/finance';
import { moveDestinations, moveSourcesWithCredit } from '@/src/utils/accounts';
import { creditShortfall, payAccountIdForDebt } from '@/src/utils/debts';
import {
  applyAccountDelta,
  applyTxDebts,
  isCreditDraw,
  normalizePocketMove,
  pocketMoveAccountsReady,
} from '@/src/utils/ledger';

const accounts: Account[] = [
  { id: 'cash', nameKey: 'account.cash', type: 'cash', balance: 0 },
  { id: 'bank', nameKey: 'account.bankMain', type: 'bank', balance: 100000 },
  { id: 'savings', nameKey: 'account.savings', type: 'savings', balance: 0 },
  { id: 'investments', nameKey: 'account.investments', type: 'investment', balance: 0 },
  { id: 'credit-card', nameKey: 'account.creditCard', type: 'credit', balance: 0 },
];

const base: Debt = {
  id: 'rot',
  name: 'Rotativo',
  balance: 200000,
  installment: 0,
  interestRate: 0,
  termMonths: 0,
  nextPaymentDate: '2026-11-20',
  paidCapital: 0,
  paidInterest: 0,
  otherCharges: 0,
  kind: 'revolving',
  revolvingProduct: 'line',
  creditLimit: 1000000,
};
const visa: Debt = { ...base, id: 'visa', name: 'Visa', balance: 0, revolvingProduct: 'card' };
const loan: Debt = { ...base, id: 'loan', name: 'Libre inversión', kind: 'installment' };
const debts = [base, visa, loan];

const balance = (list: Account[], id: string) => list.find((a) => a.id === id)?.balance;
const debtBalance = (list: Debt[], id: string) => list.find((d) => d.id === id)?.balance;

function draw(from: string, to: string, amount: number): Transaction {
  return normalizePocketMove({
    id: 'tx',
    type: 'transfer',
    amount,
    accountId: payAccountIdForDebt(from),
    toAccountId: to,
    createdAt: '2026-11-08T12:00:00.000Z',
  });
}

describe('credit draws (cash advance / cupo into a pocket)', () => {
  it('links the transfer to the card or cupo it leaves from', () => {
    const tx = draw('rot', 'savings', 300000);
    expect(tx.creditDebtId).toBe('rot');
    expect(isCreditDraw(tx)).toBe(true);
  });

  it('a plain transfer or an investment carries no debt link', () => {
    const plain = normalizePocketMove({
      id: 'p',
      type: 'transfer',
      amount: 1,
      accountId: 'bank',
      toAccountId: 'cash',
      creditDebtId: 'rot',
      createdAt: '2026-11-08T12:00:00.000Z',
    });
    expect(plain.creditDebtId).toBeUndefined();
    const invest = normalizePocketMove({ ...draw('rot', 'investments', 1), type: 'investment' });
    expect(invest.creditDebtId).toBeUndefined();
  });

  it('fills the destination and raises the debt by the same amount', () => {
    const tx = draw('rot', 'savings', 300000);
    const nextAccounts = applyAccountDelta(accounts, tx, 1);
    expect(balance(nextAccounts, 'savings')).toBe(300000);
    expect(balance(nextAccounts, 'bank')).toBe(100000);
    expect(balance(nextAccounts, 'credit-card')).toBe(0);
    expect(debtBalance(applyTxDebts(debts, tx, 1), 'rot')).toBe(500000);
  });

  it('a card advance to cash works the same', () => {
    const tx = draw('visa', 'cash', 150000);
    expect(balance(applyAccountDelta(accounts, tx, 1), 'cash')).toBe(150000);
    expect(debtBalance(applyTxDebts(debts, tx, 1), 'visa')).toBe(150000);
  });

  it('undo restores pocket and debt', () => {
    const tx = draw('rot', 'savings', 300000);
    const accs = applyAccountDelta(applyAccountDelta(accounts, tx, 1), tx, -1);
    const ds = applyTxDebts(applyTxDebts(debts, tx, 1), tx, -1);
    expect(balance(accs, 'savings')).toBe(0);
    expect(debtBalance(ds, 'rot')).toBe(200000);
  });

  it('needs an open revolving debt and a money pocket to land in', () => {
    expect(pocketMoveAccountsReady(accounts, draw('rot', 'savings', 1), debts)).toBe(true);
    expect(pocketMoveAccountsReady(accounts, draw('loan', 'savings', 1), debts)).toBe(false);
    expect(pocketMoveAccountsReady(accounts, draw('nope', 'savings', 1), debts)).toBe(false);
    expect(pocketMoveAccountsReady(accounts, draw('rot', 'credit-card', 1), debts)).toBe(false);
    const closed = [{ ...base, closedAt: '2026-10-01' }];
    expect(pocketMoveAccountsReady(accounts, draw('rot', 'savings', 1), closed)).toBe(false);
  });

  it('only blocks past the free cupo when the limit is known', () => {
    expect(creditShortfall(base, 800000)).toBe(0);
    expect(creditShortfall(base, 900000)).toBe(100000);
    expect(creditShortfall({ ...base, creditLimit: undefined }, 5000000)).toBe(0);
  });
});

describe('move pickers', () => {
  const label = (d: Debt) => d.name ?? '';

  it('offers pockets with money plus open cards and cupos, not installment loans', () => {
    const ids = moveSourcesWithCredit(accounts, debts, label).map((a) => a.id);
    expect(ids).toEqual(['bank', 'debt:rot', 'debt:visa']);
  });

  it('credit lands in cash, banks, wallets or savings — not investments', () => {
    const fromCredit = moveDestinations(accounts, 'debt:rot').map((a) => a.id);
    expect(fromCredit).toEqual(['cash', 'bank', 'savings']);
    expect(moveDestinations(accounts, 'bank').map((a) => a.id)).toContain('investments');
  });
});
