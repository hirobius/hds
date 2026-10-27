import type { Page } from '@playwright/test';

/**
 * Open a docs route in one theme with motion reduced and fonts loaded: the
 * stored preference, the media query and the root attributes all agree, so a
 * snapshot never catches the page mid-switch.
 */
export async function openThemed(page: Page, route: string, theme: 'light' | 'dark') {
  await page.addInitScript((t: string) => {
    try {
      localStorage.setItem('theme', t);
    } catch {
      /* storage blocked: the attributes set below still apply */
    }
  }, theme);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
  await page.goto(route);
  await page.evaluate((t: string) => {
    const el = document.documentElement;
    el.setAttribute('data-theme', t);
    el.classList.toggle('dark', t === 'dark');
    el.classList.toggle('light', t === 'light');
  }, theme);
  await page.evaluate(() => document.fonts?.ready);
}
