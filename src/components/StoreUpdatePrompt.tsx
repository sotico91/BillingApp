import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { appAlert } from '@/src/components/AppAlert';
import { useLanguage } from '@/src/i18n/LanguageContext';
import {
  checkStoreUpdate,
  startStoreUpdate,
  storeUpdateSupported,
} from '@/modules/rumi-store-update';

import { shouldCheckUpdate, updateSnoozed } from '@/src/utils/storeUpdate';

/**
 * Android installed from Google Play: when a newer build is out (internal test
 * included), offer to update right here. Play runs the update full screen and
 * restarts Rumi. It asks Play on launch and every time Rumi comes back to the
 * front (the app is rarely killed); "Not now" holds that version for 2 hours.
 */
export function StoreUpdatePrompt() {
  const { t } = useLanguage();
  const lastCheck = useRef(0);
  const declined = useRef<{ versionCode: number; at: number } | null>(null);
  const asking = useRef(false);

  useEffect(() => {
    if (!storeUpdateSupported()) return;

    async function check() {
      const now = Date.now();
      if (!shouldCheckUpdate(now, lastCheck.current, asking.current)) return;
      lastCheck.current = now;
      const info = await checkStoreUpdate();
      // An update already started and cut off: Play resumes it on its own screen.
      if (info.inProgress) {
        await startStoreUpdate();
        return;
      }
      if (!info.available || updateSnoozed(declined.current, info.versionCode ?? 0, Date.now())) return;
      asking.current = true;
      appAlert(
        t('update.title'),
        t('update.body'),
        [
          {
            text: t('update.later'),
            style: 'cancel',
            onPress: () => {
              declined.current = { versionCode: info.versionCode ?? 0, at: Date.now() };
              asking.current = false;
            },
          },
          {
            text: t('update.now'),
            onPress: () => {
              asking.current = false;
              void startStoreUpdate();
            },
          },
        ]
      );
    }

    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => sub.remove();
  }, [t]);

  return null;
}
