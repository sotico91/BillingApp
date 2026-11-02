import type { TranslationKey } from '@/src/i18n/translations';
import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { findSpendSub } from '@/src/data/spendConcepts';
import { antExpenseBreakdown, filterBetween, sumByType, sumSpendOut } from '@/src/utils/financeMath';
import { projectMonth } from '@/src/utils/projection';
import {
  INCOME_CATEGORY_IDS,
  isCreditsCategoryHit,
  matchTransactionsToCategories,
  noteSearchTokens,
  skipIncomeCategoryMatch,
} from './categories';
import {
  accountSpendDetail,
  cardChargeTxs,
  cardObligationTxs,
  expenseTxs,
  obligationTxs,
  rankingDetail,
  topExpenseCategory,
} from './ledger';
import type { ParsedQuery } from './parse';
import { tryAnswerPercentQuery } from './percent';
import { analogRange, dayLabel, previousLabel } from './period';
import { answerAfford, answerCut, answerProjection } from './planning';
import { isCardTopicQuery } from './signals';
import { includesAny, normalize } from './text';
import type { AskOptions, TFn } from './types';

export type AskContext = {
  parsed: ParsedQuery;
  /** Every transaction, for comparisons and projections. */
  transactions: Transaction[];
  /** Transactions inside the asked period. */
  list: Transaction[];
  format: (n: number) => string;
  t: TFn;
  options: AskOptions;
  spendConcepts: SpendConcept[];
  categoryLabel: (id: string) => string;
};

export type AskAnswer = {
  text: string;
  /** The movements behind the answer, when it is about specific ones. */
  txs?: Transaction[];
  /** The time the answer covers, when it is not the asked period (notes search the whole history). */
  period?: string;
};

export type Handler = (ctx: AskContext) => AskAnswer | null;

const sum = (list: Transaction[]) => list.reduce((s, x) => s + x.amount, 0);

/** How the asked concepts read in an answer ("Café", "Café + Delivery", "Comida / restaurantes"). */
export function conceptLabel(ctx: AskContext): string | null {
  const { cats } = ctx.parsed;
  if (!cats) return null;
  if (cats.label === 'food-group') return ctx.t('search.labelFood');
  if (cats.displayName && !cats.displayName.startsWith('concept-')) return cats.displayName;
  return cats.ids.map(ctx.categoryLabel).join(' + ');
}

const isIncomeHit = (ctx: AskContext) =>
  !!ctx.parsed.cats?.ids.some((id) => INCOME_CATEGORY_IDS.includes(id));

const percent: Handler = (ctx) => {
  const { parsed, list, format, t, spendConcepts, categoryLabel } = ctx;
  const text = tryAnswerPercentQuery(parsed.q, list, parsed.period.label, format, t, spendConcepts, categoryLabel, {
    wantsPercent: parsed.wants.percent,
    wantsTop: parsed.wants.top,
    wantsSavings: parsed.wants.savings,
    wantsAnt: parsed.wants.ant,
    wantsIncome: parsed.wants.income,
    cats: parsed.cats,
    debts: ctx.options.debts,
  });
  return text ? { text } : null;
};

const afford: Handler = (ctx) =>
  ctx.parsed.wants.afford
    ? { text: answerAfford(ctx.parsed.q, ctx.transactions, ctx.format, ctx.t, ctx.options) }
    : null;

const cut: Handler = (ctx) =>
  ctx.parsed.wants.cut
    ? { text: answerCut(ctx.transactions, ctx.format, ctx.t, ctx.options, ctx.categoryLabel) }
    : null;

/** "¿cuánto me queda?" with no month-end words: cash on hand now, then where the month lands. */
const leftNow: Handler = ({ parsed, options, transactions, format, t }) => {
  if (!parsed.wants.leftNow || options.availableCash == null) return null;
  const parts = [t('search.answerAvailable', { amount: format(options.availableCash) })];
  const p = projectMonth(transactions, options.debts, new Date(), options.spendConcepts);
  if (p.income > 0) {
    parts.push(
      p.projectedLeft >= 0
        ? t('search.answerProjectionLeft', { income: format(p.income), left: format(p.projectedLeft) })
        : t('search.answerProjectionShort', { income: format(p.income), short: format(-p.projectedLeft) })
    );
  }
  return { text: parts.join(' ') };
};

const projection: Handler = (ctx) => {
  const { parsed } = ctx;
  if (!parsed.wants.projection || !parsed.inProgress || parsed.period.analog === 'day') return null;
  return {
    text: answerProjection(
      ctx.transactions,
      ctx.list,
      parsed.period,
      ctx.format,
      ctx.t,
      ctx.options.debts,
      ctx.options.spendConcepts
    ),
  };
};

const savings: Handler = ({ parsed, list, options, format, t }) => {
  if (!parsed.wants.savings) return null;
  const period = parsed.period.label;
  const income = sumByType(list, 'income');
  // Same rule as Home: expenses + loan installments; card payments are not new spend.
  const expense = sumSpendOut(list, options.debts);
  const obligations = sum(cardObligationTxs(list, options.debts));
  const saved = income - expense;
  const cardNote = obligations > 0 ? ` ${t('search.answerCardPayNote', { obligations: format(obligations) })}` : '';
  const amounts = { period, income: format(income), expenses: format(expense) };
  if (saved < 0) {
    const key = parsed.inProgress ? 'search.answerOverspentSoFar' : 'search.answerOverspent';
    return { text: t(key, { ...amounts, amount: format(-saved) }) + cardNote };
  }
  if (parsed.inProgress) {
    return { text: t('search.answerSavingsSoFar', { ...amounts, amount: format(saved) }) + cardNote };
  }
  if (obligations > 0) {
    return {
      text: t('search.answerSavingsWithObligations', {
        ...amounts,
        amount: format(saved),
        obligations: format(obligations),
      }),
    };
  }
  return { text: t('search.answerSavings', { ...amounts, amount: format(saved) }) };
};

const available: Handler = ({ parsed, options, format, t }) =>
  parsed.wants.available && options.availableCash != null
    ? { text: t('search.answerAvailable', { amount: format(options.availableCash) }) }
    : null;

const cardPayments: Handler = ({ parsed, list, options, format, t }) => {
  const { wants, q } = parsed;
  if (!(wants.cardPay || (isCardTopicQuery(q) && !wants.spendVerb && wants.debtPayments))) return null;
  const period = parsed.period.label;
  const payments = cardObligationTxs(list, options.debts);
  const charges = cardChargeTxs(list);
  if (payments.length === 0) {
    if (charges.length > 0 && wants.spendVerb) {
      return {
        text: t('search.answerCardCharges', { amount: format(sum(charges)), period, count: charges.length }),
        txs: charges,
      };
    }
    return { text: t('search.answerCardPayEmpty', { period }) };
  }
  if (wants.count) {
    return {
      text: t('search.answerCount', { count: payments.length, label: t('search.labelCardPay'), period }),
      txs: payments,
    };
  }
  if (charges.length > 0 && wants.spendVerb) {
    return {
      text: t('search.answerCardChargesWithPay', {
        amount: format(sum(charges)),
        period,
        count: charges.length,
        paid: format(sum(payments)),
        paidCount: payments.length,
      }),
      txs: [...charges, ...payments],
    };
  }
  return {
    text: t('search.answerCardPay', { amount: format(sum(payments)), period, count: payments.length }),
    txs: payments,
  };
};

const debtPayments: Handler = (ctx) => {
  const { parsed, list, spendConcepts, format, t } = ctx;
  if (!parsed.wants.debtPayments) return null;
  const { cats } = parsed;
  const period = parsed.period.label;
  let payments = obligationTxs(list);
  if (cats) {
    const matched = matchTransactionsToCategories(list, cats, spendConcepts, 'obligation');
    if (matched.length > 0) payments = matched;
  }
  if (payments.length === 0) return { text: t('search.answerObligationsEmpty', { period }) };
  const label =
    cats?.displayName && !cats.displayName.startsWith('concept-')
      ? cats.displayName
      : t('search.labelObligation');
  if (parsed.wants.count) {
    return { text: t('search.answerCount', { count: payments.length, label, period }), txs: payments };
  }
  return {
    text: t('search.answerObligations', { amount: format(sum(payments)), period, count: payments.length }),
    txs: payments,
  };
};

const debtBalance: Handler = ({ parsed, options, format, t }) =>
  parsed.wants.debt && options.debtsTotal != null && !parsed.cats
    ? { text: t('search.answerDebt', { amount: format(options.debtsTotal) }) }
    : null;

const top: Handler = (ctx) => {
  const { parsed, list, spendConcepts, format, t, categoryLabel } = ctx;
  if (!parsed.wants.top || parsed.cats) return null;
  const period = parsed.period.label;
  const best = topExpenseCategory(list, spendConcepts);
  if (!best) return { text: t('search.answerEmptyPeriod', { period }) };
  const hit = findSpendSub(spendConcepts, best.categoryId);
  const label = hit ? `${hit.concept.name}/${hit.sub.name}` : categoryLabel(best.categoryId);
  const conceptIds = new Set(hit ? hit.concept.subs.map((s) => s.id) : [best.categoryId]);
  const txs = expenseTxs(list).filter((x) => x.categoryId && conceptIds.has(x.categoryId));
  const income = sumByType(list, 'income');
  const base = { label, amount: format(best.amount), period, count: best.count };
  if (income > 0) {
    return {
      text: t('search.answerTopWithIncome', {
        ...base,
        percent: Math.round((best.amount / income) * 100),
        income: format(income),
      }),
      txs,
    };
  }
  return { text: t('search.answerTop', base), txs };
};

const budget: Handler = ({ parsed, options, t, categoryLabel }) => {
  if (!parsed.wants.budget || !options.budgetStatus?.length) return null;
  const period = parsed.period.label;
  const over = options.budgetStatus
    .filter((b) => b.ratio > 1 && b.limit > 0)
    .sort((a, b) => b.ratio - a.ratio);
  if (over.length === 0) return { text: t('search.answerBudgetOk', { period }) };
  return {
    text: t('search.answerBudgetOver', {
      label: categoryLabel(over[0].categoryId),
      percent: Math.round(over[0].ratio * 100),
      count: over.length,
      period,
    }),
  };
};

/** One or more concepts, optionally by payment method, compared, counted or averaged. */
const concept: Handler = (ctx) => {
  const { parsed, list, transactions, spendConcepts, options, format, t } = ctx;
  const { cats, method, wants } = parsed;
  if (!cats || isIncomeHit(ctx)) return null;
  const period = parsed.period.label;
  const mode = isCreditsCategoryHit(cats, spendConcepts) ? 'obligation' : 'expense';
  const pick = (source: Transaction[]) => {
    const matched = matchTransactionsToCategories(source, cats, spendConcepts, mode);
    return method ? matched.filter((x) => x.paymentMethod === method) : matched;
  };
  const matched = pick(list);
  const amount = sum(matched);
  const label = conceptLabel(ctx) ?? '';

  if (wants.compare) {
    const prevRange = analogRange(parsed.period);
    const prevAmount = sum(pick(filterBetween(transactions, prevRange.from, prevRange.to)));
    const diff = amount - prevAmount;
    return {
      text: t('search.answerCompareCategory', {
        label,
        period,
        compare: previousLabel(parsed.period, prevRange, parsed.language, t),
        amount: format(Math.abs(diff)),
        direction: diff >= 0 ? t('search.more') : t('search.less'),
        now: format(amount),
        prev: format(prevAmount),
      }),
      txs: matched,
    };
  }
  if (matched.length === 0) return { text: t('search.answerCategoryEmpty', { label, period }) };

  const base = { label, amount: format(amount), period, count: matched.length };
  if (mode === 'obligation') return { text: t('search.answerObligationsNamed', base), txs: matched };
  if (wants.average) {
    return {
      text: t('search.answerAverage', { ...base, amount: format(amount / matched.length) }),
      txs: matched,
    };
  }
  if (wants.count) {
    return { text: t('search.answerCount', { count: matched.length, label, period }), txs: matched };
  }
  if (method) {
    return {
      text: t('search.answerCategoryMethod', {
        label,
        method: t(`method.${method}` as TranslationKey),
        amount: format(amount),
        period,
      }),
      txs: matched,
    };
  }
  if (wants.origin) {
    const detail = accountSpendDetail(matched, options.accounts, t, format);
    if (detail) return { text: t('search.answerByAccount', { ...base, detail }), txs: matched };
  }
  return { text: t('search.answerCategory', base), txs: matched };
};

const ant: Handler = ({ parsed, list, spendConcepts, format, t, categoryLabel }) => {
  if (!parsed.wants.ant) return null;
  const period = parsed.period.label;
  const breakdown = antExpenseBreakdown(list, spendConcepts);
  if (breakdown.items.length === 0) return { text: t('search.answerAntEmpty', { period }) };
  const ids = new Set(breakdown.items.map((i) => i.categoryId));
  return {
    text: t('search.answerAntDetail', {
      amount: format(breakdown.total),
      period,
      detail: breakdown.items
        .slice(0, 3)
        .map((i) => `${categoryLabel(i.categoryId)} ${format(i.amount)}`)
        .join(' · '),
    }),
    txs: expenseTxs(list).filter((x) => x.categoryId && ids.has(x.categoryId)),
  };
};

const comparePeriods: Handler = ({ parsed, list, transactions, options, format, t }) => {
  if (!parsed.wants.compare) return null;
  const prevRange = analogRange(parsed.period);
  // Same money-out rule as Home and Activity, so both months read like the totals there.
  const nowSpend = sumSpendOut(list, options.debts);
  const prevSpend = sumSpendOut(filterBetween(transactions, prevRange.from, prevRange.to), options.debts);
  const diff = nowSpend - prevSpend;
  return {
    text: t('search.answerComparePeriods', {
      period: parsed.period.label,
      compare: previousLabel(parsed.period, prevRange, parsed.language, t),
      amount: format(Math.abs(diff)),
      direction: diff >= 0 ? t('search.more') : t('search.less'),
      now: format(nowSpend),
      prev: format(prevSpend),
    }),
    txs: expenseTxs(list),
  };
};

const income: Handler = (ctx) => {
  const { parsed, list, format, t } = ctx;
  if (!parsed.wants.income && !(isIncomeHit(ctx) && !skipIncomeCategoryMatch(parsed.q))) return null;
  const period = parsed.period.label;
  const txs = list.filter((x) => x.type === 'income');
  if (parsed.wants.count) {
    return { text: t('search.answerCount', { count: txs.length, label: t('home.income'), period }), txs };
  }
  return { text: t('search.answerIncome', { amount: format(sum(txs)), period }), txs };
};

const transfers: Handler = ({ parsed, list, format, t }) => {
  const { wants, method, q, noteNeedle } = parsed;
  if (!wants.transfer && !(method === 'transfer' && includesAny(q, ['envie', 'envié', 'mande', 'mandé']))) {
    return null;
  }
  const period = parsed.period.label;
  let txs = list.filter((x) => x.type === 'transfer');
  if (noteNeedle) {
    txs = txs.filter((x) => normalize(x.note ?? '').includes(noteNeedle));
    return {
      text: t('search.answerNote', { label: noteNeedle, amount: format(sum(txs)), period, count: txs.length }),
      txs,
    };
  }
  return { text: t('search.answerTransferPeriod', { amount: format(sum(txs)), period }), txs };
};

const paymentMethod: Handler = ({ parsed, list, options, format, t }) => {
  const { method, q, wants } = parsed;
  if (!method) return null;
  const period = parsed.period.label;
  if (method === 'credit' || isCardTopicQuery(q)) {
    const charges = cardChargeTxs(list);
    const payments = cardObligationTxs(list, options.debts);
    if (charges.length === 0 && payments.length === 0) {
      return { text: t('search.answerCardPayEmpty', { period }) };
    }
    if (payments.length > 0) {
      return {
        text: t('search.answerCardChargesWithPay', {
          amount: format(sum(charges)),
          period,
          count: charges.length,
          paid: format(sum(payments)),
          paidCount: payments.length,
        }),
        txs: [...charges, ...payments],
      };
    }
    return {
      text: t('search.answerCardCharges', { amount: format(sum(charges)), period, count: charges.length }),
      txs: charges,
    };
  }
  const txs = expenseTxs(list).filter((x) => x.paymentMethod === method);
  const methodLabel = t(`method.${method}` as TranslationKey);
  if (wants.count) {
    return { text: t('search.answerCount', { count: txs.length, label: methodLabel, period }), txs };
  }
  return { text: t('search.answerMethod', { method: methodLabel, amount: format(sum(txs)), period }), txs };
};

/** Notes are looked up in the asked period, or in the whole history when the question named none. */
function noteScope({ parsed, list, transactions, t }: AskContext) {
  return parsed.period.explicit
    ? { pool: list, period: parsed.period.label }
    : { pool: transactions, period: t('search.periodAllTime') };
}

/**
 * Movements whose note has every word. Failing that, the ones with the most of
 * them ("recarga movistar" still finds "Movistar"), labelled with the words found.
 */
function matchNotes(pool: Transaction[], tokens: string[]): { txs: Transaction[]; label: string; full: boolean } {
  const scored = pool.map((x) => {
    const note = normalize(x.note ?? '');
    return { x, hits: note ? tokens.filter((tok) => note.includes(tok)) : [] };
  });
  const best = scored.reduce((m, s) => Math.max(m, s.hits.length), 0);
  if (best === 0) return { txs: [], label: tokens.join(' '), full: false };
  const top = scored.filter((s) => s.hits.length === best);
  const found = tokens.filter((tok) => top.some((s) => s.hits.includes(tok)));
  return { txs: top.map((s) => s.x), label: found.join(' '), full: best === tokens.length };
}

const newestFirst = (txs: Transaction[]) => [...txs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const dateOf = (ctx: AskContext, x: Transaction) => dayLabel(new Date(x.createdAt), ctx.parsed.language);

/** "How much" on a note, with the days when there are only one or two movements. */
function noteAnswer(ctx: AskContext, label: string, period: string, txs: Transaction[]): AskAnswer {
  const params = { label, amount: ctx.format(sum(txs)), period, count: txs.length };
  if (txs.length === 0 || txs.length > 2) return { text: ctx.t('search.answerNote', params), txs, period };
  const dates = newestFirst(txs)
    .map((x) => dateOf(ctx, x))
    .join(' · ');
  return { text: ctx.t('search.answerNoteDated', { ...params, dates }), txs, period };
}

/** "¿qué día tomé didi?", "¿cuándo compré café?": the day it happened, not just the amount. */
const when: Handler = (ctx) => {
  const { parsed, format, t, spendConcepts } = ctx;
  if (!parsed.wants.when) return null;
  const { pool, period } = noteScope(ctx);
  const tokens = parsed.noteNeedle ? [parsed.noteNeedle] : noteSearchTokens(parsed.q);
  const notes = matchNotes(pool, tokens);
  let { txs, label } = notes;
  // A note with every word wins; otherwise a named concept ("café"), then a partial note match.
  if (!notes.full && parsed.cats) {
    const ids = parsed.cats.ids;
    label = conceptLabel(ctx) ?? label;
    txs = isIncomeHit(ctx)
      ? pool.filter((x) => x.type === 'income' && !!x.categoryId && ids.includes(x.categoryId))
      : matchTransactionsToCategories(pool, parsed.cats, spendConcepts);
  }
  if (txs.length === 0) {
    // "¿qué día gasté más?" has no note to find: leave it to the other handlers.
    const known = !!parsed.cats || matchNotes(ctx.transactions, tokens).txs.length > 0;
    return known ? { text: t('search.answerWhenNone', { label, period }), period } : null;
  }
  const [last] = newestFirst(txs);
  const params = { label, period, date: dateOf(ctx, last), amount: format(last.amount) };
  if (txs.length === 1) return { text: t('search.answerWhenOne', params), txs, period };
  return {
    text: t('search.answerWhenMany', { ...params, count: txs.length, total: format(sum(txs)) }),
    txs,
    period,
  };
};

/** Nothing else matched: maybe the words live in a note ("pizza", "cine con Ana"). */
const looseNote: Handler = (ctx) => {
  const { parsed } = ctx;
  if (parsed.noteNeedle) return null;
  const tokens = noteSearchTokens(parsed.q);
  if (tokens.length === 0) return null;
  const { pool, period } = noteScope(ctx);
  const { txs, label } = matchNotes(pool, tokens);
  if (txs.length === 0) return null;
  return noteAnswer(ctx, label, period, txs);
};

const noteNeedle: Handler = (ctx) => {
  const needle = ctx.parsed.noteNeedle;
  if (!needle) return null;
  const { pool, period } = noteScope(ctx);
  return noteAnswer(ctx, needle, period, pool.filter((x) => normalize(x.note ?? '').includes(needle)));
};

const totals: Handler = ({ parsed, list, spendConcepts, format, t, categoryLabel }) => {
  if (!parsed.period.explicit && (parsed.wants.savings || !parsed.wants.totals)) return null;
  const period = parsed.period.label;
  const expenses = expenseTxs(list);
  const obligations = obligationTxs(list);
  const amount = sum(expenses);
  const count = expenses.length;
  if (count === 0 && obligations.length === 0) return { text: t('search.answerEmptyPeriod', { period }) };
  if (count === 0) {
    return {
      text: t('search.answerObligations', { amount: format(sum(obligations)), period, count: obligations.length }),
      txs: obligations,
    };
  }
  if (parsed.wants.average) {
    return {
      text: t('search.answerAverage', { label: t('home.expenses'), amount: format(amount / count), period, count }),
      txs: expenses,
    };
  }
  if (parsed.wants.count) {
    return { text: t('search.answerCount', { count, label: t('home.expenses'), period }), txs: expenses };
  }
  const detail = rankingDetail(expenses, spendConcepts, format, categoryLabel);
  if (obligations.length > 0) {
    return {
      text: t('search.answerExpensesVsObligations', {
        expenses: format(amount),
        expenseCount: count,
        obligations: format(sum(obligations)),
        obligationCount: obligations.length,
        period,
        detail: detail || t('insights.emptyPeriod'),
      }),
      txs: [...expenses, ...obligations],
    };
  }
  if (detail) {
    return { text: t('search.answerExpensesDetail', { amount: format(amount), period, count, detail }), txs: expenses };
  }
  return { text: t('search.answerExpenses', { amount: format(amount), period, count }), txs: expenses };
};

/**
 * First match answers. The order is the engine's precedence: specific asks
 * ("% of my salary", "can I afford") before broad ones ("how much this month").
 * Concepts come before "hormiga" so "café" wins over the ant-spend summary.
 */
export const HANDLERS = {
  percent,
  afford,
  cut,
  leftNow,
  projection,
  savings,
  available,
  cardPayments,
  debtPayments,
  debtBalance,
  top,
  budget,
  when,
  concept,
  ant,
  comparePeriods,
  income,
  transfers,
  paymentMethod,
  looseNote,
  noteNeedle,
  totals,
} satisfies Record<string, Handler>;

export type AskIntent = keyof typeof HANDLERS;
