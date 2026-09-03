import { CATEGORIES } from '@/src/data/financeDefaults';
import {
  CREDITS_CONCEPT_ID,
  findSpendSub,
  flattenSpendSubs,
  findConceptById,
} from '@/src/data/spendConcepts';
import type { TranslationKey } from '@/src/i18n/translations';
import type { Account, Period, Transaction, Debt } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { categoryLabel as resolveCategoryLabel } from '@/src/utils/categoryLabel';
import { accountDisplayName } from '@/src/utils/accounts';
import {
  antExpenseBreakdown,
  calendarMonthRange,
  filterBetween,
  filterByPeriod,
  previousMonthRange,
  sumByType,
  sumSpendOut,
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
  spendConcepts?: SpendConcept[];
  budgetStatus?: { categoryId: string; ratio: number; limit: number }[];
  debts?: Debt[];
  language?: 'en' | 'es';
  accounts?: Account[];
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
    'uber',
    'taxi',
    'bus',
    'metro',
  ],
  gasolina: ['gasolina', 'combustible', 'fuel', 'gasolina', 'petrol'],
  entretenimiento: ['entretenimiento', 'entertainment', 'ocio', 'salida'],
  cine: ['cine', 'cinema', 'pelicula', 'película', 'movie'],
  compras: ['compras', 'shopping', 'ropa', 'amazon'],
  vivienda: ['vivienda', 'housing', 'arriendo', 'renta', 'alquiler', 'rent'],
  luz: ['luz', 'energia', 'energía', 'electricidad', 'electricity'],
  agua: ['agua', 'water', 'acueducto'],
  gas: ['gas hogar', 'gas natural', 'pipeta', 'recibo gas'],
  internet: ['internet', 'wifi', 'fibra', 'banda ancha'],
  telefonia: [
    'telefonia',
    'telefonía',
    'celular',
    'movil',
    'móvil',
    'plan datos',
    'phone',
  ],
  suscripciones: ['suscripciones', 'subscriptions', 'netflix', 'spotify'],
  salud: [
    'salud',
    'health',
    'medico',
    'médico',
    'farmacia',
    'ejercicio',
    'gym',
    'gimnasio',
    'deporte',
    'entrenamiento',
  ],
  educacion: ['educacion', 'educación', 'colegio', 'universidad', 'curso'],
  salario: ['salario', 'sueldo', 'nomina', 'nómina', 'payroll', 'salary'],
  freelance: ['freelance', 'independiente', 'honorarios', 'consultoria', 'consultoría'],
  bonos: ['bono', 'bonos', 'bonus', 'comision', 'comisión', 'comisiones'],
  reembolsos: ['reembolso', 'reembolsos', 'refund', 'devolucion', 'devolución'],
  ingresos: ['ingresos', 'income', 'otros ingresos'],
  otros: ['otros', 'other', 'miscelaneos', 'varios'],
};

function hasStem(haystack: string, stem: string): boolean {
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(stem)}`).test(haystack);
}

function isIncomeUsedAsReference(q: string): boolean {
  return (
    hasStem(q, 'consum') ||
    includesAny(q, [
      'de mi salario',
      'del salario',
      'de mi sueldo',
      'del sueldo',
      'de mi ingreso',
      'de mis ingresos',
      'del ingreso',
      'de los ingresos',
      'of my salary',
      'of my income',
      'of income',
      '% de mi',
      'porcentaje de mi',
      'percent of my',
      'percent of income',
    ])
  );
}

function skipIncomeCategoryMatch(q: string): boolean {
  return (
    isIncomeUsedAsReference(q) ||
    hasStem(q, 'gast') ||
    hasStem(q, 'ahorr') ||
    hasStem(q, 'categ') ||
    includesAny(q, ['%', 'porcentaje', 'percent', 'spend', 'spent', 'save', 'saved'])
  );
}

const INCOME_CATEGORY_IDS = ['salario', 'freelance', 'bonos', 'reembolsos', 'ingresos'];

const FOOD_GROUP = ['alimentacion', 'delivery', 'cafe', 'snacks'];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Phrase/word match. Avoids short needles like "ant" matching inside "cuanto".
 */
function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => {
    const needle = normalize(n);
    if (!needle) return false;
    if (needle.includes(' ')) return haystack.includes(needle);
    const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(needle)}(?:[^a-z0-9]|$)`);
    return re.test(haystack);
  });
}

function sumExpenseCategory(list: Transaction[], categoryId: string): number {
  return list
    .filter((x) => x.type === 'expense' && x.categoryId === categoryId)
    .reduce((s, x) => s + x.amount, 0);
}

/** Only categories with real spend in both periods (or growth from a prior base). */
function topRisingExpenseCategory(
  thisMonth: Transaction[],
  lastMonth: Transaction[]
): { categoryId: string; delta: number } | null {
  const ids = new Set<string>();
  for (const t of [...thisMonth, ...lastMonth]) {
    if (t.type === 'expense' && t.categoryId) ids.add(t.categoryId);
  }

  let best: { categoryId: string; delta: number } | null = null;
  for (const categoryId of ids) {
    const now = sumExpenseCategory(thisMonth, categoryId);
    const prev = sumExpenseCategory(lastMonth, categoryId);
    // Require prior spend so we never "predict" a category the user never used.
    if (prev <= 0 || now <= prev) continue;
    const delta = now - prev;
    if (!best || delta > best.delta) {
      best = { categoryId, delta };
    }
  }
  return best;
}

function withAccruedInstallments(
  list: Transaction[],
  _debts: Debt[] | undefined,
  _periodKey: string
): Transaction[] {
  // Debts from Wealth are reminders until the user logs a real payment.
  // Do not invent virtual debt_payment rows for insights or search.
  return list;
}

export function buildSmartInsights(
  transactions: Transaction[],
  t: TFn,
  format: (n: number) => string,
  spendConcepts: SpendConcept[] = [],
  period: Period = 'mes',
  debts?: Debt[]
): InsightCard[] {
  const periodLabel = t(`period.${period}` as TranslationKey);
  const compareLabel =
    period === 'hoy'
      ? t('smart.compareYesterday')
      : period === 'semana'
        ? t('smart.compareLastWeek')
        : t('smart.compareLastMonth');

  const current = withAccruedInstallments(
    filterByPeriod(transactions, period),
    debts,
    period
  );
  const { from, to } =
    period === 'mes'
      ? previousMonthRange()
      : previousAnalogRange(period);
  const previous = filterBetween(transactions, from, to);

  const spendNow = sumSpendOut(current);
  const spendPrev = sumSpendOut(previous);
  const incomeNow = sumByType(current, 'income');
  const ant = antExpenseBreakdown(current, spendConcepts);
  const cards: InsightCard[] = [];
  const saved = incomeNow - spendNow;
  const hasMovements = current.length > 0;

  cards.push({
    id: 'snapshot',
    tone: !hasMovements ? 'info' : saved >= 0 ? 'good' : 'warn',
    text: hasMovements
      ? t('smart.snapshot', {
          period: periodLabel,
          expenses: format(spendNow),
          income: format(incomeNow),
          result: format(saved),
        })
      : t('smart.snapshotEmpty', { period: periodLabel }),
  });

  if (spendPrev > 0) {
    const delta = ((spendNow - spendPrev) / spendPrev) * 100;
    if (Math.abs(delta) >= 5) {
      cards.push({
        id: 'spend-delta',
        tone: delta > 0 ? 'warn' : 'good',
        text:
          delta > 0
            ? t('smart.spentMore', {
                percent: Math.round(delta),
                compare: compareLabel,
              })
            : t('smart.spentLess', {
                percent: Math.round(Math.abs(delta)),
                compare: compareLabel,
              }),
      });
    }
  } else if (spendNow > 0) {
    cards.push({
      id: 'no-compare',
      tone: 'info',
      text: t('smart.noCompare', { compare: compareLabel }),
    });
  }

  const rising = topRisingExpenseCategory(current, previous);
  if (rising) {
    cards.push({
      id: `rise-${rising.categoryId}`,
      tone: 'warn',
      text: t('smart.categoryUp', {
        category: resolveCategoryLabel(rising.categoryId, t, spendConcepts),
        compare: compareLabel,
      }),
    });
  }

  if (incomeNow > 0 && spendNow > 0) {
    const topPct = topCategoryByIncomePercent(current, incomeNow, spendConcepts);
    if (topPct && topPct.percent >= 15) {
      cards.push({
        id: 'top-income-share',
        tone: topPct.percent >= 30 ? 'warn' : 'info',
        text: t('smart.topIncomeShare', {
          category: resolveCategoryDisplayName(topPct.categoryId, spendConcepts, (id) =>
            resolveCategoryLabel(id, t, spendConcepts)
          ),
          percent: Math.round(topPct.percent),
          period: periodLabel,
        }),
      });
    }
    const spendShare = Math.round((spendNow / incomeNow) * 100);
    cards.push({
      id: 'spend-income-share',
      tone: spendShare >= 90 ? 'warn' : spendShare >= 70 ? 'info' : 'good',
      text: t('smart.spendIncomeShare', {
        percent: spendShare,
        period: periodLabel,
      }),
    });
  }

  if (ant.total > 0) {
    cards.push({
      id: 'ant',
      tone: 'info',
      text: t('smart.antTotal', {
        amount: format(ant.total),
        period: periodLabel,
      }),
    });
  }

  return cards.slice(0, 6);
}

/** Prior day / prior week window ending at the start of the current period. */
function previousAnalogRange(period: 'hoy' | 'semana', now = new Date()) {
  if (period === 'hoy') {
    const to = new Date(now);
    to.setHours(0, 0, 0, 0);
    const from = new Date(to);
    from.setDate(from.getDate() - 1);
    return { from, to };
  }
  const to = new Date(now);
  to.setHours(0, 0, 0, 0);
  const day = to.getDay();
  const diff = day === 0 ? 6 : day - 1;
  to.setDate(to.getDate() - diff);
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  return { from, to };
}

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const MONTHS_EN = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

const MONTH_INDEX: Record<string, number> = {
  enero: 0,
  january: 0,
  febrero: 1,
  february: 1,
  marzo: 2,
  march: 2,
  abril: 3,
  april: 3,
  mayo: 4,
  may: 4,
  junio: 5,
  june: 5,
  julio: 6,
  july: 6,
  agosto: 7,
  august: 7,
  septiembre: 8,
  setiembre: 8,
  september: 8,
  octubre: 9,
  october: 9,
  noviembre: 10,
  november: 10,
  diciembre: 11,
  december: 11,
};

type QueryPeriod = {
  label: string;
  from: Date;
  to: Date;
  analog: 'day' | 'week' | 'month' | 'year' | 'range';
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function monthLabel(monthIndex: number, language: 'en' | 'es'): string {
  const i = ((monthIndex % 12) + 12) % 12;
  const name = language === 'es' ? MONTHS_ES[i] : MONTHS_EN[i];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function parseYearToken(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  if (n < 100) return n >= 70 ? 1900 + n : 2000 + n;
  return n;
}

function dayPeriod(day: Date, language: 'en' | 'es'): QueryPeriod {
  const from = startOfDay(day);
  const to = addDays(from, 1);
  const label =
    language === 'es'
      ? `${from.getDate()} de ${monthLabel(from.getMonth(), 'es').toLowerCase()} ${from.getFullYear()}`
      : `${monthLabel(from.getMonth(), 'en')} ${from.getDate()}, ${from.getFullYear()}`;
  return { label, from, to, analog: 'day' };
}

function monthPeriod(
  year: number,
  monthIndex: number,
  language: 'en' | 'es'
): QueryPeriod {
  const { from, to } = calendarMonthRange(year, monthIndex);
  return {
    label: `${monthLabel(monthIndex, language)} ${year}`,
    from,
    to,
    analog: 'month',
  };
}

function yearPeriod(year: number, language: 'en' | 'es'): QueryPeriod {
  return {
    label: language === 'es' ? `el año ${year}` : `${year}`,
    from: new Date(year, 0, 1),
    to: new Date(year + 1, 0, 1),
    analog: 'year',
  };
}

function presetPeriod(
  preset: Period | 'anio' | 'mesPasado',
  language: 'en' | 'es',
  t: TFn,
  now = new Date()
): QueryPeriod {
  if (preset === 'mesPasado') {
    const { from, to } = previousMonthRange(now);
    return {
      label: t('search.periodLastMonth'),
      from,
      to,
      analog: 'month',
    };
  }
  if (preset === 'anio') {
    return yearPeriod(now.getFullYear(), language);
  }
  if (preset === 'hoy') {
    const from = startOfDay(now);
    return {
      label: t('period.hoy'),
      from,
      to: addDays(from, 1),
      analog: 'day',
    };
  }
  if (preset === 'semana') {
    const from = startOfDay(now);
    const day = from.getDay();
    const diff = day === 0 ? 6 : day - 1;
    from.setDate(from.getDate() - diff);
    return {
      label: t('period.semana'),
      from,
      to: addDays(startOfDay(now), 1),
      analog: 'week',
    };
  }
  const { from, to } = calendarMonthRange(now.getFullYear(), now.getMonth());
  return { label: t('period.mes'), from, to, analog: 'month' };
}

function analogRange(period: QueryPeriod): { from: Date; to: Date } {
  if (period.analog === 'month') {
    const prev = new Date(period.from);
    prev.setMonth(prev.getMonth() - 1);
    return calendarMonthRange(prev.getFullYear(), prev.getMonth());
  }
  if (period.analog === 'year') {
    const y = period.from.getFullYear() - 1;
    return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) };
  }
  const ms = Math.max(period.to.getTime() - period.from.getTime(), 24 * 60 * 60 * 1000);
  return {
    from: new Date(period.from.getTime() - ms),
    to: new Date(period.from.getTime()),
  };
}

function resolvePeriod(
  q: string,
  defaultPeriod: Period,
  language: 'en' | 'es',
  t: TFn,
  now = new Date()
): QueryPeriod {
  const yearNow = now.getFullYear();
  const monthAlt = 'septiembre|setiembre';
  const months =
    `enero|febrero|marzo|abril|mayo|junio|julio|agosto|${monthAlt}|octubre|noviembre|diciembre|` +
    'january|february|march|april|may|june|july|august|september|october|november|december';

  const dayMonth = q.match(
    new RegExp(
      `\\b(\\d{1,2})\\s+de\\s+(${months})(?:\\s+(?:de\\s+)?(\\d{4}))?\\b`
    )
  );
  if (dayMonth) {
    const monthIndex = MONTH_INDEX[dayMonth[2]];
    const year = parseYearToken(dayMonth[3], yearNow);
    const day = Number(dayMonth[1]);
    if (monthIndex != null && day >= 1 && day <= 31) {
      return dayPeriod(new Date(year, monthIndex, day), language);
    }
  }

  const numeric = q.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/);
  if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[2]);
    const year = parseYearToken(numeric[3], yearNow);
    const dayFirst = language === 'es' || a > 12;
    const day = dayFirst ? a : b;
    const monthIndex = (dayFirst ? b : a) - 1;
    if (monthIndex >= 0 && monthIndex <= 11 && day >= 1 && day <= 31) {
      return dayPeriod(new Date(year, monthIndex, day), language);
    }
  }

  const namedMonth = q.match(
    new RegExp(`\\b(?:en\\s+)?(${months})(?:\\s+(?:de\\s+)?(\\d{4}))?\\b`)
  );
  if (namedMonth) {
    const monthIndex = MONTH_INDEX[namedMonth[1]];
    if (monthIndex != null) {
      return monthPeriod(
        parseYearToken(namedMonth[2], yearNow),
        monthIndex,
        language
      );
    }
  }

  if (includesAny(q, ['anteayer', 'day before yesterday'])) {
    return dayPeriod(addDays(now, -2), language);
  }
  if (includesAny(q, ['ayer', 'yesterday'])) {
    return dayPeriod(addDays(now, -1), language);
  }
  if (includesAny(q, ['mes pasado', 'last month', 'el mes anterior', 'mes anterior'])) {
    return presetPeriod('mesPasado', language, t, now);
  }
  if (includesAny(q, ['ano pasado', 'año pasado', 'el ano pasado', 'el año pasado', 'last year'])) {
    return yearPeriod(yearNow - 1, language);
  }
  if (includesAny(q, ['hoy', 'today', 'esta manana', 'esta mañana'])) {
    return presetPeriod('hoy', language, t, now);
  }
  if (includesAny(q, ['esta semana', 'this week'])) {
    return presetPeriod('semana', language, t, now);
  }
  if (includesAny(q, ['este ano', 'este año', 'this year', 'en el ano', 'en el año'])) {
    return presetPeriod('anio', language, t, now);
  }
  const onlyYear = q.match(/\b(?:en\s+|del\s+|de\s+)?(20\d{2})\b/);
  if (onlyYear) {
    return yearPeriod(Number(onlyYear[1]), language);
  }
  if (includesAny(q, ['este mes', 'this month'])) {
    return presetPeriod('mes', language, t, now);
  }
  if (includesAny(q, ['semana', 'week']) && !includesAny(q, ['fin de semana', 'weekend'])) {
    return presetPeriod('semana', language, t, now);
  }
  if (includesAny(q, ['ano', 'año', 'year', 'anual'])) {
    return presetPeriod('anio', language, t, now);
  }
  if (includesAny(q, ['mes', 'month'])) {
    return presetPeriod('mes', language, t, now);
  }
  return presetPeriod(defaultPeriod, language, t, now);
}

function txsForPeriod(
  transactions: Transaction[],
  period: QueryPeriod
): Transaction[] {
  return filterBetween(transactions, period.from, period.to);
}

const STOPWORDS = new Set([
  'a', 'al', 'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'en', 'con', 'por', 'para', 'mi', 'mis', 'tu', 'tus', 'y', 'o', 'que', 'qué',
  'cuanto', 'cuánto', 'cuanta', 'cuánta', 'cuantos', 'cuántos', 'cuantas', 'cuántas',
  'gaste', 'gasté', 'gasto', 'gastos', 'pague', 'pagué', 'pago',
  'how', 'much', 'did', 'i', 'my', 'the', 'on', 'for', 'to', 'of', 'is', 'was',
  'spend', 'spent', 'expense', 'expenses', 'this', 'that', 'me', 'do', 'what',
  'cual', 'cuál', 'como', 'cómo', 'donde', 'dónde', 'hay', 'tiene', 'tengo',
  'sobre', 'about', 'fue', 'son', 'esta', 'está', 'este', 'estos',
]);

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9áéíóúñü]+/i)
    .map((t) => normalize(t))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function scorePhraseInQuery(q: string, phrase: string): number {
  const p = normalize(phrase);
  if (!p || p.length < 2) return 0;

  // Exact phrase / word-boundary hit (strongest).
  if (includesAny(q, [p])) {
    let score = 40 + Math.min(p.length, 30);
    if (p.includes(' ') || p.includes('/')) score += 15;
    return score;
  }

  const qTokens = new Set(tokenize(q));
  const pTokens = tokenize(p);
  if (pTokens.length === 0) return 0;

  let hits = 0;
  for (const token of pTokens) {
    if (qTokens.has(token)) {
      hits += 1;
      continue;
    }
    // Prefix match for partial typing (cafe → cafeteria) only if token is long enough.
    if (token.length >= 4) {
      for (const qt of qTokens) {
        if (qt.startsWith(token) || token.startsWith(qt)) {
          hits += 0.6;
          break;
        }
      }
    }
  }

  if (hits <= 0) return 0;
  const coverage = hits / pTokens.length;
  if (coverage < 0.5) return 0;
  return Math.round(12 + coverage * 20 + hits * 4);
}

type CategoryHit = {
  ids: string[];
  label: string;
  score: number;
  displayName?: string;
};

/**
 * Ranked match against user spend tree first, then legacy aliases.
 * Longer / more specific phrases win so "luz" beats vague concept names.
 */
function detectCategories(
  q: string,
  spendConcepts: SpendConcept[] = []
): CategoryHit | null {
  const candidates: CategoryHit[] = [];

  if (includesAny(q, ['restaurante', 'restaurantes', 'restaurant', 'comida', 'food', 'alimentos'])) {
    // Prefer user's food-like concept tree if present.
    const foodSubs = flattenSpendSubs(spendConcepts).filter((sub) => {
      const n = normalize(sub.name);
      return includesAny(n, [
        'comida',
        'alimento',
        'delivery',
        'domicilio',
        'cafe',
        'café',
        'snack',
        'restaurante',
        'almuerzo',
        'cena',
      ]);
    });
    if (foodSubs.length > 0) {
      candidates.push({
        ids: foodSubs.map((s) => s.id),
        label: 'food-group',
        score: 55,
        displayName: 'food-group',
      });
    } else {
      candidates.push({
        ids: FOOD_GROUP,
        label: 'food-group',
        score: 50,
        displayName: 'food-group',
      });
    }
  }

  for (const concept of spendConcepts) {
    for (const sub of concept.subs) {
      const slug = sub.id.replace(/^(sub-|custom-|concept-)/, '').replace(/-/g, ' ');
      const phrases = [
        `${concept.name}/${sub.name}`,
        `${concept.name} ${sub.name}`,
        sub.name,
        slug,
      ];
      let best = 0;
      for (const phrase of phrases) {
        best = Math.max(best, scorePhraseInQuery(q, phrase));
      }
      // Sub names outrank bare concept matches.
      if (best > 0) {
        candidates.push({
          ids: [sub.id],
          label: sub.id,
          score: best + 8,
          displayName: `${concept.name}/${sub.name}`,
        });
      }
    }

    const conceptPhrases =
      concept.id === CREDITS_CONCEPT_ID
        ? [concept.name, 'creditos', 'créditos', 'credito', 'crédito', 'cuotas']
        : [concept.name];
    let conceptScore = 0;
    for (const phrase of conceptPhrases) {
      conceptScore = Math.max(conceptScore, scorePhraseInQuery(q, phrase));
    }
    if (conceptScore > 0 && concept.subs.length > 0) {
      candidates.push({
        ids: concept.subs.map((s) => s.id),
        label: concept.id,
        score: conceptScore + 2,
        displayName: concept.name,
      });
    }
  }

  for (const cat of CATEGORIES) {
    if (skipIncomeCategoryMatch(q) && INCOME_CATEGORY_IDS.includes(cat.id)) continue;
    const aliases = CATEGORY_ALIASES[cat.id] ?? [cat.id];
    let best = 0;
    for (const alias of aliases) {
      best = Math.max(best, scorePhraseInQuery(q, alias));
    }
    if (best <= 0) continue;

    const fromTree = flattenSpendSubs(spendConcepts).filter((sub) => {
      const slug = sub.id.replace(/^(sub-|custom-|concept-)/, '');
      const subName = normalize(sub.name);
      return (
        sub.id === cat.id ||
        sub.id === `sub-${cat.id}` ||
        slug === cat.id ||
        subName === normalize(cat.id) ||
        aliases.some((a) => {
          const na = normalize(a);
          return subName === na || (na.length >= 3 && subName.includes(na));
        })
      );
    });

    if (fromTree.length > 0) {
      candidates.push({
        ids: fromTree.map((s) => s.id),
        label: fromTree[0].id,
        score: best + 5,
        displayName: fromTree.map((s) => s.name).join(' + '),
      });
    } else {
      candidates.push({
        ids: [cat.id],
        label: cat.id,
        score: best,
        displayName: cat.id,
      });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score || b.ids.length - a.ids.length);
  const top = candidates[0];
  // Ignore very weak matches (noise from stopwords / short tokens).
  if (top.score < 14) return null;
  return top;
}

function matchTransactionsToCategories(
  list: Transaction[],
  cats: CategoryHit,
  spendConcepts: SpendConcept[]
): Transaction[] {
  const idSet = new Set(cats.ids);
  return list.filter((x) => {
    // Debt payments from Wealth land on Credit subs — count them like expenses.
    if ((x.type !== 'expense' && x.type !== 'debt_payment') || !x.categoryId) {
      return false;
    }
    const categoryId = x.categoryId;
    if (idSet.has(categoryId)) return true;
    // Parent concept id (e.g. concept-creditos) should match all its subs.
    if (idSet.has(findSpendSub(spendConcepts, categoryId)?.concept.id ?? '')) {
      return true;
    }
    return cats.ids.some((id) => {
      if (categoryId === `sub-${id}` || id === `sub-${categoryId}`) return true;
      const hit = findSpendSub(spendConcepts, categoryId);
      if (!hit) return false;
      const slug = categoryId.replace(/^(sub-|custom-|concept-)/, '');
      return (
        slug === id ||
        normalize(hit.sub.name) === normalize(id) ||
        cats.ids.includes(hit.concept.id)
      );
    });
  });
}

function detectPaymentMethod(q: string): 'cash' | 'debit' | 'credit' | 'transfer' | null {
  if (includesAny(q, ['efectivo', 'cash'])) return 'cash';
  if (includesAny(q, ['debito', 'débito', 'debit'])) return 'debit';
  // Do NOT treat bare "crédito(s)" as card — that is the Créditos spend concept / installments.
  if (
    includesAny(q, [
      'tarjeta de credito',
      'tarjeta de crédito',
      'tarjeta credito',
      'tarjeta crédito',
      'credit card',
      'con tarjeta',
      'tarjeta',
      'card',
    ])
  ) {
    return 'credit';
  }
  if (includesAny(q, ['transferencia', 'transferencias', 'transfer'])) return 'transfer';
  return null;
}

function extractNoteNeedle(q: string): string | null {
  const quoted = q.match(/["“']([^"”']+)["”']/);
  if (quoted?.[1]) return normalize(quoted[1]);

  const para = q.match(/\b(?:a|para|por|to)\s+([a-záéíóúñ]{2,})/i);
  if (
    para?.[1] &&
    !includesAny(para[1], [
      'mes',
      'semana',
      'ano',
      'año',
      'hoy',
      'tarjeta',
      'cuenta',
      'mi',
      'la',
      'credito',
      'creditos',
      'cuota',
      'cuotas',
      'deuda',
      'deudas',
    ])
  ) {
    return normalize(para[1]);
  }
  return null;
}

function topExpenseCategory(
  list: Transaction[],
  spendConcepts: SpendConcept[]
): { categoryId: string; amount: number; count: number } | null {
  const map = new Map<string, { amount: number; count: number }>();
  for (const tx of list) {
    if ((tx.type !== 'expense' && tx.type !== 'debt_payment') || !tx.categoryId) continue;
    const cur = map.get(tx.categoryId) ?? { amount: 0, count: 0 };
    cur.amount += tx.amount;
    cur.count += 1;
    map.set(tx.categoryId, cur);
  }
  let best: { categoryId: string; amount: number; count: number } | null = null;
  for (const [categoryId, v] of map) {
    if (!best || v.amount > best.amount) {
      best = { categoryId, amount: v.amount, count: v.count };
    }
  }
  // Prefer grouping by parent concept when possible for clearer answers.
  if (!best) return null;
  const hit = findSpendSub(spendConcepts, best.categoryId);
  if (!hit) return best;
  let conceptAmount = 0;
  let conceptCount = 0;
  for (const sub of hit.concept.subs) {
    const v = map.get(sub.id);
    if (!v) continue;
    conceptAmount += v.amount;
    conceptCount += v.count;
  }
  if (conceptAmount >= best.amount) {
    return {
      categoryId: hit.concept.subs[0]?.id ?? best.categoryId,
      amount: conceptAmount,
      count: conceptCount,
    };
  }
  return best;
}

function expenseTotalsByConcept(
  list: Transaction[],
  spendConcepts: SpendConcept[]
): Map<string, { amount: number; count: number }> {
  const map = new Map<string, { amount: number; count: number }>();
  for (const tx of list) {
    if ((tx.type !== 'expense' && tx.type !== 'debt_payment') || !tx.categoryId) continue;
    const hit = findSpendSub(spendConcepts, tx.categoryId);
    const key = hit?.concept.id ?? tx.categoryId;
    const cur = map.get(key) ?? { amount: 0, count: 0 };
    cur.amount += tx.amount;
    cur.count += 1;
    map.set(key, cur);
  }
  return map;
}

function rankingDetail(
  list: Transaction[],
  spendConcepts: SpendConcept[],
  format: (n: number) => string,
  limit = 3
): string {
  const totals = [...expenseTotalsByConcept(list, spendConcepts).entries()].sort(
    (a, b) => b[1].amount - a[1].amount
  );
  return totals
    .slice(0, limit)
    .map(([id, v]) => {
      const concept = findConceptById(spendConcepts, id);
      const hit = findSpendSub(spendConcepts, id);
      const label = concept?.name ?? hit?.concept.name ?? id;
      return `${label} ${format(v.amount)}`;
    })
    .join(' · ');
}

function accountSpendDetail(
  list: Transaction[],
  accounts: Account[] | undefined,
  t: TFn,
  format: (n: number) => string
): string {
  const map = new Map<string, number>();
  for (const tx of list) {
    if (tx.type !== 'expense' && tx.type !== 'debt_payment') continue;
    const id = tx.accountId ?? 'cash';
    map.set(id, (map.get(id) ?? 0) + tx.amount);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, amount]) => {
      const acc = accounts?.find((a) => a.id === id);
      const label = acc ? accountDisplayName(acc, t) : id;
      return `${label} ${format(amount)}`;
    })
    .join(' · ');
}

function resolveCategoryDisplayName(
  categoryId: string,
  spendConcepts: SpendConcept[],
  categoryLabel: (id: string) => string
): string {
  const concept = findConceptById(spendConcepts, categoryId);
  if (concept?.name) return concept.name;
  const hit = findSpendSub(spendConcepts, categoryId);
  if (hit) return hit.concept.name;
  return categoryLabel(categoryId);
}

function topCategoryByIncomePercent(
  list: Transaction[],
  income: number,
  spendConcepts: SpendConcept[]
): { categoryId: string; amount: number; count: number; percent: number } | null {
  if (income <= 0) return null;
  const map = expenseTotalsByConcept(list, spendConcepts);
  let best: { categoryId: string; amount: number; count: number; percent: number } | null =
    null;
  for (const [categoryId, v] of map) {
    const percent = (v.amount / income) * 100;
    if (
      !best ||
      percent > best.percent ||
      (percent === best.percent && v.amount > best.amount)
    ) {
      best = { categoryId, amount: v.amount, count: v.count, percent };
    }
  }
  return best;
}

function rankCategoriesByIncomePercent(
  list: Transaction[],
  income: number,
  spendConcepts: SpendConcept[],
  categoryLabel: (id: string) => string,
  limit = 5
): Array<{ label: string; percent: number; amount: number }> {
  if (income <= 0) return [];
  const map = expenseTotalsByConcept(list, spendConcepts);
  return Array.from(map.entries())
    .map(([categoryId, v]) => ({
      label: resolveCategoryDisplayName(categoryId, spendConcepts, categoryLabel),
      percent: (v.amount / income) * 100,
      amount: v.amount,
    }))
    .sort((a, b) => b.percent - a.percent || b.amount - a.amount)
    .slice(0, limit);
}

type PercentQueryFlags = {
  wantsPercent: boolean;
  wantsTop: boolean;
  wantsSavings: boolean;
  wantsAnt: boolean;
  wantsIncome: boolean;
  cats: CategoryHit | null;
};

/** Salary/income-based percentage answers — adaptive intent matching. */
function tryAnswerPercentQuery(
  q: string,
  list: Transaction[],
  periodLabel: string,
  format: (n: number) => string,
  t: TFn,
  spendConcepts: SpendConcept[],
  categoryLabel: (id: string) => string,
  flags: PercentQueryFlags
): string | null {
  const asksIncomeBasis = includesAny(q, [
    'salario',
    'sueldo',
    'ingreso',
    'ingresos',
    'nomina',
    'nómina',
    'income',
    'payroll',
    'mi sueldo',
  ]);
  const asksPercent =
    flags.wantsPercent ||
    includesAny(q, [
      'porcentaje',
      'por ciento',
      'percent',
      'proporcion',
      'proporción',
      'cuota del',
      'parte del',
      'share of',
    ]) ||
    (flags.wantsTop && asksIncomeBasis) ||
    (hasStem(q, 'consum') && asksIncomeBasis);

  if (!asksPercent || !asksIncomeBasis) return null;

  const income = sumByType(list, 'income');
  if (income <= 0) return t('search.answerNoIncome', { period: periodLabel });

  const spendTotal = sumSpendOut(list);

  let cats = flags.cats;
  if (
    cats &&
    skipIncomeCategoryMatch(q) &&
    cats.ids.some((id) => INCOME_CATEGORY_IDS.includes(id))
  ) {
    cats = null;
  }

  const wantsRanking = includesAny(q, [
    'ranking',
    'lista',
    'listado',
    'cuales',
    'cuáles',
    'categorias',
    'categorías',
    'categories',
  ]);
  const wantsHighestShare =
    !wantsRanking &&
    (flags.wantsTop ||
      hasStem(q, 'consum') ||
      includesAny(q, [
        'mayor porcentaje',
        'mas porcentaje',
        'más porcentaje',
        'mas alto',
        'más alto',
        'mayor gasto',
        'highest percent',
        'biggest share',
        'largest share',
        'categoria mas alta',
        'categoría más alta',
        'que categoria',
        'qué categoría',
        'which category',
        'uses the most',
      ]));

  if (wantsRanking) {
    const ranked = rankCategoriesByIncomePercent(
      list,
      income,
      spendConcepts,
      categoryLabel,
      4
    );
    if (ranked.length === 0) return t('search.answerEmptyPeriod', { period: periodLabel });
    return t('search.answerRankingPercentIncome', {
      period: periodLabel,
      income: format(income),
      detail: ranked
        .map((r) => `${r.label} ${Math.round(r.percent)}% (${format(r.amount)})`)
        .join(' · '),
    });
  }

  if (wantsHighestShare) {
    const top = topCategoryByIncomePercent(list, income, spendConcepts);
    if (!top) return t('search.answerEmptyPeriod', { period: periodLabel });
    return t('search.answerTopPercentIncome', {
      label: resolveCategoryDisplayName(top.categoryId, spendConcepts, categoryLabel),
      percent: Math.round(top.percent),
      amount: format(top.amount),
      period: periodLabel,
      income: format(income),
      count: top.count,
    });
  }

  if (flags.wantsSavings || hasStem(q, 'ahorr') || includesAny(q, ['sobro', 'sobró', 'savings', 'me queda', 'saved', 'save'])) {
    const saved = income - spendTotal;
    return t('search.answerSavingsPercentIncome', {
      percent: Math.round((saved / income) * 100),
      amount: format(saved),
      income: format(income),
      period: periodLabel,
    });
  }

  if (flags.wantsAnt) {
    const ant = antExpenseBreakdown(list, spendConcepts);
    if (ant.total <= 0) return t('search.answerAntEmpty', { period: periodLabel });
    return t('search.answerAntPercentIncome', {
      percent: Math.round((ant.total / income) * 100),
      amount: format(ant.total),
      income: format(income),
      period: periodLabel,
    });
  }

  if (cats) {
    let matched = matchTransactionsToCategories(list, cats, spendConcepts);
    const amount = matched.reduce((s, x) => s + x.amount, 0);
    const label =
      cats.label === 'food-group'
        ? t('search.labelFood')
        : cats.displayName && !cats.displayName.startsWith('concept-')
          ? cats.displayName
          : cats.ids.map(categoryLabel).join(' + ');
    if (matched.length === 0) {
      return t('search.answerCategoryEmpty', { label, period: periodLabel });
    }
    return t('search.answerCategoryPercentIncome', {
      label,
      percent: Math.round((amount / income) * 100),
      amount: format(amount),
      income: format(income),
      period: periodLabel,
    });
  }

  if (
    includesAny(q, [
      'total',
      'gastos',
      'gasto total',
      'gasto',
      'spend',
      'spent',
      'expenses',
      'gaste',
      'gasté',
    ]) &&
    !flags.wantsIncome
  ) {
    return t('search.answerSpendPercentIncome', {
      percent: Math.round((spendTotal / income) * 100),
      amount: format(spendTotal),
      income: format(income),
      period: periodLabel,
    });
  }

  return null;
}

export type SearchSuggestion = {
  id: string;
  /** Translation key or raw prompt text. */
  prompt: string;
};

/** Quick prompts tailored to the user's concepts, recent spend, and selected period. */
export function buildSearchSuggestions(
  spendConcepts: SpendConcept[],
  language: 'en' | 'es',
  period: Period = 'mes',
  options: { transactions?: Transaction[]; debts?: Debt[] } = {}
): string[] {
  const prompts: string[] = [];
  const when =
    language === 'es'
      ? period === 'hoy'
        ? 'hoy'
        : period === 'semana'
          ? 'esta semana'
          : 'este mes'
      : period === 'hoy'
        ? 'today'
        : period === 'semana'
          ? 'this week'
          : 'this month';

  const allTxs = options.transactions ?? [];
  const periodTxs = filterByPeriod(allTxs, period);
  const spentBySub = new Map<string, number>();
  for (const tx of periodTxs) {
    if ((tx.type !== 'expense' && tx.type !== 'debt_payment') || !tx.categoryId) continue;
    spentBySub.set(tx.categoryId, (spentBySub.get(tx.categoryId) ?? 0) + tx.amount);
  }

  const activeSubs = flattenSpendSubs(spendConcepts)
    .map((sub) => ({
      sub,
      spent: spentBySub.get(sub.id) ?? 0,
    }))
    .sort((a, b) => b.spent - a.spent || a.sub.name.localeCompare(b.sub.name));

  const featuredSubs = [
    ...activeSubs.filter((x) => x.spent > 0).slice(0, 4),
    ...activeSubs.filter((x) => x.spent <= 0).slice(0, 4),
  ]
    .filter(
      (x, i, arr) => arr.findIndex((y) => y.sub.id === x.sub.id) === i
    )
    .slice(0, 4);

  const hasDebtPayments = periodTxs.some((t) => t.type === 'debt_payment');
  const hasDebts = (options.debts?.length ?? 0) > 0;
  const creditsConcept = spendConcepts.find((c) => c.id === CREDITS_CONCEPT_ID);
  const topSub = featuredSubs[0]?.sub;
  const topHit = topSub ? findSpendSub(spendConcepts, topSub.id) : undefined;
  const topName = topHit ? `${topHit.concept.name}/${topSub!.name}` : topSub?.name;

  const now = new Date();
  const pastMonthKeys = new Set<string>();
  for (const tx of allTxs) {
    if (tx.type !== 'expense' && tx.type !== 'debt_payment') continue;
    const d = new Date(tx.createdAt);
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) continue;
    pastMonthKeys.add(`${d.getFullYear()}-${d.getMonth()}`);
  }
  const pastMonth = [...pastMonthKeys]
    .map((key) => {
      const [y, m] = key.split('-').map(Number);
      return { year: y, monthIndex: m };
    })
    .sort((a, b) => b.year - a.year || b.monthIndex - a.monthIndex)[0];
  const pastMonthName = pastMonth
    ? language === 'es'
      ? `${MONTHS_ES[pastMonth.monthIndex]} ${pastMonth.year}`
      : `${monthLabel(pastMonth.monthIndex, 'en')} ${pastMonth.year}`
    : null;

  if (language === 'es') {
    prompts.push(`¿Qué % de mi ingreso gasté ${when}?`);
    prompts.push(`¿Cuánto gasté ${when}?`);
    prompts.push('¿Cuánto gasté el mes pasado?');
    prompts.push('¿Cuánto gasté este año?');
    if (pastMonthName) {
      prompts.push(`¿Cuánto gasté en ${pastMonthName}?`);
    }
    if (period !== 'hoy') prompts.push('¿Cuánto gasté ayer?');
    if (hasDebtPayments || hasDebts) {
      prompts.push(`¿Cuánto pagué en cuotas ${when}?`);
      if (creditsConcept) {
        prompts.push(`¿Cuánto gasté en ${creditsConcept.name} ${when}?`);
      }
    }
    prompts.push(`¿Cuánto ahorré ${when}?`);
    prompts.push(
      period === 'mes'
        ? '¿Cuáles son mis gastos hormiga?'
        : `¿Cuáles son mis gastos hormiga ${when}?`
    );
    for (const { sub } of featuredSubs) {
      const hit = findSpendSub(spendConcepts, sub.id);
      const name = hit ? `${hit.concept.name}/${sub.name}` : sub.name;
      prompts.push(`¿Cuánto gasté en ${name} ${when}?`);
    }
    if (topName) {
      prompts.push(`¿De qué bolsillo salió ${topName} ${when}?`);
    }
    prompts.push(`¿En qué gasté más ${when}?`);
    prompts.push(`¿Gasté más ${when} que el mes pasado?`);
    prompts.push('¿Cuánto tengo disponible?');
    if (hasDebts) prompts.push('¿Cuánto debo en deudas?');
  } else {
    prompts.push(`What % of my income did I spend ${when}?`);
    prompts.push(`How much did I spend ${when}?`);
    prompts.push('How much did I spend last month?');
    prompts.push('How much did I spend this year?');
    if (pastMonthName) {
      prompts.push(`How much did I spend in ${pastMonthName}?`);
    }
    if (period !== 'hoy') prompts.push('How much did I spend yesterday?');
    if (hasDebtPayments || hasDebts) {
      prompts.push(`How much did I pay in installments ${when}?`);
      if (creditsConcept) {
        prompts.push(`How much on ${creditsConcept.name} ${when}?`);
      }
    }
    prompts.push(`How much did I save ${when}?`);
    prompts.push(
      period === 'mes'
        ? 'What are my ant expenses?'
        : `What are my ant expenses ${when}?`
    );
    for (const { sub } of featuredSubs) {
      const hit = findSpendSub(spendConcepts, sub.id);
      const name = hit ? `${hit.concept.name}/${sub.name}` : sub.name;
      prompts.push(`How much on ${name} ${when}?`);
    }
    if (topName) {
      prompts.push(`Which pocket did ${topName} leave ${when}?`);
    }
    prompts.push(`Where did I spend the most ${when}?`);
    prompts.push(`Did I spend more ${when} than last month?`);
    prompts.push('How much available cash do I have?');
    if (hasDebts) prompts.push('How much do I still owe?');
  }
  return prompts.slice(0, 14);
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
  const language = options.language ?? 'es';
  const period = resolvePeriod(q, options.defaultPeriod ?? 'mes', language, t);
  const list = withAccruedInstallments(
    txsForPeriod(transactions, period),
    options.debts,
    period.label
  );
  const periodLabel = period.label;

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
  const earnedIncomeIntent = includesAny(q, [
    'gane',
    'gané',
    'recibi',
    'recibí',
    'cobre',
    'cobré',
  ]);
  const incomeWord = includesAny(q, [
    'ingreso',
    'ingresos',
    'salario',
    'sueldo',
    'income',
    'payroll',
    'nomina',
    'nómina',
  ]);
  const wantsIncome =
    earnedIncomeIntent ||
    (incomeWord && !skipIncomeCategoryMatch(q) && !isIncomeUsedAsReference(q));
  const wantsSavings =
    hasStem(q, 'ahorr') ||
    includesAny(q, [
      'savings',
      'saved',
      'save',
      'sobro',
      'sobró',
      'me queda',
      'balance',
      'neto del mes',
    ]);
  const wantsAnt = includesAny(q, [
    'hormiga',
    'hormigas',
    'gasto hormiga',
    'gastos hormiga',
    'ant spend',
    'ant expense',
    'ant expenses',
  ]);
  const wantsDebt = includesAny(q, [
    'deuda',
    'deudas',
    'debt',
    'loan',
    'credito activo',
    'crédito activo',
    'saldo de deuda',
    'cuanto debo',
    'cuánto debo',
  ]);
  const wantsDebtPayments = includesAny(q, [
    'cuota',
    'cuotas',
    'pago de deuda',
    'pagos de deuda',
    'pague deuda',
    'pagué deuda',
    'pague una deuda',
    'pagué una deuda',
    'pague a credito',
    'pagué a crédito',
    'pague a creditos',
    'pagué a créditos',
    'pague creditos',
    'pagué créditos',
    'pagos a creditos',
    'pagos a créditos',
    'debt payment',
    'installment',
    'installments',
  ]);
  const wantsAvailable = includesAny(q, [
    'disponible',
    'available',
    'liquidez',
    'cuanto tengo',
    'cuánto tengo',
    'tengo en cuentas',
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
    'contra el mes',
  ]);
  const wantsOrigin = includesAny(q, [
    'de que cuenta',
    'de qué cuenta',
    'de que bolsillo',
    'de qué bolsillo',
    'de donde salio',
    'de dónde salió',
    'de donde sale',
    'which account',
    'which pocket',
    'from which',
  ]);
  const wantsTransfer = includesAny(q, [
    'transferencia',
    'transferencias',
    'transfer',
    'envie',
    'envié',
  ]);
  const wantsTop = includesAny(q, [
    'mas gaste',
    'más gasté',
    'mas gasto',
    'más gasto',
    'en que gaste',
    'en qué gasté',
    'en que gaste mas',
    'en qué gasté más',
    'mayor gasto',
    'top',
    'biggest',
    'most spent',
    'where did i spend',
    'categoria mas alta',
    'categoría más alta',
  ]);
  const wantsAverage = includesAny(q, [
    'promedio',
    'average',
    'media',
    'por movimiento',
    'por gasto',
  ]);
  const wantsBudget = includesAny(q, [
    'tope',
    'topes',
    'presupuesto',
    'budget',
    'limite',
    'límite',
    'sobre el tope',
  ]);
  const wantsPercent = includesAny(q, [
    'porcentaje',
    'por ciento',
    'percent',
    'proporcion',
    'proporción',
    '%',
    'cuota del',
    'parte del',
    'share of',
  ]);

  const spendConcepts = options.spendConcepts ?? [];
  const cats = detectCategories(q, spendConcepts);
  const method = detectPaymentMethod(q);
  const noteNeedle = extractNoteNeedle(q);

  const categoryLabel = (id: string) => resolveCategoryLabel(id, t, spendConcepts);

  const percentFlags: PercentQueryFlags = {
    wantsPercent,
    wantsTop,
    wantsSavings,
    wantsAnt,
    wantsIncome,
    cats,
  };
  const percentAnswer = tryAnswerPercentQuery(
    q,
    list,
    periodLabel,
    format,
    t,
    spendConcepts,
    categoryLabel,
    percentFlags
  );
  if (percentAnswer) return percentAnswer;

  // --- Specific intents (order matters) ---

  if (wantsSavings) {
    const income = sumByType(list, 'income');
    const expense = sumSpendOut(list);
    const saved = income - expense;
    return t('search.answerSavings', {
      amount: format(saved),
      period: periodLabel,
      income: format(income),
      expenses: format(expense),
    });
  }

  if (wantsAvailable && options.availableCash != null) {
    return t('search.answerAvailable', { amount: format(options.availableCash) });
  }

  if (wantsDebtPayments) {
    let payments = list.filter((x) => x.type === 'debt_payment');
    if (cats) {
      const matched = matchTransactionsToCategories(payments, cats, spendConcepts);
      if (matched.length > 0 || cats.score >= 20) {
        payments = matched.length > 0 ? matched : payments;
      }
    }
    const amount = payments.reduce((s, x) => s + x.amount, 0);
    const label =
      cats?.displayName && !cats.displayName.startsWith('concept-')
        ? cats.displayName
        : t('type.debt_payment');
    if (payments.length === 0) {
      return t('search.answerCategoryEmpty', { label, period: periodLabel });
    }
    if (wantsCount) {
      return t('search.answerCount', {
        count: payments.length,
        label,
        period: periodLabel,
      });
    }
    return t('search.answerCategory', {
      label,
      amount: format(amount),
      period: periodLabel,
      count: payments.length,
    });
  }

  if (wantsDebt && options.debtsTotal != null && !cats) {
    return t('search.answerDebt', { amount: format(options.debtsTotal) });
  }

  if (wantsTop && !cats) {
    const top = topExpenseCategory(list, spendConcepts);
    if (!top) {
      return t('search.answerEmptyPeriod', { period: periodLabel });
    }
    const hit = findSpendSub(spendConcepts, top.categoryId);
    const label = hit
      ? `${hit.concept.name}/${hit.sub.name}`
      : categoryLabel(top.categoryId);
    const income = sumByType(list, 'income');
    if (income > 0) {
      return t('search.answerTopWithIncome', {
        label,
        amount: format(top.amount),
        period: periodLabel,
        count: top.count,
        percent: Math.round((top.amount / income) * 100),
        income: format(income),
      });
    }
    return t('search.answerTop', {
      label,
      amount: format(top.amount),
      period: periodLabel,
      count: top.count,
    });
  }

  if (wantsBudget && options.budgetStatus && options.budgetStatus.length > 0) {
    const over = options.budgetStatus
      .filter((b) => b.ratio > 1 && b.limit > 0)
      .sort((a, b) => b.ratio - a.ratio);
    if (over.length === 0) {
      return t('search.answerBudgetOk', { period: periodLabel });
    }
    const first = over[0];
    return t('search.answerBudgetOver', {
      label: categoryLabel(first.categoryId),
      percent: Math.round(first.ratio * 100),
      count: over.length,
      period: periodLabel,
    });
  }

  // Category before "ant" so specific concepts win over hormiga.
  if (cats && !cats.ids.some((id) => INCOME_CATEGORY_IDS.includes(id))) {
    let matched = matchTransactionsToCategories(list, cats, spendConcepts);
    if (method) {
      matched = matched.filter((x) => x.paymentMethod === method);
    }
    const amount = matched.reduce((s, x) => s + x.amount, 0);
    const label =
      cats.label === 'food-group'
        ? t('search.labelFood')
        : cats.displayName && !cats.displayName.startsWith('concept-')
          ? cats.displayName
          : cats.ids.map(categoryLabel).join(' + ');

    if (matched.length === 0) {
      return t('search.answerCategoryEmpty', {
        label,
        period: periodLabel,
      });
    }

    if (wantsAverage) {
      const avg = amount / matched.length;
      return t('search.answerAverage', {
        label,
        amount: format(avg),
        period: periodLabel,
        count: matched.length,
      });
    }

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
    if (wantsOrigin) {
      const detail = accountSpendDetail(matched, options.accounts, t, format);
      if (detail) {
        return t('search.answerByAccount', {
          label,
          amount: format(amount),
          period: periodLabel,
          count: matched.length,
          detail,
        });
      }
    }
    return t('search.answerCategory', {
      label,
      amount: format(amount),
      period: periodLabel,
      count: matched.length,
    });
  }

  if (wantsAnt) {
    const ant = antExpenseBreakdown(list, spendConcepts);
    if (ant.items.length === 0) {
      return t('search.answerAntEmpty', { period: periodLabel });
    }
    const topItems = ant.items
      .slice(0, 3)
      .map((i) => `${categoryLabel(i.categoryId)} ${format(i.amount)}`)
      .join(' · ');
    return t('search.answerAntDetail', {
      amount: format(ant.total),
      period: periodLabel,
      detail: topItems,
    });
  }

  if (wantsCompare) {
    const prevRange = analogRange(period);
    const prev = filterBetween(transactions, prevRange.from, prevRange.to);
    const nowSpend = sumSpendOut(list);
    const prevSpend = sumSpendOut(prev);
    const diff = nowSpend - prevSpend;
    const compareLabel =
      period.analog === 'month'
        ? `${monthLabel(prevRange.from.getMonth(), language)} ${prevRange.from.getFullYear()}`
        : period.analog === 'year'
          ? language === 'es'
            ? `el año ${prevRange.from.getFullYear()}`
            : String(prevRange.from.getFullYear())
          : t('search.periodLastMonth');
    return t('search.answerComparePeriods', {
      period: periodLabel,
      compare: compareLabel,
      amount: format(Math.abs(diff)),
      direction: diff >= 0 ? t('search.more') : t('search.less'),
      now: format(nowSpend),
      prev: format(prevSpend),
    });
  }

  if (
    wantsIncome ||
    (cats?.ids.some((id) => INCOME_CATEGORY_IDS.includes(id)) && !skipIncomeCategoryMatch(q))
  ) {
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

  if (method) {
    const matched = list.filter(
      (x) =>
        (x.type === 'expense' || x.type === 'debt_payment') &&
        x.paymentMethod === method
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

  if (
    !wantsSavings &&
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
    const expenses = list.filter(
      (x) => x.type === 'expense' || x.type === 'debt_payment'
    );
    const amount = expenses.reduce((s, x) => s + x.amount, 0);
    const count = expenses.length;
    if (count === 0) {
      return t('search.answerEmptyPeriod', { period: periodLabel });
    }
    if (wantsAverage) {
      return t('search.answerAverage', {
        label: t('home.expenses'),
        amount: format(amount / count),
        period: periodLabel,
        count,
      });
    }
    if (wantsCount) {
      return t('search.answerCount', {
        count,
        label: t('home.expenses'),
        period: periodLabel,
      });
    }
    const detail = rankingDetail(expenses, spendConcepts, format);
    if (detail) {
      return t('search.answerExpensesDetail', {
        amount: format(amount),
        period: periodLabel,
        count,
        detail,
      });
    }
    return t('search.answerExpenses', {
      amount: format(amount),
      period: periodLabel,
      count,
    });
  }

  return t('search.answerUnclear', {
    examples: t('search.examples'),
  });
}
