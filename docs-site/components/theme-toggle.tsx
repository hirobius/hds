'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'fumadocs-ui/provider/base';
import { ThemeSegments } from './theme-segments';

const noop = () => () => {};

/**
 * The docs theme switch, in place of Fumadocs' ThemeSwitch (a pill that ignored the HDS radius
 * token). next-themes, through Fumadocs' RootProvider, still owns the state. The selection
 * waits for mount: the stored theme is unknown on the server.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  return <ThemeSegments theme={mounted ? (theme ?? 'system') : ''} onChange={setTheme} />;
}
