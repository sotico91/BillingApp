import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type AmountPrivacyContextValue = {
  /** When false, monetary displays show a mask. Always starts hidden on cold launch. */
  amountsVisible: boolean;
  setAmountsVisible: (visible: boolean) => void;
  toggleAmountsVisible: () => void;
};

const AmountPrivacyContext = createContext<AmountPrivacyContextValue | null>(null);

export function AmountPrivacyProvider({ children }: { children: ReactNode }) {
  // In-memory only: survives background while the process lives; resets on kill.
  const [amountsVisible, setAmountsVisible] = useState(false);

  const toggleAmountsVisible = useCallback(() => {
    setAmountsVisible((v) => !v);
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
