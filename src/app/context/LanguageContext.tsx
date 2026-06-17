import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type AppLanguage = 'en';
type AppDirection = 'ltr' | 'rtl';

interface LanguageOption {
  language: AppLanguage;
  dir: AppDirection;
  label: string;
  nativeLabel: string;
}

interface LanguageContextValue {
  language: AppLanguage;
  direction: AppDirection;
  isRtl: boolean;
  setLanguage: (language: AppLanguage) => void;
  setDirection: (direction: AppDirection) => void;
  toggleDirection: () => void;
  options: Record<AppLanguage, LanguageOption>;
}

const LANGUAGE_OPTIONS: Record<AppLanguage, LanguageOption> = {
  en: {
    language: 'en',
    dir: 'ltr',
    label: 'English',
    nativeLabel: 'English',
  },
};

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  direction: 'ltr',
  isRtl: false,
  setLanguage: () => {},
  setDirection: () => {},
  toggleDirection: () => {},
  options: LANGUAGE_OPTIONS,
});

function getInitialDirection(): AppDirection {
  try {
    const stored = localStorage.getItem('hds-direction');
    if (stored === 'ltr' || stored === 'rtl') return stored;
  } catch {}
  return 'ltr';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [direction, setDirectionState] = useState<AppDirection>(getInitialDirection);
  const language: AppLanguage = 'en';
  const isRtl = direction === 'rtl';

  useEffect(() => {
    try { localStorage.setItem('hds-direction', direction); } catch {}
    document.documentElement.setAttribute('lang', 'en');
    document.documentElement.setAttribute('data-language', 'en');
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('data-reading-direction', direction);
  }, [direction]);

  const setLanguage = useCallback((_nextLanguage: AppLanguage) => {
    // Language is fixed to English for now; RTL remains a separate layout mode.
  }, []);

  const setDirection = useCallback((nextDirection: AppDirection) => {
    setDirectionState(nextDirection);
  }, []);

  const toggleDirection = useCallback(() => {
    setDirectionState(prev => (prev === 'ltr' ? 'rtl' : 'ltr'));
  }, []);

  return (
    <LanguageContext.Provider value={{ language, direction, isRtl, setLanguage, setDirection, toggleDirection, options: LANGUAGE_OPTIONS }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
