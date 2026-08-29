import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppCopyright } from '@/src/components/AppCopyright';
import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { ConceptsPlanCard } from '@/src/components/ConceptsPlanCard';
import { FadeInBlock } from '@/src/components/FadeInBlock';
import { MoneyText } from '@/src/components/MoneyText';
import { RaisedText } from '@/src/components/RaisedText';
import { ReminderSettingsCard } from '@/src/components/ReminderSettingsCard';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { isGeneralSubName } from '@/src/data/spendConcepts';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { toneFromBudgetRatio } from '@/src/utils/signalTone';

export default function PlanScreen() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const { budgetStatus, antForPeriod } = useFinance();
  const ant = antForPeriod('mes');
  const spendConcepts = settings.spendConcepts ?? [];
  const needsSubSetup =
    spendConcepts.length > 0 &&
    spendConcepts.every(
      (c) => c.subs.length === 1 && isGeneralSubName(c.subs[0].name)
    );
  const [conceptsOpen, setConceptsOpen] = useState(needsSubSetup);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [budgetsOpen, setBudgetsOpen] = useState(false);
  const [antOpen, setAntOpen] = useState(false);

  const activeBudgets = budgetStatus.filter((b) => b.limit > 0);
  const reminderCount = (settings.reminderRules ?? []).length;
  const markedAntSubs = spendConcepts.flatMap((c) =>
    c.subs.filter((s) => s.isAnt).map((s) => ({ concept: c.name, sub: s.name, id: s.id }))
  );

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
        <FadeInBlock>
          <RaisedText style={styles.title}>{t('plan.title')}</RaisedText>
          <Text style={styles.subtitle}>{t('plan.subtitle')}</Text>
        </FadeInBlock>

        <FadeInBlock index={1}>
          <CollapsibleSection
            title={t('plan.concepts')}
            open={conceptsOpen}
            onToggle={() => setConceptsOpen((v) => !v)}
            summary={t('plan.conceptsCollapsed', { count: spendConcepts.length })}>
            <ConceptsPlanCard />
          </CollapsibleSection>
        </FadeInBlock>

        <FadeInBlock index={2}>
          <CollapsibleSection
            title={t('reminder.title')}
            open={remindersOpen}
            onToggle={() => setRemindersOpen((v) => !v)}
            summary={t('reminder.collapsed', { count: reminderCount })}>
            <ReminderSettingsCard />
          </CollapsibleSection>
        </FadeInBlock>

        {activeBudgets.length > 0 ? (
          <FadeInBlock index={3}>
            <CollapsibleSection
              title={t('plan.budgets')}
              open={budgetsOpen}
              onToggle={() => setBudgetsOpen((v) => !v)}
              summary={t('plan.budgetsCollapsed', { count: activeBudgets.length })}>
              <View style={styles.listCard}>
                {activeBudgets.map((b, index) => {
                  const tone = toneFromBudgetRatio(b.ratio);
                  const over = b.remaining < 0;
                  const pct = Math.min(Math.round(b.ratio * 100), 999);
                  return (
                    <View
                      key={b.categoryId}
                      style={[
                        styles.row,
                        index < activeBudgets.length - 1 && styles.rowDivider,
                      ]}>
                      <View style={styles.rowTop}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {categoryLabel(b.categoryId, t, spendConcepts)}
                        </Text>
                        <Text
                          style={[
                            styles.rowPct,
                            tone === 'danger' && styles.textDanger,
                            tone === 'warn' && styles.textWarn,
                            tone === 'good' && styles.textGood,
                          ]}>
                          {pct}%
                        </Text>
                      </View>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            {
                              width: `${Math.min(b.ratio * 100, 100)}%`,
                              backgroundColor:
                                tone === 'danger'
                                  ? palette.danger
                                  : tone === 'warn'
                                    ? palette.accent
                                    : tone === 'good'
                                      ? palette.success
                                      : palette.teal,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.rowMeta}>
                        {format(b.spent)} / {format(b.limit)}
                        {' · '}
                        {over
                          ? t('plan.over', { amount: format(Math.abs(b.remaining)) })
                          : t('plan.left', { amount: format(b.remaining) })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </CollapsibleSection>
          </FadeInBlock>
        ) : null}

        <FadeInBlock index={4}>
          <CollapsibleSection
            title={t('plan.antTitle')}
            open={antOpen}
            onToggle={() => setAntOpen((v) => !v)}
            summary={t('plan.antCollapsed', { amount: format(ant.total) })}>
            <View style={styles.listCard}>
              <Text style={styles.antHint}>{t('plan.antHint')}</Text>
              {markedAntSubs.length === 0 ? (
                <Text style={styles.empty}>{t('plan.antMarkNone')}</Text>
              ) : (
                <View style={styles.markedWrap}>
                  <Text style={styles.markedLabel}>{t('plan.antMarked')}</Text>
                  {markedAntSubs.map((item) => (
                    <Text key={item.id} style={styles.markedItem}>
                      · {item.concept} / {item.sub}
                    </Text>
                  ))}
                </View>
              )}
              <View style={styles.antHeader}>
                <Text style={styles.rowTitle}>{t('home.antTotal')}</Text>
                <MoneyText style={styles.antTotal}>{format(ant.total)}</MoneyText>
              </View>
              {ant.items.length === 0 ? (
                <Text style={styles.empty}>{t('plan.antEmpty')}</Text>
              ) : (
                ant.items.map((item, index) => (
                  <View
                    key={item.categoryId}
                    style={[
                      styles.antRow,
                      index < ant.items.length - 1 && styles.rowDivider,
                    ]}>
                    <Text style={styles.rowMeta}>
                      {categoryLabel(item.categoryId, t, spendConcepts)}
                    </Text>
                    <MoneyText style={styles.antAmount}>{format(item.amount)}</MoneyText>
                  </View>
                ))
              )}
            </View>
          </CollapsibleSection>
        </FadeInBlock>

        <FadeInBlock index={5}>
          <AppCopyright />
        </FadeInBlock>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 22, paddingBottom: 168, gap: 12 },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    color: palette.brand,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.brandMuted,
    lineHeight: 20,
  },
  listCard: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  row: { paddingVertical: 10 },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  rowPct: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.inkMuted,
  },
  track: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E8EEF1',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  rowMeta: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
  },
  antHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  markedWrap: { marginBottom: 10, gap: 2 },
  markedLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.ink,
    marginBottom: 2,
  },
  markedItem: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
  },
  antHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 4,
  },
  antTotal: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
  },
  antRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  antAmount: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: 4,
  },
  textDanger: { color: palette.danger },
  textWarn: { color: palette.accentDeep },
  textGood: { color: palette.success },
});
