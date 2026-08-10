import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EditTransactionModal } from '@/src/components/EditTransactionModal';
import { ExpenseRow } from '@/src/components/ExpenseRow';
import { FadeInBlock } from '@/src/components/FadeInBlock';
import { PeriodToggle } from '@/src/components/PeriodToggle';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Period, PersonScope, Transaction } from '@/src/types/finance';
import { shiftMonth, sumByType } from '@/src/utils/financeMath';

export default function HistorialScreen() {
  const { t, language } = useLanguage();
  const { format } = useMoney();
  const {
    transactionsForPeriod,
    transactionsForMonth,
    totalForPeriod,
    removeTransaction,
    canEditTransaction,
  } = useFinance();

  const now = new Date();
  const [period, setPeriod] = useState<Period>('mes');
  const [personScope, setPersonScope] = useState<PersonScope>('mine');
  const [monthCursor, setMonthCursor] = useState({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  });
  const [editing, setEditing] = useState<Transaction | null>(null);

  const isCurrentMonth =
    monthCursor.year === now.getFullYear() &&
    monthCursor.monthIndex === now.getMonth();

  const items = useMemo(() => {
    if (period === 'mes') {
      return transactionsForMonth(
        monthCursor.year,
        monthCursor.monthIndex,
        personScope
      );
    }
    return transactionsForPeriod(period, personScope);
  }, [period, personScope, monthCursor, transactionsForMonth, transactionsForPeriod]);

  const expenseTotal =
    period === 'mes'
      ? sumByType(items, 'expense')
      : totalForPeriod(period, 'expense', personScope);
  const incomeTotal = sumByType(items, 'income');
  const monthBalance = incomeTotal - expenseTotal;

  const periodLabel =
    period === 'mes'
      ? new Date(monthCursor.year, monthCursor.monthIndex, 1).toLocaleDateString(
          language === 'es' ? 'es-CO' : 'en-US',
          { month: 'long', year: 'numeric' }
        )
      : t(`period.${period}` as TranslationKey);

  function confirmDelete(tx: Transaction) {
    if (!canEditTransaction(tx)) {
      Alert.alert(t('history.deleteTitle'), t('history.onlyOwn'));
      return;
    }
    Alert.alert(t('history.deleteTitle'), t('history.deleteMessage'), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('history.delete'),
        style: 'destructive',
        onPress: () => {
          void removeTransaction(tx.id);
        },
      },
    ]);
  }

  function openEdit(tx: Transaction) {
    if (!canEditTransaction(tx)) {
      Alert.alert(t('history.editTitle'), t('history.onlyOwn'));
      return;
    }
    setEditing(tx);
  }

  function goPrevMonth() {
    setMonthCursor((m) => shiftMonth(m.year, m.monthIndex, -1));
  }

  function goNextMonth() {
    if (isCurrentMonth) return;
    setMonthCursor((m) => shiftMonth(m.year, m.monthIndex, 1));
  }

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FadeInBlock>
          <Text style={styles.pageTitle}>{t('history.title')}</Text>
          <PeriodToggle
            value={period}
            onChange={(next) => {
              setPeriod(next);
              if (next === 'mes') {
                setMonthCursor({
                  year: now.getFullYear(),
                  monthIndex: now.getMonth(),
                });
              }
            }}
          />
          <View style={styles.scopeRow}>
            {(['mine', 'all'] as PersonScope[]).map((scope) => {
              const active = personScope === scope;
              return (
                <Pressable
                  key={scope}
                  onPress={() => setPersonScope(scope)}
                  style={[styles.scopeChip, active && styles.scopeChipActive]}>
                  <Text style={[styles.scopeText, active && styles.scopeTextActive]}>
                    {scope === 'mine' ? t('history.scopeMine') : t('history.scopeAll')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.scopeHint}>{t('history.personHint')}</Text>
        </FadeInBlock>

        {period === 'mes' ? (
          <FadeInBlock index={1}>
            <View style={styles.monthNav}>
              <Pressable onPress={goPrevMonth} style={styles.navBtn}>
                <Text style={styles.navText}>‹ {t('history.prevMonth')}</Text>
              </Pressable>
              <Text style={styles.monthLabel}>{periodLabel}</Text>
              <Pressable
                onPress={goNextMonth}
                disabled={isCurrentMonth}
                style={[styles.navBtn, isCurrentMonth && styles.navDisabled]}>
                <Text style={[styles.navText, isCurrentMonth && styles.navTextDisabled]}>
                  {t('history.nextMonth')} ›
                </Text>
              </Pressable>
            </View>
          </FadeInBlock>
        ) : null}

        <FadeInBlock index={2}>
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>
              {t('history.total', { period: periodLabel })}
            </Text>
            <Text style={styles.summaryAmount}>{format(expenseTotal)}</Text>

            {period === 'mes' ? (
              <View style={styles.monthStats}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>{t('history.monthIncome')}</Text>
                  <Text style={[styles.statValue, styles.income]}>{format(incomeTotal)}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>{t('history.monthExpenses')}</Text>
                  <Text style={[styles.statValue, styles.expense]}>
                    {format(expenseTotal)}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>{t('history.monthBalance')}</Text>
                  <Text
                    style={[
                      styles.statValue,
                      monthBalance >= 0 ? styles.income : styles.expense,
                    ]}>
                    {format(monthBalance)}
                  </Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.hint}>{t('history.hintEdit')}</Text>
          </View>
        </FadeInBlock>

        <FadeInBlock index={3}>
          {items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>{t('history.emptyTitle')}</Text>
              <Text style={styles.empty}>{t('history.empty')}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {items.map((tx, index) => {
                const mine = canEditTransaction(tx);
                return (
                  <ExpenseRow
                    key={tx.id}
                    expense={tx}
                    last={index === items.length - 1}
                    showRegistrant={personScope === 'all'}
                    onEdit={mine ? () => openEdit(tx) : undefined}
                    onDelete={mine ? () => confirmDelete(tx) : undefined}
                  />
                );
              })}
            </View>
          )}
        </FadeInBlock>
      </ScrollView>

      <EditTransactionModal
        visible={!!editing}
        transaction={editing}
        onClose={() => setEditing(null)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 22, paddingBottom: 120, gap: 16 },
  pageTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    color: palette.brand,
    marginBottom: 12,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  scopeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  scopeChipActive: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  scopeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.brand,
  },
  scopeTextActive: {
    color: palette.white,
  },
  scopeHint: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.brandMuted,
    lineHeight: 17,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii.md,
    padding: 10,
    gap: 8,
  },
  navBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navDisabled: { opacity: 0.35 },
  navText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.brand,
  },
  navTextDisabled: {
    color: palette.brandMuted,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: palette.brand,
    textTransform: 'capitalize',
  },
  summary: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 22,
  },
  summaryLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.inkMuted,
    textTransform: 'uppercase',
  },
  summaryAmount: {
    marginTop: 8,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    color: palette.ink,
  },
  monthStats: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 10,
  },
  statLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: palette.inkSoft,
  },
  statValue: {
    marginTop: 4,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 15,
  },
  income: { color: palette.success },
  expense: { color: palette.danger },
  hint: {
    marginTop: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
    lineHeight: 17,
  },
  list: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
  },
  emptyWrap: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    padding: 22,
  },
  emptyTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.ink,
  },
  empty: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    color: palette.inkMuted,
  },
});
