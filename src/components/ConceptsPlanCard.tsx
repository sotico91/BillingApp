import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { CONCEPT_COLOR_OPTIONS } from '@/src/data/spendConcepts';
import { SelectPressable } from '@/src/components/SelectPressable';
import { palette, radii } from '@/src/theme/colors';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { tapFeedback } from '@/src/utils/selectFeedback';

export function ConceptsPlanCard() {
  const { t } = useLanguage();
  const { format, parse, currency } = useMoney();
  const {
    settings,
    addSpendConcept,
    updateSpendConceptColor,
    addSpendSub,
    updateSpendSubAnt,
    removeSpendConcept,
    removeSpendSub,
  } = useSettings();
  const { budgetStatus, updateBudget, removeBudget, transactions } = useFinance();

  const [conceptDraft, setConceptDraft] = useState('');
  const [conceptColor, setConceptColor] = useState<string>(CONCEPT_COLOR_OPTIONS[0]);
  const [subDrafts, setSubDrafts] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [colorEditingId, setColorEditingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [limitDraft, setLimitDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [budgetsOpen, setBudgetsOpen] = useState(false);

  const concepts = settings.spendConcepts ?? [];

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (
        (tx.type !== 'expense' && tx.type !== 'debt_payment') ||
        !tx.categoryId
      )
        continue;
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
    }
    return map;
  }, [transactions]);

  async function handleAddConcept() {
    if (!conceptDraft.trim()) return;
    setSaving(true);
    try {
      const created = await addSpendConcept(conceptDraft, conceptColor);
      setConceptDraft('');
      if (created) {
        setExpanded(created.id);
        const next =
          CONCEPT_COLOR_OPTIONS.find(
            (c) => c !== conceptColor && !concepts.some((x) => x.color === c)
          ) ??
          CONCEPT_COLOR_OPTIONS[
            (CONCEPT_COLOR_OPTIONS.indexOf(
              conceptColor as (typeof CONCEPT_COLOR_OPTIONS)[number]
            ) +
              1) %
              CONCEPT_COLOR_OPTIONS.length
          ];
        setConceptColor(next);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSub(conceptId: string) {
    const name = (subDrafts[conceptId] ?? '').trim();
    if (!name) return;
    setSaving(true);
    try {
      const id = await addSpendSub(conceptId, name);
      if (!id) {
        Alert.alert(t('plan.subDuplicateTitle'), t('plan.subDuplicateBody'));
        return;
      }
      setSubDrafts((prev) => ({ ...prev, [conceptId]: '' }));
    } finally {
      setSaving(false);
    }
  }

  function openLimit(subId: string) {
    const current = budgetStatus.find((b) => b.categoryId === subId)?.limit;
    setEditingId(subId);
    setLimitDraft(current ? String(current) : '');
    setBudgetsOpen(true);
  }

  async function saveLimit() {
    if (!editingId) return;
    const text = limitDraft.trim();
    if (!text) await removeBudget(editingId);
    else {
      const amount = parse(text);
      if (!amount || amount <= 0) await removeBudget(editingId);
      else await updateBudget(editingId, amount);
    }
    setEditingId(null);
    setLimitDraft('');
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.copy}>{t('plan.conceptsBody')}</Text>

      <View style={styles.addRow}>
        <TextInput
          value={conceptDraft}
          onChangeText={setConceptDraft}
          placeholder={t('plan.conceptsCustomPlaceholder')}
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
        />
        <SelectPressable
          onPress={() => void handleAddConcept()}
          disabled={saving || !conceptDraft.trim()}
          style={[styles.addBtn, { backgroundColor: conceptColor }]}>
          <Text style={styles.addBtnText}>{t('plan.conceptsAdd')}</Text>
        </SelectPressable>
      </View>

      <Text style={styles.colorLabel}>{t('plan.conceptColor')}</Text>
      <View style={styles.colorRow}>
        {CONCEPT_COLOR_OPTIONS.map((color) => {
          const selected = conceptColor === color;
          return (
            <SelectPressable
              key={color}
              onPress={() => setConceptColor(color)}
              style={[
                styles.colorDot,
                { backgroundColor: color },
                selected && styles.colorDotSelected,
              ]}
            />
          );
        })}
      </View>

      {concepts.length === 0 ? (
        <Text style={styles.copy}>{t('plan.conceptsEmpty')}</Text>
      ) : (
        concepts.map((concept) => {
          const open = expanded === concept.id;
          const editingColor = colorEditingId === concept.id || open;
          return (
            <View key={concept.id} style={styles.conceptBlock}>
              <View style={styles.conceptHeader}>
                <SelectPressable
                  onPress={() =>
                    setColorEditingId((prev) =>
                      prev === concept.id ? null : concept.id
                    )
                  }
                  hitSlop={8}
                  style={[
                    styles.conceptSwatch,
                    { backgroundColor: concept.color ?? palette.inkSoft },
                  ]}
                />
                <Pressable
                  onPress={() => {
                    tapFeedback();
                    setExpanded(open ? null : concept.id);
                    if (open) setColorEditingId(null);
                  }}
                  style={styles.conceptHeaderMain}>
                  <Text style={styles.conceptTitle}>{concept.name}</Text>
                  <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
                </Pressable>
              </View>

              {editingColor ? (
                <View style={styles.colorEditor}>
                  <Text style={styles.colorLabel}>{t('plan.conceptColorEdit')}</Text>
                  <View style={styles.colorRow}>
                    {CONCEPT_COLOR_OPTIONS.map((color) => {
                      const selected = (concept.color ?? '') === color;
                      return (
                        <SelectPressable
                          key={color}
                          onPress={() => {
                            void updateSpendConceptColor(concept.id, color);
                            setColorEditingId(concept.id);
                          }}
                          style={[
                            styles.colorDot,
                            { backgroundColor: color },
                            selected && styles.colorDotSelected,
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {open ? (
                <View style={styles.conceptBody}>
                  {concept.subs.length === 0 ? (
                    <Text style={styles.copy}>{t('plan.subEmpty')}</Text>
                  ) : (
                    concept.subs.map((sub) => {
                      const budget = budgetStatus.find((b) => b.categoryId === sub.id);
                      const spent = spentByCategory.get(sub.id) ?? budget?.spent ?? 0;
                      const antOn = sub.isAnt === true;
                      return (
                        <View key={sub.id} style={styles.subRow}>
                          <Pressable
                            style={{ flex: 1 }}
                            onPress={() => openLimit(sub.id)}>
                            <View style={styles.subTitleRow}>
                              <Text style={styles.subTitle}>{sub.name}</Text>
                              {antOn ? (
                                <Text style={styles.antBadge}>{t('plan.antBadge')}</Text>
                              ) : null}
                            </View>
                            <Text style={styles.limitMeta}>
                              {budget
                                ? `${format(spent)} / ${format(budget.limit)}`
                                : `${format(spent)} · ${t('plan.noLimit')}`}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              void updateSpendSubAnt(concept.id, sub.id, !antOn)
                            }
                            style={[styles.antToggle, antOn && styles.antToggleOn]}>
                            <Text
                              style={[
                                styles.antToggleText,
                                antOn && styles.antToggleTextOn,
                              ]}>
                              {t('plan.antToggle')}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              Alert.alert(sub.name, undefined, [
                                { text: t('plan.setLimitCancel'), style: 'cancel' },
                                {
                                  text: t('plan.deleteSub'),
                                  style: 'destructive',
                                  onPress: () =>
                                    void removeSpendSub(concept.id, sub.id),
                                },
                              ])
                            }>
                            <Text style={styles.deleteText}>{t('plan.deleteSub')}</Text>
                          </Pressable>
                        </View>
                      );
                    })
                  )}

                  <View style={styles.addRow}>
                    <TextInput
                      value={subDrafts[concept.id] ?? ''}
                      onChangeText={(v) =>
                        setSubDrafts((prev) => ({ ...prev, [concept.id]: v }))
                      }
                      placeholder={t('plan.subPlaceholder')}
                      placeholderTextColor={palette.inkSoft}
                      style={styles.input}
                    />
                    <Pressable
                      onPress={() => void handleAddSub(concept.id)}
                      style={styles.addBtn}>
                      <Text style={styles.addBtnText}>{t('plan.subAdd')}</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={() =>
                      Alert.alert(concept.name, t('plan.deleteConcept'), [
                        { text: t('plan.setLimitCancel'), style: 'cancel' },
                        {
                          text: t('plan.deleteConcept'),
                          style: 'destructive',
                          onPress: () => void removeSpendConcept(concept.id),
                        },
                      ])
                    }
                    style={styles.deleteConceptBtn}>
                    <Text style={styles.deleteText}>{t('plan.deleteConcept')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })
      )}

      <Pressable
        onPress={() => {
          tapFeedback();
          setBudgetsOpen((v) => !v);
        }}
        style={styles.collapseHeader}>
        <Text style={styles.section}>{t('plan.budgets')}</Text>
        <Text style={styles.chevron}>{budgetsOpen ? '▾' : '▸'}</Text>
      </Pressable>
      {budgetsOpen ? (
        <>
          <Text style={styles.copy}>{t('plan.budgetsHint')}</Text>

          {editingId ? (
            <View style={styles.limitEditor}>
              <Text style={styles.subTitle}>
                {categoryLabel(editingId, t, concepts)}
              </Text>
              <TextInput
                value={limitDraft}
                onChangeText={setLimitDraft}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={palette.inkSoft}
                style={styles.input}
                autoFocus
              />
              <View style={styles.addRow}>
                <Pressable
                  onPress={() => {
                    setEditingId(null);
                    setLimitDraft('');
                  }}
                  style={styles.secondaryBtn}>
                  <Text style={styles.secondaryText}>{t('plan.setLimitCancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    void removeBudget(editingId).then(() => {
                      setEditingId(null);
                      setLimitDraft('');
                    })
                  }
                  style={styles.secondaryBtn}>
                  <Text style={[styles.secondaryText, { color: palette.danger }]}>
                    {t('plan.setLimitClear')}
                  </Text>
                </Pressable>
                <Pressable onPress={() => void saveLimit()} style={styles.addBtn}>
                  <Text style={styles.addBtnText}>{t('plan.setLimitSave')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={styles.copy}>{t('plan.budgetsTapHint')}</Text>
          )}
        </>
      ) : null}

      <Pressable
        onPress={() => router.push('/(tabs)/wealth')}
        style={styles.debtLink}>
        <Text style={styles.debtLinkText}>{t('plan.goDebts')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
  },
  copy: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  section: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  input: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
    backgroundColor: '#F4F7F8',
  },
  addBtn: {
    backgroundColor: palette.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.white,
  },
  secondaryBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FFF',
  },
  secondaryText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.inkMuted,
  },
  conceptBlock: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginTop: 4,
  },
  conceptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F7FAFC',
    gap: 10,
  },
  conceptHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  conceptSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  colorLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkMuted,
    marginTop: 2,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: palette.ink,
  },
  colorEditor: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  conceptTitle: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  chevron: { fontSize: 14, color: palette.inkMuted },
  conceptBody: { padding: 12, gap: 8, backgroundColor: '#FFF' },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  subTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  subTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  antBadge: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 10,
    color: palette.accentDeep,
    backgroundColor: '#FFF3EB',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  antToggle: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#F7FAFC',
  },
  antToggleOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  antToggleText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.inkMuted,
  },
  antToggleTextOn: {
    color: palette.white,
  },
  collapseHeader: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  limitMeta: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  deleteText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.danger,
  },
  deleteConceptBtn: { alignSelf: 'flex-start', marginTop: 4 },
  limitEditor: {
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: '#FFF8F4',
    gap: 8,
  },
  debtLink: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    backgroundColor: '#EEF7F6',
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.35)',
  },
  debtLinkText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.teal,
  },
});
