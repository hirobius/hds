/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The focus ring, measured in Chromium (semantic.focus.*). For a representative set of
 * elements (Button, Input, interactive Card, the Checkbox glyph, a Tag pill and an inset
 * Tabs trigger) keyboard focus paints a semantic.focus.ring.width outline,
 * semantic.focus.gap.width off the edge, whose corners follow the element radius:
 * gap radius = radius + gap, ring radius = radius + gap + ring width, the values the
 * component.*.focus.* tokens give Figma. The corner is checked on pixels, not only on
 * computed style. Forced-colors mode keeps the ring (outline, not box-shadow) in Highlight.
 * Uses the shipped theme.css and tokens, not compiled Tailwind. Skips without Chromium
 * (fails under HDS_REQUIRE_BROWSER=1).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { chromiumForTests } from '../lib/browser-host.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// The shipped token sheet plus theme.css with its build-time imports dropped.
const CSS = ['tokens.generated.css', 'theme.css']
  .map((f) => readFileSync(join(ROOT, 'src/styles', f), 'utf8'))
  .join('\n')
  .replace(/^@(import|config)[^;]*;/gm, '');
const CHROMIUM = chromiumForTests();

// id, focus class, element radius var, focus radius token prefix (gapRadius / ringRadius)
const CASES = [
  ['button', 'hds-focus', '--component-button-radius', '--component-button-focus'],
  ['input', 'hds-focus', '--component-input-radius', '--component-input-focus'],
  ['card', 'hds-focus', '--component-card-radius', '--component-card-focus'],
  ['checkbox', 'hds-focus', '--semantic-radius-control', '--semantic-focus-radius-control'],
];
const BOX = 'width:120px;height:48px;border:0;padding:0;background:#fff;display:block;';
const html = CASES.map(
  ([id, cls, radius], i) =>
    `<button id="${id}" class="${cls}" style="${BOX}position:absolute;left:40px;top:${40 + i * 100}px;border-radius:var(${radius})"></button>`,
).join('');

describe.skipIf(!CHROMIUM)('focus ring in Chromium', () => {
  let browser;
  let page;
  beforeAll(async () => {
    browser = await chromium.launch({ executablePath: CHROMIUM });
    page = await browser.newPage({ viewport: { width: 400, height: 600 }, deviceScaleFactor: 1 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setContent(
      `<html><head><style>${CSS}</style><style>body{margin:0;background:#fff}</style></head><body>` +
        html +
        `<button id="tag" class="hds-focus" style="${BOX}position:absolute;left:220px;top:40px;width:80px;height:32px;border-radius:var(--component-tag-radius)"></button>` +
        `<button id="tab" class="hds-focus-inset" style="${BOX}position:absolute;left:220px;top:140px"></button>` +
        `</body></html>`,
    );
  }, 30_000);
  afterAll(() => browser?.close());

  /** Keyboard-focuses `#id` (Tab from the body), so :focus-visible matches. */
  async function keyboardFocus(id) {
    await page.evaluate(() => document.activeElement?.blur());
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate((x) => document.activeElement?.id === x, id)) return;
    }
    throw new Error(`could not tab to #${id}`);
  }

  const px = (v) => Number.parseFloat(v);
  const tokenPx = (name) =>
    page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), name);
  const ring = (id) =>
    page.$eval(`#${id}`, (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        width: cs.outlineWidth,
        offset: cs.outlineOffset,
        style: cs.outlineStyle,
        color: cs.outlineColor,
        radius: cs.borderTopLeftRadius,
        box: { x: r.x, y: r.y },
      };
    });

  it('the focus tokens are 2px wide with a 2px gap', async () => {
    expect(px(await tokenPx('--semantic-focus-ring-width'))).toBe(2);
    expect(px(await tokenPx('--semantic-focus-gap-width'))).toBe(2);
  });

  it.each(CASES)(
    '%s: ring width, gap and radius tokens follow the offset rule',
    async (id, _c, _r, focus) => {
      await keyboardFocus(id);
      const m = await ring(id);
      expect(m.style).toBe('solid');
      expect(m.width).toBe('2px');
      expect(m.offset).toBe('2px');
      const gapRadius = px(await tokenPx(`${focus}-gapRadius`));
      const ringRadius = px(await tokenPx(`${focus}-ringRadius`));
      expect(gapRadius).toBe(px(m.radius) + px(m.offset));
      expect(ringRadius).toBe(gapRadius + px(m.width));
    },
  );

  it.each(CASES)(
    '%s: the painted corner has the ring radius token, not a square or the element radius',
    async (id, _c, _r, focus) => {
      await keyboardFocus(id);
      const m = await ring(id);
      const R = px(await tokenPx(`${focus}-ringRadius`));
      const out = px(m.offset) + px(m.width); // ring's outer edge sits this far out
      const shot = PNG.sync.read(await page.screenshot());
      const at = (x, y) => {
        const i = (Math.round(y) * shot.width + Math.round(x)) * 4;
        return shot.data[i] + shot.data[i + 1] + shot.data[i + 2] < 600; // painted (not white)
      };
      const ox = m.box.x - out; // outer box corner
      const oy = m.box.y - out;
      // Arc centre; the ring band runs R-2 .. R from it. Its middle on the 45° diagonal is painted.
      const mid = (R - px(m.width) / 2) / Math.SQRT2;
      expect(at(ox + R - mid, oy + R - mid)).toBe(true);
      // Just outside the arc on the diagonal stays blank: a square or smaller-radius ring paints it.
      const beyond = (R + 1.5) / Math.SQRT2;
      if (R - beyond > 0.5) expect(at(ox + R - beyond, oy + R - beyond)).toBe(false);
      // And the ring is drawn at all along the top edge.
      expect(at(ox + R + 10, oy + 1)).toBe(true);
    },
  );

  it('a pill keeps fully round ring corners (component.tag.focus.* = radius.full)', async () => {
    await keyboardFocus('tag');
    const m = await ring('tag');
    expect([m.width, m.offset]).toEqual(['2px', '2px']);
    expect(px(await tokenPx('--component-tag-focus-ringRadius'))).toBe(9999);
  });

  it('the inset ring uses the same width, drawn inside the edge', async () => {
    await keyboardFocus('tab');
    const m = await ring('tab');
    expect(m.width).toBe('2px');
    expect(m.offset).toBe('-2px');
  });

  it('forced-colors mode keeps the ring and paints it in Highlight', async () => {
    await page.emulateMedia({ forcedColors: 'active' });
    try {
      await keyboardFocus('button');
      const m = await ring('button');
      expect(m.style).toBe('solid');
      expect(m.width).toBe('2px');
      const highlight = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.color = 'Highlight';
        document.body.append(probe);
        const c = getComputedStyle(probe).color;
        probe.remove();
        return c;
      });
      expect(m.color).toBe(highlight);
    } finally {
      await page.emulateMedia({ forcedColors: 'none' });
    }
  });
});
