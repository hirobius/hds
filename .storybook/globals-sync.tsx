/**
 * Mirrors the Storybook toolbar globals (theme/density/brand) onto <html>.
 *
 * Portalled overlays (Dialog, Menu) render outside the decorator wrapper, so
 * they only see the toolbar if <html> carries the attributes. ThemeProvider
 * pins <html data-theme> on mount; render this AFTER ThemeProvider (as a
 * sibling) so its effect runs last and the toolbar wins.
 */
import { useEffect } from 'react';

interface GlobalsSyncProps {
  theme?: string;
  density?: string;
  brand?: string;
}

export function GlobalsSync({ theme, density, brand }: GlobalsSyncProps) {
  useEffect(() => {
    const el = document.documentElement;
    const set = (name: string, value?: string) =>
      value ? el.setAttribute(name, value) : el.removeAttribute(name);
    set('data-theme', theme);
    el.classList.toggle('dark', theme === 'dark');
    set('data-density', density);
    set('data-brand', brand);
  }, [theme, density, brand]);

  // Brand is Storybook-only on <html>; ThemeProvider owns theme/density
  // outside Storybook, so only brand needs removal on unmount.
  useEffect(() => () => document.documentElement.removeAttribute('data-brand'), []);

  return null;
}
