import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

import { useSettings } from '@/src/hooks/useSettings';
import {
  PRO_ENTITLEMENT,
  asksLeft as asksLeftOf,
  decideFounder,
  freeAllows,
  recordAsk,
  type ProFeature,
  type ProState,
} from '@/src/utils/pro';

const STORAGE_KEY = 'rumi.pro.v1';

/**
 * Store keys come from EAS environment variables. With no key for this
 * platform (local builds, Expo Go, web) Pro is off: nothing is limited and the
 * app behaves as before Pro existed.
 */
function storeKey(): string | null {
  if (Platform.OS === 'web') return null;
  if (Constants.executionEnvironment === 'storeClient') return null; // Expo Go
  const key =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  return key && key.trim() ? key.trim() : null;
}

type PurchasesModule = typeof import('react-native-purchases').default;

function loadPurchases(): PurchasesModule {
  // Loaded only when a key exists, so Expo Go and web never touch the native module.
  return require('react-native-purchases').default as PurchasesModule;
}

export type PurchaseOutcome = 'done' | 'cancelled' | 'error';

type ProContextValue = {
  /** The store is set up, so the free limits apply. */
  available: boolean;
  /** Pro is unlocked: bought in the store or kept as a founder. */
  isPro: boolean;
  /** Installed before Pro existed: Pro for free, for good. */
  founder: boolean;
  /** Pro bought in the store and active now. */
  subscribed: boolean;
  /** Free questions left this month (meaningful only when not Pro). */
  asksLeft: number;
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
  /** Store page where the subscription is managed or cancelled. */
  manageUrl: string | null;
  /**
   * Call before a limited action. True: go ahead. False: the free allowance is
   * used up and the Pro screen was opened instead.
   */
  allow: (feature: ProFeature, existing?: number) => boolean;
  /** Count one question to Rumi against this month's free allowance. */
  noteAsk: () => void;
  purchase: (pkg: PurchasesPackage) => Promise<PurchaseOutcome>;
  /** True when a Pro purchase was found and restored. */
  restore: () => Promise<boolean>;
  /** Reloads plans and prices (e.g. when the Pro screen opens). */
  refreshPlans: () => Promise<void>;
};

const ProContext = createContext<ProContextValue | null>(null);

function hasPro(info: CustomerInfo | null): boolean {
  return !!info?.entitlements.active[PRO_ENTITLEMENT];
}

export function ProProvider({ children }: { children: ReactNode }) {
  const { settings, ready: settingsReady } = useSettings();
  const key = useMemo(storeKey, []);
  const available = key !== null;
  const [state, setState] = useState<ProState>({});
  const [loaded, setLoaded] = useState(false);
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [monthly, setMonthly] = useState<PurchasesPackage | null>(null);
  const [annual, setAnnual] = useState<PurchasesPackage | null>(null);
  const configured = useRef(false);

  const persist = useCallback((next: ProState) => {
    setState(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState(JSON.parse(raw) as ProState);
      } catch {
        // A damaged value only resets the question count.
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Founder is decided the first time Pro is on, so people who update keep it free.
  useEffect(() => {
    if (!available || !loaded || !settingsReady || state.founder !== undefined) return;
    persist(decideFounder(state, settings.onboardingDone));
  }, [available, loaded, settingsReady, settings.onboardingDone, state, persist]);

  const refreshPlans = useCallback(async () => {
    if (!configured.current) return;
    try {
      const offering = (await loadPurchases().getOfferings()).current;
      setMonthly(offering?.monthly ?? null);
      setAnnual(offering?.annual ?? null);
    } catch {
      // No connection: the Pro screen says the plans could not load.
    }
  }, []);

  useEffect(() => {
    if (!key || configured.current) return;
    const Purchases = loadPurchases();
    try {
      // Anonymous id only; no device identifiers for attribution networks.
      Purchases.configure({ apiKey: key, automaticDeviceIdentifierCollectionEnabled: false });
      configured.current = true;
    } catch {
      return;
    }
    const listener = (next: CustomerInfo) => setInfo(next);
    Purchases.addCustomerInfoUpdateListener(listener);
    void Purchases.getCustomerInfo().then(setInfo).catch(() => {});
    void refreshPlans();
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [key, refreshPlans]);

  const subscribed = hasPro(info);
  const founder = state.founder === true;
  const isPro = !available || subscribed || founder;
  const asksLeft = asksLeftOf(state, new Date());

  const allow = useCallback(
    (feature: ProFeature, existing = 0) => {
      if (isPro) return true;
      const ok = feature === 'ask' ? asksLeft > 0 : freeAllows(feature, existing);
      if (!ok) router.push({ pathname: '/pro', params: { feature } });
      return ok;
    },
    [isPro, asksLeft]
  );

  const noteAsk = useCallback(() => {
    if (isPro) return;
    persist(recordAsk(state, new Date()));
  }, [isPro, state, persist]);

  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<PurchaseOutcome> => {
    if (!configured.current) return 'error';
    const Purchases = loadPurchases();
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setInfo(customerInfo);
      return hasPro(customerInfo) ? 'done' : 'error';
    } catch (e) {
      const code = (e as { code?: string }).code;
      return code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ? 'cancelled' : 'error';
    }
  }, []);

  const restore = useCallback(async () => {
    if (!configured.current) return false;
    try {
      const restored = await loadPurchases().restorePurchases();
      setInfo(restored);
      return hasPro(restored);
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<ProContextValue>(
    () => ({
      available,
      isPro,
      founder,
      subscribed,
      asksLeft,
      monthly,
      annual,
      manageUrl: info?.managementURL ?? null,
      allow,
      noteAsk,
      purchase,
      restore,
      refreshPlans,
    }),
    [available, isPro, founder, subscribed, asksLeft, monthly, annual, info, allow, noteAsk, purchase, restore, refreshPlans]
  );

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function usePro(): ProContextValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used inside ProProvider');
  return ctx;
}
