import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { HowToGuideSheet } from '@/src/components/HowToGuideSheet';

type HowToGuideContextValue = {
  openGuide: () => void;
};

const HowToGuideContext = createContext<HowToGuideContextValue | null>(null);

export function HowToGuideProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openGuide = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openGuide }), [openGuide]);

  return (
    <HowToGuideContext.Provider value={value}>
      {children}
      <HowToGuideSheet visible={open} onClose={() => setOpen(false)} />
    </HowToGuideContext.Provider>
  );
}

export function useHowToGuide(): HowToGuideContextValue {
  const ctx = useContext(HowToGuideContext);
  if (!ctx) {
    throw new Error('useHowToGuide must be used within HowToGuideProvider');
  }
  return ctx;
}
