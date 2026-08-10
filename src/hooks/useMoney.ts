import { useSettings } from '@/src/hooks/useSettings';
import { formatMoney, parseAmountInput } from '@/src/utils/money';

export function useMoney() {
  const { settings } = useSettings();

  return {
    currency: settings.currency,
    format: (amount: number) => formatMoney(amount, settings.currency),
    parse: (value: string) => parseAmountInput(value, settings.currency),
  };
}
