import { useSettings } from '@/src/hooks/useSettings';
import { useAmountPrivacy } from '@/src/hooks/useAmountPrivacy';
import { formatMoney, maskMoney, parseAmountInput } from '@/src/utils/money';

type FormatOptions = {
  /**
   * Always show the real amount (e.g. while typing in a form).
   * Display surfaces should omit this so privacy masking applies.
   */
  reveal?: boolean;
};

export function useMoney() {
  const { settings } = useSettings();
  const { amountsVisible, toggleAmountsVisible } = useAmountPrivacy();

  return {
    currency: settings.currency,
    amountsVisible,
    toggleAmountsVisible,
    format: (amount: number, opts?: FormatOptions) => {
      if (!amountsVisible && !opts?.reveal) {
        return maskMoney(settings.currency);
      }
      return formatMoney(amount, settings.currency);
    },
    /** Always formats the real amount — for editors / confirm dialogs. */
    formatPlain: (amount: number) => formatMoney(amount, settings.currency),
    parse: (value: string) => parseAmountInput(value, settings.currency),
  };
}
