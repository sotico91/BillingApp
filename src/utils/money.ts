import type { Currency } from '@/src/types/settings';

export function formatMoney(amount: number, currency: Currency): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
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
