import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { appAlert } from '@/src/components/AppAlert';
import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { MoneyText } from '@/src/components/MoneyText';
import { styles } from '@/src/components/wealth/styles';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { usePro } from '@/src/hooks/usePro';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { colors } from '@/src/theme';
import { palette } from '@/src/theme/colors';
import { accountDisplayName, moneyPockets } from '@/src/utils/accounts';
import { formatAmountTyping } from '@/src/utils/money';
import {
  deadlineIn,
  goalStatus,
  parseMonthKey,
  type SavingsGoal,
} from '@/src/utils/savingsGoals';
import { tapFeedback } from '@/src/utils/selectFeedback';

/** Deadline choices, in months from now; 0 = no date. */
const WHEN = [0, 3, 6, 12, 24] as const;
/** Sentinel pocket id: create a wallet named after the goal on save. */
const NEW_POCKET = '__new__';

type Draft = {
  id: string | null;
  name: string;
  target: string;
  when: number | null;
  /** Kept from the goal being edited when no chip was touched. */
  deadline?: string;
  accountId: string;
};

const EMPTY: Draft = { id: null, name: '', target: '', when: 0, accountId: NEW_POCKET };

/**
 * "Metas de ahorro" in Wealth. A goal is a name, an amount, an optional month
 * and a pocket; what is saved is the pocket's balance, so contributing is a
 * normal Move into it. Free: one goal. Pro: as many as you want.
 */
export function SavingsGoalsCard() {
  const { t, language } = useLanguage();
  const { format, parse, currency } = useMoney();
  const { accounts, addWallet } = useFinance();
  const { settings, saveSavingsGoal, removeSavingsGoal } = useSettings();
  const pro = usePro();
  const goals = settings.savingsGoals ?? [];

  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const targetRef = useRef<TextInput>(null);

  const pockets = useMemo(() => moneyPockets(accounts), [accounts]);
  const balanceOf = (id: string) => accounts.find((a) => a.id === id)?.balance ?? 0;
  const step = currency === 'COP' ? 1000 : 1;
  const locale = language === 'es' ? 'es-CO' : 'en-US';
  const monthName = (key?: string) => {
    const m = key ? parseMonthKey(key) : null;
    return m
      ? new Date(m.year, m.month0, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
      : '';
  };
  const whenLabel = (months: number) =>
    months === 0
      ? t('goals.noDate')
      : months === 12
        ? t('goals.inYear')
        : months % 12 === 0
          ? t('goals.inYears', { count: months / 12 })
          : t('goals.inMonths', { count: months });

  const totalSaved = goals.reduce((s, g) => s + Math.max(0, balanceOf(g.accountId)), 0);

  function startCreate() {
    if (!pro.allow('goals', goals.length)) return;
    tapFeedback();
    setOpen(true);
    setDraft({ ...EMPTY });
  }

  function startEdit(goal: SavingsGoal) {
    tapFeedback();
    setDraft({
      id: goal.id,
      name: goal.name,
      target: formatAmountTyping(String(goal.target), currency),
      when: null,
      deadline: goal.deadline,
      accountId: accounts.some((a) => a.id === goal.accountId) ? goal.accountId : NEW_POCKET,
    });
  }

  async function save() {
    if (!draft || saving) return;
    const name = draft.name.trim();
    const target = parse(draft.target);
    if (!name || target == null || !(target > 0)) {
      appAlert(t('goals.title'), t('goals.need'));
      return;
    }
    setSaving(true);
    try {
      let accountId = draft.accountId;
      if (accountId === NEW_POCKET) {
        const wallet = await addWallet(name);
        if (!wallet) return;
        accountId = wallet.id;
      }
      const deadline =
        draft.when == null ? draft.deadline : draft.when === 0 ? undefined : deadlineIn(draft.when);
      const previous = goals.find((g) => g.id === draft.id);
      await saveSavingsGoal({
        id: draft.id ?? `goal-${Date.now().toString(36)}`,
        name,
        target,
        accountId,
        deadline,
        createdAt: previous?.createdAt ?? new Date().toISOString(),
      });
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove(goal: SavingsGoal) {
    appAlert(t('goals.removeTitle'), t('goals.removeBody'), [
      { text: t('goals.cancel'), style: 'cancel' },
      {
        text: t('goals.remove'),
        style: 'destructive',
        onPress: () => void removeSavingsGoal(goal.id),
      },
    ]);
  }

  function contribute(goal: SavingsGoal) {
    tapFeedback();
    router.push({ pathname: '/agregar', params: { intent: 'move', toAccountId: goal.accountId } });
  }

  function renderForm() {
    if (!draft) return null;
    const newLabel = draft.name.trim()
      ? t('goals.newPocket', { name: draft.name.trim() })
      : t('goals.newPocketPlain');
    return (
      <View style={styles.form} testID="goal-form">
        <Text style={styles.label}>{t('goals.name')}</Text>
        <TextInput
          testID="goal-name"
          value={draft.name}
          onChangeText={(name) => setDraft((d) => (d ? { ...d, name } : d))}
          placeholder={t('goals.namePlaceholder')}
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
          maxLength={40}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => targetRef.current?.focus()}
        />
        <Text style={styles.label}>{t('goals.target')}</Text>
        <TextInput
          testID="goal-target"
          ref={targetRef}
          value={draft.target}
          onChangeText={(v) =>
            setDraft((d) => (d ? { ...d, target: formatAmountTyping(v, currency) } : d))
          }
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
        />
        <Text style={styles.label}>{t('goals.when')}</Text>
        <View style={styles.chipWrap}>
          {WHEN.map((months) => {
            const on =
              draft.when === months ||
              (draft.when == null && months === 0 && !draft.deadline);
            return (
              <Pressable
                key={months}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  tapFeedback();
                  setDraft((d) => (d ? { ...d, when: months } : d));
                }}
                style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{whenLabel(months)}</Text>
              </Pressable>
            );
          })}
        </View>
        {draft.when == null && draft.deadline ? (
          <Text style={styles.meta}>{monthName(draft.deadline)}</Text>
        ) : null}
        <Text style={styles.label}>{t('goals.pocket')}</Text>
        <View style={styles.chipWrap}>
          {[{ id: NEW_POCKET, label: newLabel }, ...pockets.map((a) => ({ id: a.id, label: accountDisplayName(a, t) }))].map(
            (opt) => {
              const on = draft.accountId === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    tapFeedback();
                    setDraft((d) => (d ? { ...d, accountId: opt.id } : d));
                  }}
                  style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
                </Pressable>
              );
            }
          )}
        </View>
        <Text style={styles.meta}>{t('goals.pocketHint')}</Text>
        <View style={styles.formActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setDraft(null)}
            style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>{t('goals.cancel')}</Text>
          </Pressable>
          <Pressable
            testID="goal-save"
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void save()}
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
            <Text style={styles.saveBtnText}>{t('goals.save')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderGoal(goal: SavingsGoal) {
    const pocket = accounts.find((a) => a.id === goal.accountId);
    const status = goalStatus(goal, pocket?.balance ?? 0, new Date(), step);
    const pct = Math.round(status.progress * 100);
    if (draft?.id === goal.id) return <View key={goal.id}>{renderForm()}</View>;
    return (
      <View key={goal.id} style={styles.card} testID={`goal-${goal.name}`}>
        <View style={styles.sectionRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.cardTitle}>{goal.name}</Text>
            {pocket && accountDisplayName(pocket, t) !== goal.name ? (
              <Text style={styles.meta}>{accountDisplayName(pocket, t)}</Text>
            ) : null}
          </View>
          <Text style={styles.cardTitle}>{pct}%</Text>
        </View>
        <MoneyText style={styles.meta}>
          {t('goals.saved', { saved: format(status.saved), target: format(goal.target) })}
        </MoneyText>
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityLabel={t('goals.a11yProgress', { name: goal.name, pct })}
          accessibilityValue={{ min: 0, max: 100, now: pct }}>
          <View
            style={[
              styles.fill,
              {
                width: `${pct}%`,
                backgroundColor: status.done ? colors.status.success : colors.accent.teal,
              },
            ]}
          />
        </View>
        <Text style={[styles.meta, { color: palette.ink }]}>
          {!pocket
            ? t('goals.missingPocket')
            : status.done
              ? t('goals.done')
              : status.late
                ? t('goals.late', { date: monthName(goal.deadline), left: format(status.left) })
                : status.monthly != null
                  ? t('goals.monthly', {
                      amount: format(status.monthly),
                      date: monthName(goal.deadline),
                    })
                  : t('goals.noDateLeft', { left: format(status.left) })}
        </Text>
        <View style={styles.formActions}>
          {pocket && !status.done ? (
            <Pressable
              testID="goal-contribute"
              accessibilityRole="button"
              onPress={() => contribute(goal)}
              style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{t('goals.contribute')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => startEdit(goal)}
            style={styles.secondaryBtn}>
            <Text style={styles.editText}>{t('goals.edit')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => confirmRemove(goal)}
            style={styles.secondaryBtn}>
            <Text style={styles.deleteText}>{t('goals.remove')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <CollapsibleSection
        title={t('goals.title')}
        open={open}
        onToggle={() => setOpen((v) => !v)}
        summary={
          goals.length === 0
            ? t('goals.add')
            : goals.length === 1
              ? t('goals.collapsedOne', { saved: format(totalSaved) })
              : t('goals.collapsed', { count: goals.length, saved: format(totalSaved) })
        }>
        {!draft || draft.id ? (
          <View style={styles.sectionRow}>
            <View style={{ flex: 1 }} />
            <Pressable
              testID="goal-add"
              accessibilityRole="button"
              onPress={startCreate}
              style={styles.addBtn}>
              <Text style={styles.addBtnText}>{t('goals.add')}</Text>
            </Pressable>
          </View>
        ) : null}
        {draft && !draft.id ? renderForm() : null}
        {goals.length === 0 && !draft ? (
          <View style={styles.card}>
            <Text style={styles.empty}>{t('goals.empty')}</Text>
          </View>
        ) : null}
        {goals.map(renderGoal)}
      </CollapsibleSection>
    </View>
  );
}
