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
  await waitForSettled(page);
}

/**
 * Wait until the page is hydrated and motion is idle. Fonts were never the whole
 * story of the radio flake (hds#1506): the demo's SSR HTML holds the checked dot at
 * scale(0.4) / opacity 0, and a screenshot that lands before hydration plus motion's
 * entrance animation catches that transient (or layers still promoted for it, which
 * flips label text between LCD and greyscale antialiasing). Settled means: a React
 * fiber on a node of the demo (or body), no running animation, and the markup of
 * that subtree unchanged for 6 consecutive frames. A page that never settles fails
 * here with that name, not later as a pixel diff.
 */
async function waitForSettled(page: Page) {
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const root = document.querySelector('.hds-demo-frame') ?? document.body;
        // A React fiber appears while hydration renders, before its commit runs any
        // effect, so a slow CPU can sit fiber-bearing but un-animated for many frames
        // (CI on #1503: one animation started after the quiet window). A demo frame
        // flags its own commit (DemoFrame, data-demo-committed); other pages keep the
        // fiber check.
        const demo = root.matches('.hds-demo-frame');
        const hydrated = () =>
          demo
            ? root.hasAttribute('data-demo-committed')
            : [...root.querySelectorAll('*')].some((e) =>
                Object.keys(e).some((k) => k.startsWith('__reactFiber$')),
              );
        let last = '';
        let still = 0;
        const tick = () => {
          const html = root.outerHTML;
          const quiet = hydrated() && document.getAnimations().length === 0 && html === last;
          still = quiet ? still + 1 : 0;
          last = html;
          if (still >= 6) resolve(true);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    undefined,
    { timeout: 15_000 },
  );
}
