import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

/**
 * Screenshot options shared by the demo baseline specs. The small tolerance absorbs
 * edge antialiasing between Chromium revisions; a changed colour, size or layout still fails.
 */
export const DEMO_SHOT = {
  animations: 'disabled',
  caret: 'hide',
  maxDiffPixelRatio: 0.002,
  // Keeps the sticky docs top bar off a demo taller than the viewport (hds#1277).
  stylePath: fileURLToPath(new URL('./screenshot.css', import.meta.url)),
} as const;

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
  // `fonts.ready` alone can resolve before a face is ever requested, so a shot
  // could catch the fallback-to-Sora swap (radio labels flipped by 469 px).
  // Load every declared face, wait for ready, then two frames for layout.
  await page.evaluate(async () => {
    const fonts = document.fonts;
    if (!fonts) return;
    await Promise.all([...fonts].map((face) => face.load().catch(() => undefined)));
    await fonts.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });
}
