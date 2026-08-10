import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CATEGORIES } from '@/src/data/categories';
import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';

const HOURS = [8, 12, 18, 20, 21];

function slugConcept(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export function ReminderSettingsCard() {
  const { t } = useLanguage();
  const { settings, updateReminders } = useSettings();
  const { transactions } = useFinance();
  const [selected, setSelected] = useState<string[]>(settings.reminderCategoryIds);
  const [customs, setCustoms] = useState<string[]>(settings.reminderCustomConcepts ?? []);
  const [customDraft, setCustomDraft] = useState('');
  const [hour, setHour] = useState(settings.reminderHour);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(settings.reminderCategoryIds);
    setCustoms(settings.reminderCustomConcepts ?? []);
    setHour(settings.reminderHour);
  }, [
    settings.reminderCategoryIds,
    settings.reminderCustomConcepts,
    settings.reminderHour,
  ]);

  const registeredCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.categoryId) ids.add(tx.categoryId);
    }
    for (const id of selected) ids.add(id);
    return ids;
  }, [transactions, selected]);

  const choices = useMemo(
    () =>
      CATEGORIES.filter(
        (c) =>
          c.id !== 'ingresos' &&
          settings.enabledCategoryIds.includes(c.id) &&
          (c.id === 'otros' || registeredCategoryIds.has(c.id))
      ),
    [settings.enabledCategoryIds, registeredCategoryIds]
  );

  const otrosOn = selected.includes('otros');

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        if (id === 'otros') setCustoms([]);
        return next;
      }
      return [...prev, id];
    });
  }

  function addCustom() {
    const name = customDraft.trim();
    if (!name) return;
    const exists = customs.some((c) => c.toLowerCase() === name.toLowerCase());
    if (exists) {
      setCustomDraft('');
      return;
    }
    setCustoms((prev) => [...prev, name]);
    if (!selected.includes('otros')) {
      setSelected((prev) => [...prev, 'otros']);
    }
    setCustomDraft('');
  }

  function removeCustom(name: string) {
    setCustoms((prev) => {
      const next = prev.filter((c) => c !== name);
      if (next.length === 0) {
        setSelected((ids) => ids.filter((id) => id !== 'otros'));
      }
      return next;
    });
  }

  async function save() {
    const standardIds = selected.filter((id) => id !== 'otros');
    if (otrosOn && customs.length === 0) {
      Alert.alert(t('reminder.customNeedTitle'), t('reminder.customNeedBody'));
      return;
    }

    setSaving(true);
    try {
      const labels: Record<string, { title: string; body: string }> = {};
      for (const categoryId of standardIds) {
        labels[categoryId] = {
          title: t('reminder.pushTitle'),
          body: t('reminder.pushBody', {
            category: t(`category.${categoryId}` as TranslationKey),
          }),
        };
      }
      for (const name of customs) {
        const id = `custom-${slugConcept(name) || 'concepto'}`;
        labels[id] = {
          title: t('reminder.pushTitle'),
          body: t('reminder.pushBody', { category: name }),
        };
      }

      const reminderCategoryIds = [
        ...standardIds,
        ...(customs.length > 0 ? ['otros'] : []),
      ];

      await updateReminders({
        reminderCategoryIds,
        reminderCustomConcepts: customs,
        reminderHour: hour,
        reminderLabels: labels,
      });
      Alert.alert(t('reminder.savedTitle'), t('reminder.savedBody'));
    } finally {
      setSaving(false);
    }
  }

  const invalidOtros = otrosOn && customs.length === 0;
  const canSave = !invalidOtros; // empty selection clears all reminders

  return (
    <View style={styles.card}>
      <Text style={styles.copy}>{t('reminder.body')}</Text>

      <Text style={styles.label}>{t('reminder.pickHour')}</Text>
      <View style={styles.row}>
        {HOURS.map((h) => (
          <Pressable
            key={h}
            onPress={() => setHour(h)}
            style={[styles.hourChip, hour === h && styles.hourOn]}>
            <Text style={[styles.hourText, hour === h && styles.hourTextOn]}>
              {t('reminder.hourLabel', { hour: h })}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('reminder.pickCategories')}</Text>
      {choices.length === 0 ? (
        <Text style={styles.copy}>{t('reminder.noRegistered')}</Text>
      ) : (
        <View style={styles.row}>
          {choices.map((cat) => {
            const on = selected.includes(cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => toggle(cat.id)}
                style={[
                  styles.chip,
                  on && { backgroundColor: cat.color, borderColor: cat.color },
                ]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {t(`category.${cat.id}` as TranslationKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {otrosOn ? (
        <View style={styles.customBlock}>
          <Text style={styles.label}>{t('reminder.customLabel')}</Text>
          <Text style={styles.hint}>{t('reminder.customHint')}</Text>
          <View style={styles.customRow}>
            <TextInput
              value={customDraft}
              onChangeText={setCustomDraft}
              placeholder={t('reminder.customPlaceholder')}
              placeholderTextColor={palette.inkSoft}
              style={styles.customInput}
              autoCapitalize="sentences"
              returnKeyType="done"
              onSubmitEditing={addCustom}
            />
            <Pressable onPress={addCustom} style={styles.addBtn}>
              <Text style={styles.addBtnText}>{t('reminder.customAdd')}</Text>
            </Pressable>
          </View>
          {customs.length > 0 ? (
            <View style={styles.row}>
              {customs.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => removeCustom(name)}
                  style={styles.customChip}>
                  <Text style={styles.customChipText}>{name} ×</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable
        onPress={() => void save()}
        disabled={saving || !canSave}
        style={[styles.saveBtn, (saving || !canSave) && { opacity: 0.7 }]}>
        <Text style={styles.saveText}>
          {saving ? t('add.saving') : t('reminder.save')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 10,
  },
  copy: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 19,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
    lineHeight: 17,
    marginTop: -4,
  },
  label: {
    marginTop: 4,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hourChip: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hourOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  hourText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
  hourTextOn: { color: palette.white },
  chip: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
  chipTextOn: { color: palette.white },
  customBlock: { gap: 8 },
  customRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.ink,
    backgroundColor: '#F7FAFC',
  },
  addBtn: {
    backgroundColor: palette.teal,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  addBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: palette.white,
    fontSize: 13,
  },
  customChip: {
    backgroundColor: palette.accentSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,74,0.35)',
  },
  customChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.accentDeep,
  },
  saveBtn: {
    marginTop: 6,
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveText: {
    fontFamily: 'DMSans_600SemiBold',
    color: palette.white,
  },
});
