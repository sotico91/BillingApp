import { interpolate } from '@/src/i18n/interpolate';
import { translations, type TranslationKey } from '@/src/i18n/translations';
import type { Transaction } from '@/src/types/finance';
import { askRumi } from '@/src/utils/ask';
import { affordTarget } from '@/src/utils/ask/planning';
import { setMonthStartDay } from '@/src/utils/financeMath';
import { formatMoney } from '@/src/utils/money';

function translator(lang: 'en' | 'es') {
  const dict = translations[lang] as Record<string, string>;
  return (key: TranslationKey, params?: Record<string, string | number>) =>
    interpolate(dict[key] ?? key, params);
}
const format = (n: number) => formatMoney(n, 'COP');

let seq = 0;
function tx(type: Transaction['type'], amount: number, when: string): Transaction {
  seq += 1;
  return {
    id: `t${seq}`,
    type,
    amount,
    createdAt: new Date(when).toISOString(),
    accountId: 'cash',
    categoryId: type === 'income' ? 'salario' : 'mercado',
  };
}

// About 1.000.000 left each month in Aug, Sep, Oct.
const data = ['08', '09', '10'].flatMap((m) => [
  tx('income', 3_000_000, `2026-${m}-01T09:00`),
  tx('expense', 2_000_000, `2026-${m}-10T09:00`),
]);

const NOW = new Date('2026-11-09T12:00:00');
beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
afterEach(() => {
  jest.useRealTimers();
  setMonthStartDay(1);
});

const ask = (q: string, isPro = true, language: 'es' | 'en' = 'es') =>
  askRumi(q, data, format, translator(language), { language, isPro, availableCash: 500_000 });

describe('afford later', () => {
  it('reads the target month', () => {
    expect(affordTarget('me alcanza para un viaje de 2 millones en diciembre', NOW)).toEqual({
      months: 1,
      year: 2026,
      monthIndex: 11,
    });
    expect(affordTarget('me alcanza para 2 millones en marzo', NOW)?.months).toBe(4);
    expect(affordTarget('me alcanza en 3 meses', NOW)?.months).toBe(3);
    expect(affordTarget('can i afford 500 in may', NOW)?.year).toBe(2027);
    expect(affordTarget('me alcanza para 50 mil', NOW)).toBeNull();
    expect(affordTarget('me alcanza para 50 mil en noviembre', NOW)).toBeNull();
  });

  it('fits: says how much to put aside per month and fortnight', () => {
    const r = ask('¿me alcanza para un viaje de 2 millones en marzo?');
    expect(r.intent).toBe('afford');
    expect(r.proFeature).toBeUndefined();
    expect(r.text).toContain('Sí te alcanza');
    expect(r.text).toContain('500.000 al mes');
    expect(r.text).toContain('250.000 por quincena');
  });

  it('does not fit: says the gap and when it would', () => {
    const r = ask('¿me alcanza para 3 millones en diciembre?');
    expect(r.text).toContain('no llegas');
    expect(r.text).toMatch(/lo juntas en Febrero 2027/);
  });

  it('free plan: a teaser and the Pro button', () => {
    const r = ask('¿me alcanza para 2 millones en marzo?', false);
    expect(r.proFeature).toBe('afford');
    expect(r.text).toContain('Rumi Pro');
    expect(r.followUps).toEqual([]);
  });

  it('this month stays free and works as before', () => {
    const r = ask('¿me alcanza para 50 mil?', false);
    expect(r.intent).toBe('afford');
    expect(r.proFeature).toBeUndefined();
  });

  it('works in English', () => {
    const r = ask('can i afford 2000000 by march?', true, 'en');
    expect(r.text).toContain('it fits');
  });
});
