import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import { tapFeedback } from '@/src/utils/selectFeedback';

type Section = {
  title: TranslationKey;
  body: TranslationKey;
};

const SECTIONS: Section[] = [
  { title: 'guide.ideaTitle', body: 'guide.ideaBody' },
  { title: 'guide.spendTitle', body: 'guide.spendBody' },
  { title: 'guide.wealthTitle', body: 'guide.wealthBody' },
  { title: 'guide.debtTitle', body: 'guide.debtBody' },
  { title: 'guide.dayTitle', body: 'guide.dayBody' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function HowToGuideSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}>
          <View style={styles.handle} />
          <Text style={styles.kicker}>{t('guide.kicker')}</Text>
          <Text style={styles.title}>{t('guide.title')}</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {SECTIONS.map((section) => (
              <View key={section.title} style={styles.card}>
                <Text style={styles.cardTitle}>{t(section.title)}</Text>
                <Text style={styles.cardBody}>{t(section.body)}</Text>
              </View>
            ))}
            <Text style={styles.hint}>{t('guide.hint')}</Text>
          </ScrollView>
          <Pressable
            onPress={() => {
              tapFeedback();
              onClose();
            }}
            style={styles.done}>
            <Text style={styles.doneText}>{t('guide.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,20,28,0.55)',
    justifyContent: 'flex-end',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: palette.surfaceSolid,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: palette.border,
    marginBottom: 12,
  },
  kicker: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.inkSoft,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 4,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: palette.ink,
    letterSpacing: -0.6,
  },
  scroll: {
    marginTop: 14,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 12,
  },
  card: {
    backgroundColor: '#F3F7F9',
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  cardBody: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkMuted,
  },
  hint: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSoft,
  },
  done: {
    marginTop: 8,
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.white,
  },
});
