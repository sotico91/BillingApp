import { router } from 'expo-router';
import { useCallback } from 'react';

import { appAlert } from '@/src/components/AppAlert';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { isPocketMove, type Transaction, type TransactionType } from '@/src/types/finance';
import { applyAccountDelta, applyTxDebts } from '@/src/utils/ledger';
import { creditAvailable, creditShortfall, debtIdFromPayAccountId } from '@/src/utils/debts';
import { accountDisplayName, fundsShortfall, spendableTotal } from '@/src/utils/accounts';

/**
 * Before a spend, debt payment or move from your own money: is there money it can
 * come from? If not, say so kindly and offer to log the income first. The add
 * screen for it opens on top, so after saving the income you are back here.
 * Returns true when the movement can be saved.
 */
export function useFundsCheck() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { accounts: liveAccounts, debts: liveDebts } = useFinance();

  return useCallback(
    (input: {
      type: TransactionType;
      amount: number;
      accountId?: string;
      /** Editing: this movement's own effect is undone first (its money is back in the pocket). */
      replacing?: Transaction;
    }): boolean => {
      // A cash advance or cupo draw: only the card's free credit limits it.
      const drawnId = input.type === 'transfer' ? debtIdFromPayAccountId(input.accountId) : undefined;
      if (drawnId) {
        const debts = input.replacing ? applyTxDebts(liveDebts, input.replacing, -1) : liveDebts;
        const debt = debts.find((d) => d.id === drawnId);
        if (creditShortfall(debt, input.amount) <= 0) return true;
        appAlert(
          t('funds.cupoTitle'),
          t('funds.cupoShort', {
            account: debt?.nameKey ? t(debt.nameKey as TranslationKey) : debt?.name ?? t('debt.mainCard'),
            available: format(debt ? creditAvailable(debt) : 0),
            amount: format(input.amount),
          }),
          [{ text: t('funds.later'), style: 'cancel' }]
        );
        return false;
      }
      const accounts = input.replacing ? applyAccountDelta(liveAccounts, input.replacing, -1) : liveAccounts;
      if (fundsShortfall(accounts, input) <= 0) return true;
      const account = accounts.find((a) => a.id === input.accountId);
      const available = account ? Math.max(0, account.balance) : 0;
      const move = isPocketMove(input.type);
      const shortParams = account && {
        account: accountDisplayName(account, t),
        available: format(available),
        amount: format(input.amount),
      };
      appAlert(
        t('funds.title'),
        shortParams && available > 0
          ? t(move ? 'funds.moveShort' : 'funds.bodyShort', shortParams)
          : move
            ? t('funds.emptyBodyMove')
            : spendableTotal(accounts) > 0
              ? t('funds.bodyOther')
              : t('funds.bodyEmpty'),
        [
          { text: t('funds.later'), style: 'cancel' },
          {
            text: t('funds.addIncome'),
            onPress: () => router.push({ pathname: '/agregar', params: { intent: 'earn' } }),
          },
        ]
      );
      return false;
    },
    [liveAccounts, liveDebts, format, t]
  );
}
