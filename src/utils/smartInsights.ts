import { CATEGORIES } from '@/src/data/financeDefaults';
import type { TranslationKey } from '@/src/i18n/translations';
import type { Period, Transaction } from '@/src/types/finance';
import {
  antExpenseBreakdown,
  filterBetween,
  filterByPeriod,
  previousMonthRange,
  sumByType,
} from '@/src/utils/financeMath';

export type InsightCard = {
  id: string;
  tone: 'warn' | 'good' | 'info';
  text: string;
};

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

type AskOptions = {
  defaultPeriod?: Period;
  debtsTotal?: number;
  availableCash?: number;
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  cafe: ['cafe', 'café', 'coffee', 'cafes'],
  delivery: ['delivery', 'domicilio', 'domicilios', 'uber eats', 'rappi'],
  snacks: ['snack', 'snacks', 'antojo', 'antojos'],
  alimentacion: [
    'alimentacion',
    'alimentación',
    'comida',
    'restaurant',
    'restaurante',
    'restaurantes',
    'food',
    'almuerzo',
    'cena',
  ],
  transporte: [
    'transporte',
    'transport',
    'gasolina',
    'uber',
    'taxi',
    'bus',
    'metro',
    'combustible',
  ],
  entretenimiento: ['entretenimiento', 'entertainment', 'ocio', 'cine', 'salida'],
  compras: ['compras', 'shopping', 'ropa', 'amazon'],
  vivienda: ['vivienda', 'housing', 'arriendo', 'renta', 'alquiler', 'rent'],
  suscripciones: ['suscripciones', 'subscriptions', 'netflix', 'spotify', 'gym', 'gimnasio'],
  salud: ['salud', 'health', 'medico', 'médico', 'farmacia'],
  ingresos: ['ingresos', 'income', 'salario', 'sueldo', 'nomina', 'nómina', 'payroll'],
  otros: ['otros', 'other', 'miscelaneos', 'varios'],
};

const FOOD_GROUP = ['alimentacion', 'delivery', 'cafe', 'snacks'];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(normalize(n)));
}

export function buildSmartInsights(
  transactions: Transaction[],
  t: TFn,
  format: (n: number) => string
): InsightCard[] {
  const thisMonth = filterByPeriod(transactions, 'mes');
  const { from, to } = previousMonthRange();
  const lastMonth = filterBetween(transactions, from, to);

  const spendNow = sumByType(thisMonth, 'expense');
  const spendPrev = sumByType(lastMonth, 'expense');
  const incomeNow = sumByType(thisMonth, 'income');
  const ant = antExpenseBreakdown(thisMonth);
  const cards: InsightCard[] = [];

  if (spendPrev > 0) {
    const delta = ((spendNow - spendPrev) / spendPrev) * 100;
    if (Math.abs(delta) >= 5) {
      cards.push({
        id: 'spend-delta',
        tone: delta > 0 ? 'warn' : 'good',
        text:
          delta > 0
            ? t('smart.spentMore', { percent: Math.round(delta) })
            : t('smart.spentLess', { percent: Math.round(Math.abs(delta)) }),
      });
    }
  }

  const deliveryNow = thisMonth
    .filter((x) => x.categoryId === 'delivery' && x.type === 'expense')
    .reduce((s, x) => s + x.amount, 0);
  const deliveryPrev = lastMonth
    .filter((x) => x.categoryId === 'delivery' && x.type === 'expense')
    .reduce((s, x) => s + x.amount, 0);
  if (deliveryNow > deliveryPrev && deliveryNow > 0) {
    cards.push({
      id: 'delivery-up',
      tone: 'warn',
      text: t('smart.deliveryUp', { amount: format(deliveryNow - deliveryPrev) }),
    });
  }

  const saved = incomeNow - spendNow;
  if (saved > 0) {
    cards.push({
      id: 'saved',
      tone: 'good',
      text: t('smart.savedMore', { amount: format(saved) }),
    });
  }

  if (ant.total > 0) {
    cards.push({
      id: 'ant',
      tone: 'info',
      text: t('smart.antTotal', { amount: format(ant.total) }),
    });
  }

  if (cards.length === 0) {
    cards.push({
      id: 'empty',
      tone: 'info',
      text: t('smart.empty'),
    });
  }

  return cards.slice(0, 5);
}

function resolvePeriod(
  q: string,
  defaultPeriod: Period
): { key: 'hoy' | 'semana' | 'mes' | 'anio' | 'mesPasado'; labelKey: TranslationKey } {
  if (includesAny(q, ['mes pasado', 'last month', 'pasado'])) {
    return { key: 'mesPasado', labelKey: 'search.periodLastMonth' };
  }
  if (includesAny(q, ['hoy', 'today', 'este dia', 'el dia'])) {
    return { key: 'hoy', labelKey: 'period.hoy' };
  }
  if (includesAny(q, ['semana', 'week'])) {
    return { key: 'semana', labelKey: 'period.semana' };
  }
  if (includesAny(q, ['ano', 'año', 'year', 'anual', 'este ano'])) {
    return { key: 'anio', labelKey: 'search.periodYear' };
  }
  if (includesAny(q, ['mes', 'month'])) {
    return { key: 'mes', labelKey: 'period.mes' };
  }
  if (defaultPeriod === 'hoy') return { key: 'hoy', labelKey: 'period.hoy' };
  if (defaultPeriod === 'semana') return { key: 'semana', labelKey: 'period.semana' };
  return { key: 'mes', labelKey: 'period.mes' };
}

function txsForPeriod(
  transactions: Transaction[],
  periodKey: 'hoy' | 'semana' | 'mes' | 'anio' | 'mesPasado'
): Transaction[] {
  if (periodKey === 'mesPasado') {
    const { from, to } = previousMonthRange();
    return filterBetween(transactions, from, to);
  }
  if (periodKey === 'anio') {
    const year = new Date().getFullYear();
    return transactions.filter((x) => new Date(x.createdAt).getFullYear() === year);
  }
  return filterByPeriod(transactions, periodKey);
}

function detectCategories(q: string): { ids: string[]; label: string } | null {
  // Food / restaurant group when asking broadly about eating out / food.
  if (includesAny(q, ['restaurante', 'restaurantes', 'restaurant', 'comida', 'food'])) {
    return { ids: FOOD_GROUP, label: 'food-group' };
  }

  for (const cat of CATEGORIES) {
    const aliases = CATEGORY_ALIASES[cat.id] ?? [cat.id];
    if (includesAny(q, aliases)) {
      return { ids: [cat.id], label: cat.id };
    }
  }
  return null;
}

function detectPaymentMethod(q: string): 'cash' | 'debit' | 'credit' | 'transfer' | null {
  if (includesAny(q, ['efectivo', 'cash'])) return 'cash';
  if (includesAny(q, ['debito', 'débito', 'debit'])) return 'debit';
  if (includesAny(q, ['tarjeta', 'credito', 'crédito', 'credit', 'card'])) return 'credit';
  if (includesAny(q, ['transferencia', 'transferencias', 'transfer'])) return 'transfer';
  return null;
}

function extractNoteNeedle(q: string): string | null {
  // “a Juan”, “para Ana”, quotes, or residual tokens after removing stopwords — keep simple.
  const quoted = q.match(/["“']([^"”']+)["”']/);
  if (quoted?.[1]) return normalize(quoted[1]);

  const para = q.match(/\b(?:a|para|por|to)\s+([a-záéíóúñ]{2,})/i);
  if (para?.[1] && !includesAny(para[1], ['mes', 'semana', 'ano', 'hoy', 'tarjeta', 'cuenta'])) {
    return normalize(para[1]);
  }
  return null;
}

/**
 * Answers finance questions from the user's own data.
 * Always tries to match the intent of the question instead of defaulting blindly.
 */
export function answerFinanceQuery(
  query: string,
  transactions: Transaction[],
  format: (n: number) => string,
  t: TFn,
  options: AskOptions = {}
): string {
  const raw = query.trim();
  if (!raw) return t('search.needQuestion');

  const q = normalize(raw);
  const period = resolvePeriod(q, options.defaultPeriod ?? 'mes');
  const list = txsForPeriod(transactions, period.key);
  const periodLabel = t(period.labelKey);

  const wantsCount = includesAny(q, [
    'cuantas',
    'cuántas',
    'cuantos',
    'cuántos',
    'how many',
    'veces',
    'times',
    'conteo',
  ]);
  const wantsIncome = includesAny(q, [
    'ingreso',
    'ingresos',
    'salario',
    'sueldo',
    'income',
    'gane',
    'gané',
    'recibi',
    'recibí',
    'cobre',
    'cobré',
  ]);
  const wantsSavings = includesAny(q, [
    'ahorro',
    'ahorros',
    'savings',
    'sobro',
    'sobró',
    'me queda',
    'balance',
  ]);
  const wantsAnt = includesAny(q, ['hormiga', 'hormigas', 'ant', 'pequeno', 'pequeño']);
  const wantsDebt = includesAny(q, ['deuda', 'deudas', 'debt', 'loan']);
  const wantsAvailable = includesAny(q, [
    'disponible',
    'available',
    'liquidez',
    'cuanto tengo',
    'cuánto tengo',
  ]);
  const wantsCompare = includesAny(q, [
    'mas que',
    'más que',
    'more than',
    'menos que',
    'less than',
    'compar',
    'aumento',
    'vs',
    'versus',
    'respecto',
  ]);
  const wantsTransfer = includesAny(q, ['transferencia', 'transferencias', 'transfer', 'envie', 'envié']);

  const cats = detectCategories(q);
  const method = detectPaymentMethod(q);
  const noteNeedle = extractNoteNeedle(q);

  const categoryLabel = (id: string) => t(`category.${id}` as TranslationKey);

  // --- Specific intents (order matters) ---

  if (wantsAvailable && options.availableCash != null) {
    return t('search.answerAvailable', { amount: format(options.availableCash) });
  }

  if (wantsDebt && options.debtsTotal != null) {
    return t('search.answerDebt', { amount: format(options.debtsTotal) });
  }

  if (wantsAnt) {
    const ant = antExpenseBreakdown(list);
    return t('search.answerAntPeriod', {
      amount: format(ant.total),
      period: periodLabel,
    });
  }

  if (wantsCompare) {
    const { from, to } = previousMonthRange();
    const prev = filterBetween(transactions, from, to);
    const nowSpend = sumByType(filterByPeriod(transactions, 'mes'), 'expense');
    const prevSpend = sumByType(prev, 'expense');
    const diff = nowSpend - prevSpend;
    return t('search.answerCompare', {
      amount: format(Math.abs(diff)),
      direction: diff >= 0 ? t('search.more') : t('search.less'),
    });
  }

  if (wantsSavings) {
    const income = sumByType(list, 'income');
    const expense = sumByType(list, 'expense');
    const saved = income - expense;
    return t('search.answerSavings', {
      amount: format(saved),
      period: periodLabel,
      income: format(income),
      expenses: format(expense),
    });
  }

  if (wantsIncome || cats?.ids.includes('ingresos')) {
    const amount = sumByType(list, 'income');
    const count = list.filter((x) => x.type === 'income').length;
    if (wantsCount) {
      return t('search.answerCount', {
        count,
        label: t('home.income'),
        period: periodLabel,
      });
    }
    return t('search.answerIncome', {
      amount: format(amount),
      period: periodLabel,
    });
  }

  if (wantsTransfer || (method === 'transfer' && includesAny(q, ['envie', 'envié', 'mande', 'mandé']))) {
    let transfers = list.filter((x) => x.type === 'transfer');
    if (noteNeedle) {
      transfers = transfers.filter((x) => normalize(x.note ?? '').includes(noteNeedle));
    }
    const amount = transfers.reduce((s, x) => s + x.amount, 0);
    if (noteNeedle) {
      return t('search.answerNote', {
        label: noteNeedle,
        amount: format(amount),
        period: periodLabel,
        count: transfers.length,
      });
    }
    return t('search.answerTransferPeriod', {
      amount: format(amount),
      period: periodLabel,
    });
  }

  // Category-specific expense (or food group)
  if (cats && !cats.ids.includes('ingresos')) {
    let matched = list.filter(
      (x) => x.type === 'expense' && x.categoryId && cats.ids.includes(x.categoryId)
    );
    if (method) {
      matched = matched.filter((x) => x.paymentMethod === method);
    }
    const amount = matched.reduce((s, x) => s + x.amount, 0);
    const label =
      cats.label === 'food-group'
        ? t('search.labelFood')
        : cats.ids.map(categoryLabel).join(' + ');

    if (wantsCount) {
      return t('search.answerCount', {
        count: matched.length,
        label,
        period: periodLabel,
      });
    }
    if (method) {
      return t('search.answerCategoryMethod', {
        label,
        method: t(`method.${method}` as TranslationKey),
        amount: format(amount),
        period: periodLabel,
      });
    }
    return t('search.answerCategory', {
      label,
      amount: format(amount),
      period: periodLabel,
      count: matched.length,
    });
  }

  // Payment method only (e.g. “cuánto gasté con tarjeta”)
  if (method) {
    const matched = list.filter(
      (x) => x.type === 'expense' && x.paymentMethod === method
    );
    const amount = matched.reduce((s, x) => s + x.amount, 0);
    if (wantsCount) {
      return t('search.answerCount', {
        count: matched.length,
        label: t(`method.${method}` as TranslationKey),
        period: periodLabel,
      });
    }
    return t('search.answerMethod', {
      method: t(`method.${method}` as TranslationKey),
      amount: format(amount),
      period: periodLabel,
    });
  }

  // Free-text note / person match
  if (noteNeedle) {
    const matched = list.filter((x) => normalize(x.note ?? '').includes(noteNeedle));
    const amount = matched.reduce((s, x) => s + x.amount, 0);
    return t('search.answerNote', {
      label: noteNeedle,
      amount: format(amount),
      period: periodLabel,
      count: matched.length,
    });
  }

  // Explicit total spend question
  if (
    includesAny(q, [
      'gaste',
      'gasté',
      'gasto',
      'gastos',
      'spend',
      'spent',
      'expense',
      'expenses',
      'cuanto',
      'cuánto',
      'total',
    ])
  ) {
    const amount = sumByType(list, 'expense');
    const count = list.filter((x) => x.type === 'expense').length;
    if (wantsCount) {
      return t('search.answerCount', {
        count,
        label: t('home.expenses'),
        period: periodLabel,
      });
    }
    return t('search.answerExpenses', {
      amount: format(amount),
      period: periodLabel,
      count,
    });
  }

  // Could not confidently map the question — explain instead of inventing a wrong total.
  return t('search.answerUnclear', {
    examples: t('search.examples'),
  });
}
