import * as XLSX from 'xlsx';

import { interpolate } from '@/src/i18n/interpolate';
import { translations, type TranslationKey } from '@/src/i18n/translations';
import type { Transaction } from '@/src/types/finance';
import { buildYearSheets, writeYearWorkbook, yearsWithMovements } from '@/src/utils/excelExport';
import { freeAllows } from '@/src/utils/pro';


const dict = translations.es as Record<string, string>;
const t = (key: TranslationKey, params?: Record<string, string | number>) =>
  interpolate(dict[key] ?? key, params);
const ctx = { language: 'es' as const, t, accounts: [], debts: [], spendConcepts: [] };

let seq = 0;
function tx(type: Transaction['type'], amount: number, when: string): Transaction {
  seq += 1;
  return { id: `t${seq}`, type, amount, createdAt: new Date(when).toISOString(), accountId: 'cash' };
}

const data = [
  tx('income', 3_000_000, '2026-01-01T09:00'),
  tx('expense', 50_000, '2026-01-15T09:00'),
  tx('expense', 20_000, '2026-03-02T09:00'),
  tx('transfer', 100_000, '2026-03-03T09:00'),
  tx('expense', 10_000, '2025-12-31T23:00'),
];

describe('Excel export', () => {
  it('lists years newest first', () => {
    expect(yearsWithMovements(data)).toEqual([2026, 2025]);
  });

  it('summary has 12 months, totals per month and for the year', () => {
    const { summary, months } = buildYearSheets(data, 2026, ctx);
    expect(months).toHaveLength(12);
    expect(months[0].name).toBe('Enero');
    expect(summary[3]).toEqual(['Enero', 3_000_000, 50_000, 2_950_000, 2]);
    expect(summary[5]).toEqual(['Marzo', 0, 20_000, -20_000, 2]);
    expect(summary[15]).toEqual(['Total', 3_000_000, 70_000, 2_930_000, 4]);
  });

  it('each month sheet lists its movements and closes with totals', () => {
    const { months } = buildYearSheets(data, 2026, ctx);
    const march = months[2].rows;
    expect(march[0][0]).toBe('Fecha');
    expect(march).toHaveLength(1 + 2 + 1 + 3);
    expect(march[march.length - 1]).toEqual(['Balance', '', -20_000]);
  });

  it('writes a real workbook: Resumen plus one sheet per month', () => {
    const bytes = writeYearWorkbook(data, 2026, ctx);
    const book = XLSX.read(bytes, { type: 'array' });
    expect(book.SheetNames).toHaveLength(13);
    expect(book.SheetNames[0]).toBe('Resumen');
    expect(book.SheetNames[12]).toBe('Diciembre');
  });

  it('exports are Pro only', () => {
    expect(freeAllows('export', 0)).toBe(false);
  });
});
