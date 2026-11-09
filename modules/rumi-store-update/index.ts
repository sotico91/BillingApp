import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

export type StoreUpdateInfo = {
  available: boolean;
  inProgress: boolean;
  versionCode?: number;
};

type NativeStoreUpdate = {
  checkAsync(): Promise<StoreUpdateInfo>;
  startAsync(): Promise<boolean>;
};

// Android only. Missing on iOS, web, Expo Go and the simulator build.
const native =
  Platform.OS === 'android' ? requireOptionalNativeModule<NativeStoreUpdate>('RumiStoreUpdate') : null;

export function storeUpdateSupported(): boolean {
  return native != null;
}

/** Asks Google Play whether a newer build of Rumi is out. Never throws. */
export async function checkStoreUpdate(): Promise<StoreUpdateInfo> {
  if (!native) return { available: false, inProgress: false };
  try {
    return await native.checkAsync();
  } catch {
    return { available: false, inProgress: false };
  }
}

/** Runs Play's full-screen update (it installs and restarts Rumi). Never throws. */
export async function startStoreUpdate(): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.startAsync();
  } catch {
    return false;
  }
}
