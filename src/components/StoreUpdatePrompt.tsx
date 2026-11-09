import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { appAlert } from '@/src/components/AppAlert';
import { useLanguage } from '@/src/i18n/LanguageContext';
import {
  checkStoreUpdate,
  startStoreUpdate,
  storeUpdateSupported,
} from '@/modules/rumi-store-update';

/** Ask Play again at most this often while the app keeps coming back to the front. */
const RECHECK_MS = 30 * 60 * 1000;

/**
 * Android installed from Google Play: when a newer build is out (internal test
 * included), offer to update right here. Play runs the update full screen and
 * restarts Rumi. "Not now" holds until the next launch.
 */
export function StoreUpdatePrompt() {
  const { t } = useLanguage();
  const lastCheck = useRef(0);
  const declined = useRef<number | null>(null);
  const asking = useRef(false);

  useEffect(() => {
    if (!storeUpdateSupported()) return;

    async function check() {
      const now = Date.now();
      if (asking.current || now - lastCheck.current < RECHECK_MS) return;
      lastCheck.current = now;
      const info = await checkStoreUpdate();
      // An update already started and cut off: Play resumes it on its own screen.
      if (info.inProgress) {
        await startStoreUpdate();
        return;
      }
      if (!info.available || declined.current === (info.versionCode ?? 0)) return;
      asking.current = true;
      appAlert(
        t('update.title'),
        t('update.body'),
        [
          {
            text: t('update.later'),
            style: 'cancel',
            onPress: () => {
              declined.current = info.versionCode ?? 0;
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
