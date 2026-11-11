import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { ADD_FAB_OFFSET, ADD_FAB_SIZE } from '@/src/components/AddFab';
import { tabBarHeight } from '@/src/components/RumiTabBar';
import { useHowToGuide } from '@/src/hooks/useHowToGuide';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';

type Step = {
  id: 'privacy' | 'money' | 'glance' | 'tabs' | 'settings';
  title: TranslationKey;
  body: TranslationKey;
  /** How long the mark stays before moving on by itself. */
  ms?: number;
};

// Three marks: where to log, where everything else is, and where Settings
// and the security facts live. The eye explains itself and Home's ⓘ legend
// covers "available vs. this month".
const STEPS: Step[] = [
  { id: 'glance', title: 'coach.glanceTitle', body: 'coach.glanceBody' },
  { id: 'tabs', title: 'coach.tabsTitle', body: 'coach.tabsBody' },
  // Longer text (what is protected and what is not), so it stays longer.
  { id: 'settings', title: 'coach.settingsTitle', body: 'coach.settingsBody', ms: 10000 },
];

/** Installs from before the security mark existed see only that mark, once. */
const SECURITY_ONLY: Step[] = STEPS.filter((s) => s.id === 'settings');

const STEP_MS = 4200;
/** Home's profile button (opens Settings): size and distance from the header top. */
const AVATAR_SIZE = 36;
const AVATAR_TOP = 8;
const GUTTER = 20;
const FAB_SIZE = 52;
/** Room between the spotlight ring and Home's + button. */
const RING = 8;
/** Card margin from the screen edge; the arrow is measured from it. */
const CARD_SIDE = 18;

export function CoachMarksOverlay() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { settings, ready, coachMarksPending, completeCoachMarks } = useSettings();
  const [step, setStep] = useState(0);
  const [dismissing, setDismissing] = useState(false);

  const securityOnly =
    !coachMarksPending && !settings.securityTipDone && !settings.appLockEnabled;
  const steps = coachMarksPending ? STEPS : SECURITY_ONLY;
  const single = steps.length === 1;

  const visible =
    ready &&
    (coachMarksPending || securityOnly) &&
    settings.onboardingDone &&
    !!settings.userName.trim() &&
    !dismissing;

  async function finish() {
    if (dismissing) return;
    setDismissing(true);
    await completeCoachMarks();
  }

  function goNext() {
    if (step >= steps.length - 1) {
      void finish();
      return;
    }
    setStep((s) => s + 1);
  }

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(goNext, steps[step]?.ms ?? STEP_MS);
    return () => clearTimeout(timer);
    // Restart the timer whenever the step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step]);

  if (!visible) return null;

  const current = steps[step];
  if (!current) return null;
  const fabBottom = Math.max(insets.bottom, 12) + 78;
  const tabTop = Math.max(insets.bottom, 12) + 18;
  // Home's + floats above the tab bar, bottom right.
  const addBottom = tabBarHeight(insets.bottom) + ADD_FAB_OFFSET;
  const addSpot = ADD_FAB_SIZE + RING * 2;
  // Home's profile button sits top right in the header.
  const avatarSpot = AVATAR_SIZE + RING * 2;
  const avatarTop = insets.top + AVATAR_TOP;

  return (
    <AppModal visible transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.root} onPress={goNext}>
        <View style={styles.dim} />

        {current.id === 'privacy' ? (
          <View
            pointerEvents="none"
            style={[
              styles.spot,
              {
                width: FAB_SIZE + 16,
                height: FAB_SIZE + 16,
                borderRadius: (FAB_SIZE + 16) / 2,
                left: 8,
                bottom: fabBottom - 8,
              },
            ]}
          />
        ) : null}

        {current.id === 'glance' ? (
          <View
            pointerEvents="none"
            style={[
              styles.spot,
              {
                width: addSpot,
                height: addSpot,
                borderRadius: addSpot / 2,
                right: ADD_FAB_OFFSET - RING,
                bottom: addBottom - RING,
              },
            ]}
          />
        ) : null}

        {current.id === 'money' ? (
          <View
            pointerEvents="none"
            style={[
              styles.spotBar,
              {
                left: 18,
                right: 18,
                top: insets.top + 168,
                height: 168,
                borderRadius: 22,
              },
            ]}
          />
        ) : null}

        {current.id === 'tabs' ? (
          <View
            pointerEvents="none"
            style={[
              styles.spotBar,
              { left: 10, right: 10, bottom: Math.max(insets.bottom, 8), height: 72 },
            ]}
          />
        ) : null}

        {current.id === 'settings' ? (
          <View
            pointerEvents="none"
            style={[
              styles.spot,
              {
                width: avatarSpot,
                height: avatarSpot,
                borderRadius: avatarSpot / 2,
                right: GUTTER - RING,
                top: avatarTop - RING,
              },
            ]}
          />
        ) : null}

        <Animated.View
          key={current.id}
          entering={
            current.id === 'tabs' || current.id === 'settings'
              ? FadeInUp.springify()
              : FadeInDown.springify()
          }
          pointerEvents="box-none"
          style={[
            styles.cardWrap,
            current.id === 'privacy' && { left: 16, bottom: fabBottom + FAB_SIZE + 18 },
            current.id === 'money' && { left: 18, right: 18, top: insets.top + 350 },
            current.id === 'glance' && {
              right: CARD_SIDE,
              bottom: addBottom + ADD_FAB_SIZE + RING + 18,
            },
            current.id === 'tabs' && { left: 18, right: 18, bottom: tabTop + 86 },
            current.id === 'settings' && {
              right: CARD_SIDE,
              left: CARD_SIDE,
              maxWidth: undefined,
              top: avatarTop + AVATAR_SIZE + RING + 14,
            },
          ]}>
          <View
            style={[
              styles.card,
              current.id === 'privacy' && styles.cardLeft,
              current.id === 'money' && styles.cardCenter,
              current.id === 'glance' && styles.cardRight,
              current.id === 'settings' && styles.cardRight,
            ]}>
            {single ? null : (
              <Text style={styles.kicker}>
                {t('coach.step', { current: step + 1, total: steps.length })}
              </Text>
            )}
            <Text style={styles.title}>{t(current.title)}</Text>
            <Text style={styles.body}>{t(current.body)}</Text>
            <View
              style={[
                styles.arrow,
                current.id === 'privacy' && styles.arrowLeft,
                current.id === 'money' && styles.arrowTop,
                current.id === 'glance' && {
                  right: ADD_FAB_OFFSET + ADD_FAB_SIZE / 2 - CARD_SIDE - 6,
                },
                current.id === 'tabs' && styles.arrowCenter,
                current.id === 'settings' && {
                  top: -6,
                  bottom: undefined,
                  right: GUTTER + AVATAR_SIZE / 2 - CARD_SIDE - 6,
                },
              ]}
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeIn.duration(220)}
          style={[
            styles.footer,
            current.id === 'settings'
              ? { bottom: Math.max(insets.bottom, 12) + 16 }
              : { top: insets.top + 10 },
          ]}
          pointerEvents="box-none">
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              void finish();
            }}
            hitSlop={10}
            style={styles.skipBtn}>
            <Text style={styles.skipText}>{t(single ? 'coach.gotIt' : 'coach.skip')}</Text>
          </Pressable>
          {single ? null : <Text style={styles.hint}>{t('coach.tapHint')}</Text>}
        </Animated.View>
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,20,28,0.62)',
  },
  spot: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  spotBar: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 22,
  },
  cardWrap: {
    position: 'absolute',
    maxWidth: 280,
  },
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  cardLeft: { alignSelf: 'flex-start' },
  cardRight: { alignSelf: 'flex-end' },
  cardCenter: { alignSelf: 'center', maxWidth: 340 },
  kicker: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkSoft,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 18,
    color: palette.ink,
    letterSpacing: -0.3,
  },
  body: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 19,
    color: palette.inkMuted,
  },
  arrow: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: palette.surfaceSolid,
    transform: [{ rotate: '45deg' }],
    bottom: -6,
  },
  arrowLeft: { left: 22 },
  arrowCenter: { alignSelf: 'center', left: '50%', marginLeft: -6 },
  arrowTop: { top: -6, bottom: undefined, alignSelf: 'center', left: '50%', marginLeft: -6 },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  skipText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.white,
  },
  hint: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
  },
});
