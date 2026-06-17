import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

type Density = 'comfortable' | 'compact';

/** Three-way mode: follow OS, force light, or force dark. */
export type ThemeMode = 'system' | 'light' | 'dark';

const VALID_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];
const MODE_STORAGE_KEY = 'hds-theme-mode'; // Written by ThemeToggle; read here for init sync
const THEME_STORAGE_KEY = 'hds-theme'; // Legacy binary key; kept for backward compat

interface ThemeCtx {
  isDark: boolean;
  toggleDark: () => void;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  density: Density;
  toggleDensity: () => void;
  setDensity: (d: Density) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  isDark: true,
  toggleDark: () => {},
  mode: 'system',
  setMode: () => {},
  density: 'comfortable',
  toggleDensity: () => {},
  setDensity: () => {},
});

/** Read the three-way mode written by ThemeToggle, or fall back to 'system'. */
function getInitialMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(MODE_STORAGE_KEY);
    if (raw && (VALID_MODES as readonly string[]).includes(raw)) return raw as ThemeMode;
  } catch {}
  return 'system';
}

/** Resolve whether the OS currently prefers dark. */
function osPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
}

/** Derive isDark from a ThemeMode. For 'system', reads the OS preference at call-time. */
function resolveIsDark(m: ThemeMode): boolean {
  if (m === 'dark') return true;
  if (m === 'light') return false;
  return osPrefersDark();
}

function getInitialDensity(): Density {
  try {
    const stored = localStorage.getItem('hds-density');
    if (stored === 'compact' || stored === 'comfortable') return stored;
  } catch {}
  return 'comfortable';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [isDark, setIsDark] = useState(() => resolveIsDark(getInitialMode()));
  const [density, setDensityState] = useState<Density>(getInitialDensity);

  const syncTheme = useCallback((nextIsDark: boolean) => {
    const nextTheme = nextIsDark ? 'dark' : 'light';

    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {}

    document.documentElement.setAttribute('data-theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextIsDark);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('hds-density', density);
    } catch {}
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  /** Apply theme to DOM whenever isDark changes. */
  useEffect(() => {
    syncTheme(isDark);
  }, [isDark, syncTheme]);

  /**
   * Subscribe to OS-level prefers-color-scheme changes when mode === 'system'.
   * Only active while mode is 'system'; cleans up on mode change or unmount.
   *
   * Effect deps: [mode] — re-runs only when the user switches mode.
   * Stale-closure note: resolveIsDark('system') always reads the OS at call-time,
   * so the handler never captures a stale isDark value.
   */
  // src/app/context/ThemeContext.tsx — system mode OS listener
  useEffect(() => {
    if (mode !== 'system') return;
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const onChange = () => {
      setIsDark(mq.matches);
    };

    mq.addEventListener('change', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
    };
  }, [mode]);

  const toggleDark = useCallback(() => {
    const next = !isDark;
    const nextMode: ThemeMode = next ? 'dark' : 'light';
    setModeState(nextMode);
    setIsDark(next);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, nextMode);
    } catch {}
  }, [isDark]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    setIsDark(resolveIsDark(m));
    try {
      localStorage.setItem(MODE_STORAGE_KEY, m);
    } catch {}
  }, []);

  const toggleDensity = useCallback(
    () => setDensityState((d) => (d === 'comfortable' ? 'compact' : 'comfortable')),
    [],
  );
  const setDensity = useCallback((d: Density) => setDensityState(d), []);

  return (
    <ThemeContext.Provider
      value={{ isDark, toggleDark, mode, setMode, density, toggleDensity, setDensity }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
