import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

type AmountPrivacyContextValue = {
  /** When false, monetary displays show a mask. Always starts hidden on launch. */
  amountsVisible: boolean;
  setAmountsVisible: (visible: boolean) => void;
  toggleAmountsVisible: () => void;
};

const AmountPrivacyContext = createContext<AmountPrivacyContextValue | null>(null);

export function AmountPrivacyProvider({ children }: { children: ReactNode }) {
  const [amountsVisible, setAmountsVisible] = useState(false);

  const toggleAmountsVisible = useCallback(() => {
    setAmountsVisible((v) => !v);
  }, []);

  useEffect(() => {
    function onChange(next: AppStateStatus) {
      // Re-mask when leaving the app so amounts stay private on return.
      if (next === 'background') {
        setAmountsVisible(false);
      }
    }
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const value = useMemo(
    () => ({
      amountsVisible,
      setAmountsVisible,
      toggleAmountsVisible,
    }),
    [amountsVisible, toggleAmountsVisible]
  );

  return (
    <AmountPrivacyContext.Provider value={value}>
      {children}
    </AmountPrivacyContext.Provider>
  );
}

export function useAmountPrivacy(): AmountPrivacyContextValue {
  const ctx = useContext(AmountPrivacyContext);
  if (!ctx) {
    throw new Error('useAmountPrivacy must be used within AmountPrivacyProvider');
  }
  return ctx;
}
