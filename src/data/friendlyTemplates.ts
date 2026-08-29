export type FriendlyIntent = 'spend' | 'earn' | 'move' | 'debt';

export type FriendlyTemplate = {
  id: string;
  intent: FriendlyIntent;
  emoji: string;
  titleKey: string;
  subtitleKey: string;
  amountHint?: number;
  /** Income / transfer category id (legacy catalog). */
  categoryId?: string;
  /**
   * Spend templates create or reuse this concept (category) + the
   * template title as subcategory.
   */
  spend?: {
    conceptId: string;
    conceptNameKey:
      | 'onboard.concept.alimentacion'
      | 'onboard.concept.transporte';
    color: string;
    isAnt?: boolean;
  };
};

export const FRIENDLY_INTENTS: {
  id: FriendlyIntent;
  emoji: string;
  titleKey: string;
  subtitleKey: string;
}[] = [
  {
    id: 'spend',
    emoji: '🧾',
    titleKey: 'flow.intent.spend',
    subtitleKey: 'flow.intent.spendSub',
  },
  {
    id: 'earn',
    emoji: '💰',
    titleKey: 'flow.intent.earn',
    subtitleKey: 'flow.intent.earnSub',
  },
  {
    id: 'move',
    emoji: '🔁',
    titleKey: 'flow.intent.move',
    subtitleKey: 'flow.intent.moveSub',
  },
  {
    id: 'debt',
    emoji: '💳',
    titleKey: 'flow.intent.debt',
    subtitleKey: 'flow.intent.debtSub',
  },
];

export const FRIENDLY_TEMPLATES: FriendlyTemplate[] = [
  {
    id: 'tpl-coffee',
    intent: 'spend',
    emoji: '☕',
    titleKey: 'flow.tpl.coffee',
    subtitleKey: 'flow.tpl.coffeeSub',
    spend: {
      conceptId: 'concept-alimentacion',
      conceptNameKey: 'onboard.concept.alimentacion',
      color: '#E07A5F',
      isAnt: true,
    },
  },
  {
    id: 'tpl-delivery',
    intent: 'spend',
    emoji: '🛵',
    titleKey: 'flow.tpl.delivery',
    subtitleKey: 'flow.tpl.deliverySub',
    spend: {
      conceptId: 'concept-alimentacion',
      conceptNameKey: 'onboard.concept.alimentacion',
      color: '#E07A5F',
      isAnt: true,
    },
  },
  {
    id: 'tpl-transport',
    intent: 'spend',
    emoji: '🚌',
    titleKey: 'flow.tpl.transport',
    subtitleKey: 'flow.tpl.transportSub',
    spend: {
      conceptId: 'concept-transporte',
      conceptNameKey: 'onboard.concept.transporte',
      color: '#2EC4B6',
    },
  },
  {
    id: 'tpl-snack',
    intent: 'spend',
    emoji: '🍪',
    titleKey: 'flow.tpl.snack',
    subtitleKey: 'flow.tpl.snackSub',
    spend: {
      conceptId: 'concept-alimentacion',
      conceptNameKey: 'onboard.concept.alimentacion',
      color: '#E07A5F',
      isAnt: true,
    },
  },
  {
    id: 'tpl-salary',
    intent: 'earn',
    categoryId: 'salario',
    emoji: '🏦',
    titleKey: 'flow.tpl.salary',
    subtitleKey: 'flow.tpl.salarySub',
  },
  {
    id: 'tpl-save',
    intent: 'move',
    categoryId: 'otros',
    emoji: '🐷',
    titleKey: 'flow.tpl.save',
    subtitleKey: 'flow.tpl.saveSub',
  },
];

export function intentToType(intent: FriendlyIntent) {
  if (intent === 'earn') return 'income' as const;
  if (intent === 'move') return 'transfer' as const;
  if (intent === 'debt') return 'debt_payment' as const;
  return 'expense' as const;
}
