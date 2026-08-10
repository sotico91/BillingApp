export type FriendlyIntent = 'spend' | 'earn' | 'move' | 'debt';

export type FriendlyTemplate = {
  id: string;
  intent: FriendlyIntent;
  categoryId: string;
  amountHint?: number;
  emoji: string;
  titleKey: string;
  subtitleKey: string;
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
    categoryId: 'cafe',
    amountHint: 8000,
    emoji: '☕',
    titleKey: 'flow.tpl.coffee',
    subtitleKey: 'flow.tpl.coffeeSub',
  },
  {
    id: 'tpl-delivery',
    intent: 'spend',
    categoryId: 'delivery',
    amountHint: 35000,
    emoji: '🛵',
    titleKey: 'flow.tpl.delivery',
    subtitleKey: 'flow.tpl.deliverySub',
  },
  {
    id: 'tpl-transport',
    intent: 'spend',
    categoryId: 'transporte',
    amountHint: 12000,
    emoji: '🚌',
    titleKey: 'flow.tpl.transport',
    subtitleKey: 'flow.tpl.transportSub',
  },
  {
    id: 'tpl-snack',
    intent: 'spend',
    categoryId: 'snacks',
    amountHint: 5000,
    emoji: '🍪',
    titleKey: 'flow.tpl.snack',
    subtitleKey: 'flow.tpl.snackSub',
  },
  {
    id: 'tpl-salary',
    intent: 'earn',
    categoryId: 'ingresos',
    amountHint: 3000000,
    emoji: '🏦',
    titleKey: 'flow.tpl.salary',
    subtitleKey: 'flow.tpl.salarySub',
  },
  {
    id: 'tpl-save',
    intent: 'move',
    categoryId: 'otros',
    amountHint: 100000,
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
