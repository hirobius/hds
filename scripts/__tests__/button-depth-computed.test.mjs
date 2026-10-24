/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * C2 fixed base, measured in Chromium: across rest, hover and press the bottom of a
 * Button's hard edge (the face's bottom after translate, plus the edge offset) stays on the
 * same pixel, and the face moves 0 / -1 / +2px. Uses the shipped theme.css and tokens;
 * Tailwind is not compiled, so the box-shadow composition vars get Tailwind's initial
 * values here. Skips where Playwright has no Chromium.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { chromiumPath } from '../lib/browser-host.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const CSS = [
  read('src/styles/tokens.generated.css'),
  read('src/styles/theme.css').replace(/^@(import|config)[^;]*;/gm, ''),
].join('\n');
const TW = `*{--tw-inset-shadow:0 0 #0000;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;}`;
const CHROMIUM = chromiumPath() ?? chromium.executablePath();
const hasBrowser = existsSync(CHROMIUM);

describe.skipIf(!hasBrowser)('Button hard edge in Chromium', () => {
  let browser;
  let page;
  beforeAll(async () => {
    browser = await chromium.launch({ executablePath: CHROMIUM });
    page = await browser.newPage({ hasTouch: false });
    await page.emulateMedia({ reducedMotion: 'reduce' }); // durations zero: no waiting
    await page.setContent(
      `<html><head><style>${CSS}</style><style>${TW} body{margin:40px}</style></head><body>` +
        `<button class="hds-btn-hard" style="height:40px;width:120px;border:0">Go</button>` +
        `</body></html>`,
    );
  });
  afterAll(() => browser?.close());

  const measure = () =>
    page.$eval('button', (b) => {
      const cs = getComputedStyle(b);
      const y = cs.boxShadow.match(/(-?[\d.]+)px (-?[\d.]+)px 0px 0px$/)?.[2];
      return { bottom: b.getBoundingClientRect().bottom, ty: cs.translate, edge: Number(y) };
    });

  it('rest, hover and press keep the bottom of the edge on one pixel', async () => {
    await page.mouse.move(0, 0);
    const rest = await measure();
    await page.hover('button');
    const hover = await measure();
    await page.mouse.down();
    const active = await measure();
    await page.mouse.up();

    expect([rest.edge, hover.edge, active.edge]).toEqual([3, 4, 1]);
    expect(hover.bottom - rest.bottom).toBe(-1);
    expect(active.bottom - rest.bottom).toBe(2);
    const base = (m) => m.bottom + m.edge;
    expect(base(hover)).toBe(base(rest));
    expect(base(active)).toBe(base(rest));
  });

  it('a pointer on the bottom row stays on the button when it lifts (no hover flicker)', async () => {
    await page.mouse.move(0, 0);
    const box = await page.$eval('button', (b) => b.getBoundingClientRect().toJSON());
    const x = box.x + box.width / 2;
    // :hover is read off the lift itself (getComputedStyle), re-hit-tested by a second move
    // after the face has already risen off that row.
    await page.mouse.move(x, box.bottom - 0.5);
    await page.mouse.move(x + 1, box.bottom - 0.5);
    expect((await measure()).ty).toBe('0px -1px');
    await page.mouse.move(x, box.y + 0.5); // the top row, then press: the face sinks 2px
    await page.mouse.down();
    await page.mouse.move(x + 1, box.y + 0.5);
    expect((await measure()).ty).toBe('0px 2px');
    await page.mouse.up();
  });
});
