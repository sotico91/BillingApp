import type { Currency } from '@/src/types/settings';

/**
 * Keep currency symbol, sign and digits on one visual line.
 * RN Text often wraps after `$` even with NBSP; drop that gap and glue the sign.
 */
function keepMoneyOnOneLine(formatted: string): string {
  return formatted
    .replace(/([\-\u2212])[\s\u00A0]*/u, '$1\u2060')
    .replace(/([\$\u00A2\u20AC\u00A3\u20B1])[\s\u00A0]+/u, '$1')
    .replace(/[\s\u00A0]+/g, '\u00A0');
}

export function formatMoney(amount: number, currency: Currency): string {
  if (currency === 'USD') {
    return keepMoneyOnOneLine(
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    );
  }

  return keepMoneyOnOneLine(
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Math.round(amount))
  );
}

/** Mask used when amounts are hidden for privacy. */
export function maskMoney(currency: Currency): string {
  return currency === 'USD' ? '$*****.**' : '$*****';
}

/** @deprecated use formatMoney with currency from settings */
export function formatCOP(amount: number): string {
  return formatMoney(amount, 'COP');
}

export function parseAmountInput(value: string, currency: Currency = 'COP'): number | null {
  if (currency === 'USD') {
    const cleaned = value.replace(/[^\d.]/g, '');
    if (!cleaned) return null;
    const amount = Number(cleaned);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return Math.round(amount * 100) / 100;
  }

  const cleaned = value.replace(/[^\d]/g, '');
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}
