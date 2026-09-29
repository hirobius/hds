/**
 * Mirrors the Storybook toolbar globals (theme/density/brand) onto <html>.
 *
 * Portalled overlays (Dialog, Menu) render outside the decorator wrapper, so
 * they only see the toolbar if <html> carries the attributes. ThemeProvider
 * pins <html data-theme> on mount; render this AFTER ThemeProvider (as a
 * sibling) so its effect runs last and the toolbar wins.
 *
 * Also paints <html>/<body> with the page surface: the decorator wrapper only
 * covers its own box, so centered/padded layouts would otherwise show the
 * browser's white canvas around it.
 *
 * Known limits: on autodocs pages, unmounting one story clears data-brand for
 * the rest; ThemeProvider in 'system' mode can overwrite data-theme on an OS
 * theme change until the globals change again.
 */
import { useEffect } from 'react';

const CANVAS_STYLE_ID = 'hds-sb-canvas';
const CANVAS_CSS =
  'html,body{background:var(--semantic-color-surface-page);color:var(--semantic-color-content-primary);}';

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

  useEffect(() => {
    const style = document.createElement('style');
    style.id = CANVAS_STYLE_ID;
    style.textContent = CANVAS_CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Brand is Storybook-only on <html>; ThemeProvider owns theme/density
  // outside Storybook, so only brand needs removal on unmount.
  useEffect(() => () => document.documentElement.removeAttribute('data-brand'), []);

  return null;
}
