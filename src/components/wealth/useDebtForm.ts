import { useState } from 'react';

import { appAlert } from '@/src/components/AppAlert';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import type { Debt, DebtKind, RevolvingProduct } from '@/src/types/finance';
import { debtKind, parseNonNegativeAmount, revolvingProduct } from '@/src/utils/debts';
import { parseMonthlyRate } from '@/src/utils/debtPlan';
import { clampPayDay, nextPaymentIsoFromDay } from '@/src/utils/payDay';
import { tapFeedback } from '@/src/utils/selectFeedback';

/**
 * State and actions of the add / edit debt form (cards and loans).
 * `onReveal` opens the section the form appears in.
 */
export function useDebtForm(onReveal: (kind: DebtKind) => void) {
  const { t } = useLanguage();
  const { parse } = useMoney();
  const { ensureDebtCategory } = useSettings();
  const { debts, addDebt, updateDebt, removeDebt, updateBudget } = useFinance();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [installment, setInstallment] = useState('');
  // Optional monthly rate (%), for the plan to get out of debt.
  const [rate, setRate] = useState('');
  const [payDay, setPayDay] = useState('1');
  const [kind, setKind] = useState<DebtKind>('installment');
  const [product, setProduct] = useState<RevolvingProduct>('card');
  const [creditLimit, setCreditLimit] = useState('');
  // Loan you can draw from into your account (crédito rotativo).
  const [drawable, setDrawable] = useState(false);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setName('');
    setBalance('');
    setInstallment('');
    setRate('');
    setPayDay('1');
    setKind('installment');
    setProduct('card');
    setCreditLimit('');
    setDrawable(false);
    setEditingId(null);
    setShowForm(false);
  }

  function startCreate(nextKind: DebtKind) {
    tapFeedback();
    if (showForm && !editingId && kind === nextKind) {
      resetForm();
      return;
    }
    setEditingId(null);
    setName('');
    setBalance('');
    setInstallment('');
    setRate('');
    setPayDay('1');
    setKind(nextKind);
    setProduct('card');
    setCreditLimit('');
    setDrawable(false);
    setShowForm(true);
    onReveal(nextKind);
  }

  function startEdit(debt: Debt) {
    tapFeedback();
    const label = debt.nameKey
      ? t(debt.nameKey as TranslationKey)
      : debt.name ?? '';
    const day = new Date(debt.nextPaymentDate).getDate();
    const nextKind = debtKind(debt);
    setEditingId(debt.id);
    setName(label);
    setBalance(String(debt.balance || ''));
    setInstallment(String(debt.installment || ''));
    setRate(debt.interestRate > 0 ? String(debt.interestRate).replace('.', ',') : '');
    setPayDay(String(Number.isNaN(day) ? 1 : Math.min(28, Math.max(1, day))));
    setKind(nextKind);
    setProduct(revolvingProduct(debt));
    setCreditLimit(debt.creditLimit ? String(debt.creditLimit) : '');
    setDrawable(!!debt.drawable);
    setShowForm(true);
    onReveal(nextKind);
  }

  async function handleSaveDebt() {
    const revolving = kind === 'revolving';
    // A rotativo loan has a cupo and may be at zero, like a card.
    const withCupo = revolving || drawable;
    const parsedLimit = withCupo ? parse(creditLimit) : null;
    const parsedBalance = withCupo
      ? parseNonNegativeAmount(balance, parse)
      : parse(balance);
    const parsedInstallment = withCupo
      ? parseNonNegativeAmount(installment, parse)
      : parse(installment);
    if (!name.trim()) {
      appAlert(
        revolving ? t('wealth.addCard') : t('wealth.addLoan'),
        revolving ? t('wealth.debtNeedRevolving') : t('wealth.debtNeed')
      );
      return;
    }
    if (revolving) {
      if (!parsedLimit) {
        appAlert(t('wealth.addCard'), t('wealth.debtNeedLimit'));
        return;
      }
      if (parsedBalance == null || parsedInstallment == null) {
        appAlert(t('wealth.addCard'), t('wealth.debtNeedRevolving'));
        return;
      }
    } else if (drawable) {
      if (!parsedLimit) {
        appAlert(t('wealth.addLoan'), t('wealth.debtNeedLimit'));
        return;
      }
      if (parsedBalance == null || parsedInstallment == null) {
        appAlert(t('wealth.addLoan'), t('wealth.debtNeed'));
        return;
      }
    } else if (!parsedBalance || !parsedInstallment) {
      appAlert(t('wealth.addLoan'), t('wealth.debtNeed'));
      return;
    }
    const parsedRate = parseMonthlyRate(rate);
    if (parsedRate == null) {
      appAlert(revolving ? t('wealth.addCard') : t('wealth.addLoan'), t('wealth.debtRateNeed'));
      return;
    }
    const day = clampPayDay(Number(payDay.replace(',', '.')));
    if (!day) {
      appAlert(
        revolving ? t('wealth.addCard') : t('wealth.addLoan'),
        t('wealth.debtPayDayNeed')
      );
      return;
    }
    const nextPaymentDate = nextPaymentIsoFromDay(day);

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        balance: parsedBalance as number,
        installment: parsedInstallment as number,
        interestRate: parsedRate,
        nextPaymentDate,
        kind,
        revolvingProduct: revolving ? product : undefined,
        creditLimit: withCupo ? parsedLimit ?? undefined : undefined,
        drawable: !revolving && drawable,
      };
      if (editingId) {
        const existing = debts.find((d) => d.id === editingId);
        const categoryId =
          existing?.categoryId ?? (await ensureDebtCategory(name.trim()));
        await updateDebt(editingId, { ...payload, categoryId });
        await updateBudget(categoryId, parsedInstallment as number);
      } else {
        const categoryId = await ensureDebtCategory(name.trim());
        await addDebt({ ...payload, categoryId });
        await updateBudget(categoryId, parsedInstallment as number);
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove(id: string, label: string) {
    appAlert(t('wealth.debtDelete'), label, [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('wealth.debtDelete'),
        style: 'destructive',
        onPress: () => {
          if (editingId === id) resetForm();
          void removeDebt(id);
        },
      },
    ]);
  }

  return {
    showForm,
    editingId,
    kind,
    fields: { name, balance, installment, rate, payDay, product, creditLimit, drawable },
    setName,
    setBalance,
    setInstallment,
    setRate,
    setPayDay,
    setProduct,
    setCreditLimit,
    setDrawable,
    saving,
    resetForm,
    startCreate,
    startEdit,
    handleSaveDebt,
    confirmRemove,
  };
}

export type DebtFormState = ReturnType<typeof useDebtForm>;
