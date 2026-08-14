import { CATEGORIES, expenseCategories } from '@/src/data/financeDefaults';
import { findConceptById, spendSubLabel } from '@/src/data/spendConcepts';
import type { TranslationKey } from '@/src/i18n/translations';
import type { SpendConcept } from '@/src/types/settings';

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** Never show raw i18n keys like `category.sub-agua`. */
function isRawKey(value: string, categoryId: string): boolean {
  return (
    value === `category.${categoryId}` ||
    value.startsWith('category.') ||
    value === categoryId
  );
}

function humanizeId(categoryId: string): string {
  const slug = categoryId
    .replace(/^(sub-|custom-|concept-)/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  if (!slug) return categoryId;
  return slug
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function builtinLabel(categoryId: string, t: TFn): string | null {
  const known =
    CATEGORIES.some((c) => c.id === categoryId) ||
    expenseCategories().some((c) => c.id === categoryId);
  if (!known && categoryId.startsWith('sub-')) return null;
  if (!known && categoryId.startsWith('custom-')) return null;
  if (!known && categoryId.startsWith('concept-')) return null;
  try {
    const label = t(`category.${categoryId}` as TranslationKey);
    if (label && !isRawKey(label, categoryId)) return label;
  } catch {
    /* ignore */
  }
  return null;
}

/** Resolve a category/sub id to a display label (Concepto/Sub). */
export function categoryLabel(
  categoryId: string,
  t: TFn,
  spendConcepts: SpendConcept[] = []
): string {
  if (!categoryId) return '';
  if (categoryId === '__none__') {
    try {
      const label = t('insights.uncategorized' as TranslationKey);
      if (label && label !== 'insights.uncategorized') return label;
    } catch {
      /* ignore */
    }
    return 'Uncategorized';
  }

  const concept = findConceptById(spendConcepts, categoryId);
  if (concept?.name) return concept.name;

  const fromTree = spendSubLabel(categoryId, spendConcepts);
  if (fromTree && fromTree !== categoryId) return fromTree;

  const builtIn = builtinLabel(categoryId, t);
  if (builtIn) return builtIn;

  return humanizeId(categoryId);
}
