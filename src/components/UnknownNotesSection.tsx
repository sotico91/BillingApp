import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { MoneyText } from '@/src/components/MoneyText';
import { QuickCategoryPicker } from '@/src/components/QuickCategoryPicker';
import { SelectPressable } from '@/src/components/SelectPressable';
import { findSpendSub, isGeneralSubName } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import { findUnknownNotes, type UnknownNote } from '@/src/utils/reviewCategories';
import { tapFeedback } from '@/src/utils/selectFeedback';

const PAGE = 6;

/**
 * Insights: descriptions Rumi cannot place on its own ("rifa del colegio").
 * Picking a category moves every spend with that description and teaches it;
 * "Leave as is" teaches the category they already have. Hidden when empty.
 */
export function UnknownNotesSection() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings, teachCategory } = useSettings();
  const { transactions, recategorizeTransactions, canEditTransaction } = useFinance();
  const concepts = useMemo(() => settings.spendConcepts ?? [], [settings.spendConcepts]);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [picking, setPicking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const groups = useMemo(
    () =>
      findUnknownNotes(transactions.filter(canEditTransaction), concepts, settings.taughtCategories ?? []),
    [transactions, canEditTransaction, concepts, settings.taughtCategories]
  );

  if (groups.length === 0) return null;

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const file = (group: UnknownNote, subId: string) =>
    run(async () => {
      const changes: Record<string, string> = {};
      for (const tx of group.txs) if (tx.categoryId !== subId) changes[tx.id] = subId;
      if (Object.keys(changes).length > 0) await recategorizeTransactions(changes);
      await teachCategory(group.note, subId);
      setPicking(null);
    });

  const whereNow = (categoryId?: string) => {
    const hit = categoryId ? findSpendSub(concepts, categoryId) : null;
    if (!hit) return t('review.noCategory');
    return isGeneralSubName(hit.sub.name) ? hit.concept.name : `${hit.concept.name} · ${hit.sub.name}`;
  };

  return (
    <View>
      <CollapsibleSection
        title={t('unknown.title')}
        open={open}
        onToggle={() => setOpen((v) => !v)}
        summary={
          groups.length === 1
            ? t('unknown.collapsed_one')
            : t('unknown.collapsed', { count: groups.length })
        }>
        <View style={styles.body}>
          <Text style={styles.copy}>{t('unknown.body')}</Text>
          {groups.slice(0, shown).map((group) => (
            <View key={group.key} style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.note} numberOfLines={1}>
                  {group.note}
                </Text>
                <MoneyText style={styles.amount}>{format(group.total)}</MoneyText>
              </View>
              <Text style={styles.meta}>
                {group.txs.length === 1
                  ? t('unknown.once')
                  : t('unknown.times', { count: group.txs.length })}{' '}
                · {t('review.from', { category: whereNow(group.categoryId) })}
              </Text>
              {picking === group.key ? (
                <QuickCategoryPicker concepts={concepts} onPick={(subId) => void file(group, subId)} />
              ) : (
                <View style={styles.actions}>
                  {group.categoryId ? (
                    <SelectPressable
                      onPress={() => {
                        tapFeedback();
                        // Only a lesson: the spends stay where they are.
                        void run(() => teachCategory(group.note, group.categoryId!));
                      }}
                      disabled={busy}
                      style={styles.secondaryBtn}>
                      <Text style={styles.secondaryText}>{t('review.leave')}</Text>
                    </SelectPressable>
                  ) : null}
                  <SelectPressable
                    onPress={() => setPicking(group.key)}
                    disabled={busy}
                    style={styles.primaryBtn}>
                    <Text style={styles.primaryText}>{t('unknown.pick')}</Text>
                  </SelectPressable>
                </View>
              )}
            </View>
          ))}
          {groups.length > shown ? (
            <SelectPressable onPress={() => setShown((n) => n + PAGE)} style={styles.more}>
              <Text style={styles.moreText}>{t('review.more', { count: groups.length - shown })}</Text>
            </SelectPressable>
          ) : null}
        </View>
      </CollapsibleSection>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  copy: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkMuted,
  },
  row: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceSolid,
    gap: 4,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  note: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  amount: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  meta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
  },
  secondaryText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  primaryText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.white,
  },
  more: { alignSelf: 'center', paddingVertical: 6 },
  moreText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.accentDeep,
  },
});
