import { createContext, useContext, useState, ReactNode } from 'react';

interface TokenDisplayContextType {
  showCss: boolean;
  setShowCss: (val: boolean) => void;
  toggleCss: () => void;
}

const TokenDisplayContext = createContext<TokenDisplayContextType | undefined>(undefined);

export function TokenDisplayProvider({ children }: { children: ReactNode }) {
  const [showCss, setShowCss] = useState(false);
  return (
    <TokenDisplayContext.Provider value={{ showCss, setShowCss, toggleCss: () => setShowCss(s => !s) }}>
      {children}
    </TokenDisplayContext.Provider>
  );
}

export function useTokenDisplay() {
  const ctx = useContext(TokenDisplayContext);
  if (!ctx) return { showCss: false, setShowCss: () => {}, toggleCss: () => {} };
  return ctx;
}

