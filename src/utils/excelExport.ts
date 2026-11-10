import * as XLSX from 'xlsx';

import type { Transaction } from '@/src/types/finance';
import { movementCells, movementHeader, type CsvExportContext } from '@/src/utils/movementRows';
import { isMonthOutflow, revolvingDebtIds, sumByType } from '@/src/utils/financeMath';

/**
 * Excel of one calendar year for Rumi Pro: a "Resumen" sheet with the 12
 * months side by side and one sheet per month with its movements and totals.
 * Calendar months (not the pay-day month), as an accountant reads them.
 */

type Cell = string | number;

export type YearSheets = {
  summary: Cell[][];
  months: { name: string; rows: Cell[][] }[];
};

/** Years that have movements, newest first. */
export function yearsWithMovements(transactions: Transaction[]): number[] {
  const years = new Set<number>();
  for (const tx of transactions) {
    const y = new Date(tx.createdAt).getFullYear();
    if (Number.isFinite(y)) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

function monthName(monthIndex: number, language: 'es' | 'en'): string {
  const name = new Date(2026, monthIndex, 1).toLocaleDateString(
    language === 'es' ? 'es-CO' : 'en-US',
    { month: 'long' }
  );
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** The sheets as plain rows, so they can be tested without writing a file. */
export function buildYearSheets(
  transactions: Transaction[],
  year: number,
  ctx: CsvExportContext
): YearSheets {
  const { t } = ctx;
  const language = ctx.language === 'es' ? 'es' : 'en';
  const revolving = revolvingDebtIds(ctx.debts);
  const summary: Cell[][] = [
    [t('excel.summaryTitle', { year })],
    [],
    [t('excel.month'), t('excel.income'), t('excel.out'), t('excel.balance'), t('excel.count')],
  ];
  const months: YearSheets['months'] = [];
  let totalIn = 0;
  let totalOut = 0;
  let totalCount = 0;

  for (let m = 0; m < 12; m += 1) {
    const from = new Date(year, m, 1).getTime();
    const to = new Date(year, m + 1, 1).getTime();
    const txs = transactions
      .filter((tx) => {
        const at = new Date(tx.createdAt).getTime();
        return at >= from && at < to;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const income = sumByType(txs, 'income');
    const out = txs.filter((tx) => isMonthOutflow(tx, revolving)).reduce((s, tx) => s + tx.amount, 0);
    const name = monthName(m, language);
    summary.push([name, income, out, income - out, txs.length]);
    totalIn += income;
    totalOut += out;
    totalCount += txs.length;

    const rows: Cell[][] = [movementHeader(t), ...txs.map((tx) => movementCells(tx, ctx))];
    rows.push([]);
    rows.push([t('excel.income'), '', income]);
    rows.push([t('excel.out'), '', out]);
    rows.push([t('excel.balance'), '', income - out]);
    months.push({ name, rows });
  }
  summary.push([t('excel.total'), totalIn, totalOut, totalIn - totalOut, totalCount]);
  summary.push([]);
  summary.push([t('excel.outNote')]);
  return { summary, months };
}

/** The .xlsx file bytes. Sheet names are unique and at most 31 characters. */
export function writeYearWorkbook(
  transactions: Transaction[],
  year: number,
  ctx: CsvExportContext
): Uint8Array {
  const { summary, months } = buildYearSheets(transactions, year, ctx);
  const book = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(summary);
  summarySheet['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(book, summarySheet, ctx.t('excel.summarySheet').slice(0, 31));
  for (const month of months) {
    const sheet = XLSX.utils.aoa_to_sheet(month.rows);
    sheet['!cols'] = [
      { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 24 }, { wch: 18 },
      { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(book, sheet, month.name.slice(0, 31));
  }
  const out = XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(out);
}
