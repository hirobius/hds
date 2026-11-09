/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * C2 fixed base, measured in Chromium: across rest, hover and press the bottom of a
 * Button's hard edge (the face's bottom after translate, plus the edge offset) stays on the
 * same pixel, and the face moves 0 / +1 / +3px onto a 3 / 2 / 0px edge: hover and press
 * compress the button, they never grow it downward (hds#1196). Uses the shipped theme.css and tokens;
 * Tailwind is not compiled, so the box-shadow composition vars get Tailwind's initial
 * values here. Skips without Chromium (fails under HDS_REQUIRE_BROWSER=1).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { chromiumForTests } from '../lib/browser-host.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const CSS = [
  read('src/styles/tokens.generated.css'),
  read('src/styles/theme.css').replace(/^@(import|config)[^;]*;/gm, ''),
].join('\n');
const TW = `*{--tw-inset-shadow:0 0 #0000;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;}`;
const CHROMIUM = chromiumForTests();
const hasBrowser = Boolean(CHROMIUM);

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
        `<p id="after" style="margin:0">Below</p></body></html>`,
    );
  });
  afterAll(() => browser?.close());

  const measure = () =>
    page.$eval('button', (b) => {
      const cs = getComputedStyle(b);
      const y = cs.boxShadow.match(/(-?[\d.]+)px (-?[\d.]+)px 0px 0px$/)?.[2];
      return {
        bottom: b.getBoundingClientRect().bottom,
        ty: cs.translate,
        edge: Number(y),
        after: document.getElementById('after').getBoundingClientRect().top,
      };
    });

  it('rest, hover and press keep the bottom of the edge on one pixel', async () => {
    await page.mouse.move(0, 0);
    const rest = await measure();
    await page.hover('button');
    const hover = await measure();
    await page.mouse.down();
    const active = await measure();
    await page.mouse.up();

    expect([rest.edge, hover.edge, active.edge]).toEqual([3, 2, 0]);
    expect(hover.bottom - rest.bottom).toBe(1);
    expect(active.bottom - rest.bottom).toBe(3);
    // Total height (face + edge) is constant, and the layout under it never shifts.
    expect(new Set([rest.after, hover.after, active.after]).size).toBe(1);
    const base = (m) => m.bottom + m.edge;
    expect(base(hover)).toBe(base(rest));
    expect(base(active)).toBe(base(rest));
  });

  it('a pointer on the top row stays on the button when it sinks (no hover flicker)', async () => {
    await page.mouse.move(0, 0);
    const box = await page.$eval('button', (b) => b.getBoundingClientRect().toJSON());
    const x = box.x + box.width / 2;
    // :hover is read off the sink itself (getComputedStyle), re-hit-tested by a second move
    // after the face has already dropped off that row.
    await page.mouse.move(x, box.y + 0.5);
    await page.mouse.move(x + 1, box.y + 0.5);
    expect((await measure()).ty).toBe('0px 1px');
    await page.mouse.down(); // press on the same top row: the face sinks the full 3px
    await page.mouse.move(x, box.y + 0.5);
    expect((await measure()).ty).toBe('0px 3px');
    await page.mouse.up();
  });
});

describe.skipIf(!hasBrowser)('standalone link hit area in Chromium', () => {
  let browser;
  afterAll(() => browser?.close());

  const boxes = async (hasTouch) => {
    browser ??= await chromium.launch({ executablePath: CHROMIUM });
    const page = await browser.newPage({ hasTouch, isMobile: hasTouch });
    await page.setContent(
      `<html><head><style>${CSS}</style></head><body style="margin:40px;font:16px/24px sans-serif">` +
        `<p id="before">Above</p><a class="hds-link hds-link-standalone" href="#">Go</a>` +
        `<p id="after">Below</p></body></html>`,
    );
    const out = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const a = r('a');
      const cs = getComputedStyle(document.querySelector('a'));
      return {
        width: a.width,
        height: a.height,
        gap: r('#after').top - r('#before').bottom,
        decoration: cs.textDecorationLine,
      };
    });
    await page.close();
    return out;
  };

  it('is at least 24x24 with a pointer, and the layout does not move', async () => {
    const b = await boxes(false);
    expect(b.width).toBeGreaterThanOrEqual(24);
    expect(b.height).toBeGreaterThanOrEqual(24);
    expect(b.decoration).toBe('underline'); // a text underline: it sits under the text, not the padding
  });

  it('is 44px tall on touch, still without moving the layout', async () => {
    const mouse = await boxes(false);
    const touch = await boxes(true);
    expect(touch.height).toBeGreaterThanOrEqual(44);
    expect(touch.gap).toBe(mouse.gap);
  });
});

describe.skipIf(!hasBrowser)('the hit band on a real default Button (wipe + hard edge)', () => {
  it('elementFromPoint finds the button in the 3px under its face, and on the rest top row while it sinks', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const React = await import('react');
    const { Button } = await import('../../src/app/components/button.tsx');
    const markup = renderToStaticMarkup(React.createElement(Button, null, 'Go'));
    // The utilities the default markup uses that matter for hit-testing; overflow-hidden is
    // listed so the test would catch it coming back.
    const UTIL = `.relative{position:relative}.isolate{isolation:isolate}.overflow-hidden{overflow:hidden}.rounded-md{border-radius:6px}.h-10{height:40px}.px-4{padding-inline:16px}.inline-flex{display:inline-flex}button{border:0}`; // + Tailwind preflight's border reset
    const browser = await chromium.launch({ executablePath: CHROMIUM });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(
        `<html><head><style>${CSS}</style><style>${TW}${UTIL} body{margin:40px}</style></head><body>${markup}</body></html>`,
      );
      const hitsBelow = () =>
        page.$eval('button', (b) => {
          const r = b.getBoundingClientRect();
          const x = r.left + r.width / 2;
          return [1, 2, 3].map((d) => document.elementFromPoint(x, r.bottom + d - 0.5) === b);
        });
      expect(await hitsBelow()).toEqual([true, true, true]);
      const box = await page.$eval('button', (b) => b.getBoundingClientRect().toJSON());
      await page.mouse.move(box.x + box.width / 2, box.y + 0.5);
      expect(await page.$eval('button', (b) => getComputedStyle(b).translate)).toBe('0px 1px');
      const sunk = (top) =>
        page.$eval(
          'button',
          (b, t) => document.elementFromPoint(b.getBoundingClientRect().left + 5, t) === b,
          top,
        );
      expect(await sunk(box.y + 0.5)).toBe(true); // the row the face dropped off is still the button
      await page.mouse.down();
      expect(await page.$eval('button', (b) => getComputedStyle(b).translate)).toBe('0px 3px');
      expect(await sunk(box.y + 0.5)).toBe(true); // fully pressed: the rest top row still hits
      await page.mouse.up();
    } finally {
      await browser.close();
    }
  });
});

describe.skipIf(!hasBrowser)('Button focus ring wraps the hard edge in Chromium', () => {
  let browser;
  let page;
  beforeAll(async () => {
    browser = await chromium.launch({ executablePath: CHROMIUM });
    page = await browser.newPage({ hasTouch: false });
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });
  afterAll(() => browser?.close());

  // Focus wraps face AND edge (Adrian 11-04): the gap and the ring are each drawn twice,
  // once on the border box and once offset by the edge height, so they follow the
  // face-plus-edge shape. The edge itself stays first and visible.
  // The edge is two layers (hds#1399): the edge colour, then the page line under it (transparent
  // and 0px wide in light, where these run).
  const ringFor = (edge, hs) =>
    `0 ${hs} 0 ${edge}, 0 ${hs} 0 transparent, ` +
    `0 0 0 2px var(--role-background), 0 ${hs} 0 2px var(--role-background), ` +
    `0 0 0 4px var(--role-ring), 0 ${hs} 0 4px var(--role-ring)`;
  // Button's focus-visible:outline-none and ring-* utilities, in Tailwind's utilities layer
  // (which outranks components): the focus rule must beat them.
  const OUTLINE_NONE =
    `@layer utilities{button:focus-visible{outline-style:none;` +
    `box-shadow:0 0 0 2px var(--role-background),0 0 0 4px var(--role-ring)}}`;
  const focusShadow = async (style, expected) => {
    await page.setContent(
      `<html><head><style>@layer components, utilities;${OUTLINE_NONE}</style><style>${CSS}</style><style>${TW} body{margin:40px}</style></head><body>` +
        `<button class="hds-btn-hard" style="height:40px;width:120px;border:0;${style}">Go</button>` +
        `<i id="ref" style="box-shadow:${expected}"></i></body></html>`,
    );
    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab'); // keyboard focus: :focus-visible
    return page.evaluate(() => ({
      got: getComputedStyle(document.querySelector('button')).boxShadow,
      want: getComputedStyle(document.getElementById('ref')).boxShadow,
    }));
  };

  it('focus ring wraps a primary button and its edge', async () => {
    const { got, want } = await focusShadow(
      '--hds-edge:var(--hds-edge-primary)',
      ringFor('var(--hds-edge-primary)', '3px'),
    );
    expect(want).not.toBe('none');
    expect(got.endsWith(want)).toBe(true);
  });

  it('focus ring wraps a toned (danger) secondary button and its edge', async () => {
    const { got, want } = await focusShadow(
      '--hds-edge:var(--component-button-edge-danger)',
      ringFor('var(--component-button-edge-danger)', '3px'),
    );
    expect(want).not.toBe('none');
    expect(got.endsWith(want)).toBe(true);
  });

  it('forced colors keeps a visible focus outline', async () => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await focusShadow('', 'none');
    const o = await page.$eval('button', (b) => {
      const cs = getComputedStyle(b);
      return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) };
    });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
    expect(o.style).not.toBe('none');
    expect(o.width).toBeGreaterThan(0);
  });
});
