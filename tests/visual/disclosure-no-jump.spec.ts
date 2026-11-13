import { test, expect, type Page } from '@playwright/test';

/**
 * Disclosure row, open and close without a jump (hds#1508). Samples every animation frame
 * (rAF) after the tap and asserts, at phone and desktop width, in motion and reduced motion:
 *   - the summary row (the trigger) never moves: its top stays put;
 *   - the first element below the Disclosure travels one way, with no back-step or overshoot;
 *   - the panel never shrinks while opening nor grows while closing;
 *   - under reduced motion the change lands in one step.
 * Needs `pnpm docs:build` first (the visual lane serves docs-site/out).
 */
const EPS = 0.5;
type Frame = { ms: number; summaryTop: number; contentH: number; belowTop: number };

async function sample(page: Page, action: 'open' | 'close'): Promise<Frame[]> {
  const edit = page.getByRole('button', { name: /^Edit / }).first();
  const row = edit.locator('xpath=ancestor::div[contains(@class,"min-w-0")][1]');
  const trigger = row.locator('button[aria-expanded]');
  await row.scrollIntoViewIfNeeded();
  if (action === 'close') {
    await trigger.click();
    await page.waitForTimeout(800);
  }
  const handle = await trigger.elementHandle();
  await page.evaluate((el) => {
    const w = window as unknown as { __frames: number[][]; __t0: number | null };
    const below = el!.parentElement!.parentElement!.nextElementSibling!;
    w.__frames = [];
    w.__t0 = null;
    el!.addEventListener('click', () => (w.__t0 = performance.now()), {
      capture: true,
      once: true,
    });
    const start = performance.now();
    const tick = () => {
      const now = performance.now();
      const panel = document.getElementById(el!.getAttribute('aria-controls')!);
      w.__frames.push([
        now,
        el!.getBoundingClientRect().top,
        panel ? panel.getBoundingClientRect().height : 0,
        below.getBoundingClientRect().top,
      ]);
      if (now - start < 1500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, handle);
  await page.waitForTimeout(100);
  await trigger.click();
  await page.waitForTimeout(1300);
  const { frames, t0 } = await page.evaluate(() => {
    const w = window as unknown as { __frames: number[][]; __t0: number };
    return { frames: w.__frames, t0: w.__t0 };
  });
  return frames
    .filter((f) => f[0] >= t0 - 50)
    .map((f) => ({ ms: f[0] - t0, summaryTop: f[1], contentH: f[2], belowTop: f[3] }));
}

for (const [width, height] of [
  [390, 844],
  [1280, 900],
] as const) {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    for (const action of ['open', 'close'] as const) {
      test(`row ${action} at ${width}px (${reducedMotion}): no jump`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion });
        const page = await ctx.newPage();
        await page.goto('/docs/components/disclosure', { waitUntil: 'networkidle' });
        const frames = await sample(page, action);
        await ctx.close();

        const dir = action === 'open' ? 1 : -1;
        const first = frames[0];
        // The summary row never moves.
        for (const f of frames) expect(Math.abs(f.summaryTop - first.summaryTop)).toBeLessThan(EPS);
        // The row below only ever travels in one direction.
        for (let i = 1; i < frames.length; i++) {
          expect((frames[i].belowTop - frames[i - 1].belowTop) * dir).toBeGreaterThan(-EPS);
          expect((frames[i].contentH - frames[i - 1].contentH) * dir).toBeGreaterThan(-EPS);
        }
        const last = frames[frames.length - 1];
        expect((last.belowTop - first.belowTop) * dir).toBeGreaterThan(1);
        if (reducedMotion === 'reduce') {
          // One step: every frame is either the start or the end position.
          const moving = frames.filter(
            (f) =>
              Math.abs(f.belowTop - first.belowTop) > EPS &&
              Math.abs(f.belowTop - last.belowTop) > EPS,
          );
          expect(moving).toHaveLength(0);
        }
      });
    }
  }
}
