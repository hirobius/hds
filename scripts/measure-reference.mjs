/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * measure-reference — print the computed geometry of any page's controls.
 *
 * Renders a URL and reports, per control archetype, the numbers a visual audit
 * actually turns on: box height, border-radius, padding, border weight/colour,
 * font size/weight, and the WCAG contrast of the border against its backdrop.
 *
 * Point it at a reference system to compare against HDS, or at a local
 * Storybook story to measure our own:
 *
 *   node scripts/measure-reference.mjs https://linear.app
 *   node scripts/measure-reference.mjs http://localhost:6006/iframe.html?id=primitives-button--primary
 *
 * Chromium resolution order: PLAYWRIGHT_CHROMIUM_PATH, then Playwright's own
 * download, then the image-provided build under /opt/pw-browsers. Set
 * PLAYWRIGHT_CHROMIUM_PATH when the pinned Playwright build and the installed
 * browser disagree.
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const ARCHETYPES = [
  ['button', 'button, a[class*="button" i], [class*="Button" i]'],
  ['input', 'input:not([type=checkbox]):not([type=radio]):not([type=hidden])'],
  ['select', 'select, [role=combobox]'],
  ['card', '[class*="card" i], article'],
  ['badge', '[class*="badge" i], [class*="chip" i], [class*="tag" i]'],
];

function resolveChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  for (const p of [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
  ])
    if (existsSync(p)) return p;
  return undefined;
}

const srgb = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) =>
  0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);

function parseRgb(value) {
  const m = String(value).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1]
    .split(/[,/\s]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
  const alpha = parts.length > 3 ? parts[3] : 1;
  return { rgb: parts.slice(0, 3), alpha };
}

/** Contrast of `fg` over `bg`, compositing fg's alpha onto bg first. */
function contrast(fg, bg) {
  const f = parseRgb(fg),
    b = parseRgb(bg);
  if (!f || !b || f.alpha === 0) return null;
  const composited = f.rgb.map((c, i) => c * f.alpha + b.rgb[i] * (1 - f.alpha));
  const [hi, lo] = [luminance(composited), luminance(b.rgb)].sort((x, y) => y - x);
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('usage: node scripts/measure-reference.mjs <url>');
    process.exit(2);
  }

  const browser = await chromium.launch({ executablePath: resolveChromium() });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.waitForTimeout(1500);

    const rows = await page.evaluate((archetypes) => {
      const opaque = (bg) => {
        if (!bg || bg === 'transparent') return false;
        const m = bg.match(/rgba?\(([^)]+)\)/);
        if (!m) return false;
        const parts = m[1]
          .split(/[,/\s]+/)
          .filter(Boolean)
          .map(Number);
        return parts.length < 4 || parts[3] > 0;
      };
      // Walks to the first ancestor that actually paints. A fully transparent
      // chain means nothing painted behind the element, so the real backdrop is
      // the canvas — white, not the rgba(0,0,0,0) the chain reports.
      const backdrop = (el) => {
        for (let n = el; n; n = n.parentElement) {
          const bg = getComputedStyle(n).backgroundColor;
          if (opaque(bg)) return bg;
        }
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
        if (opaque(bodyBg)) return bodyBg;
        if (opaque(htmlBg)) return htmlBg;
        return 'rgb(255, 255, 255)';
      };
      return archetypes.map(([name, selector]) => {
        const el = [...document.querySelectorAll(selector)].find((candidate) => {
          const r = candidate.getBoundingClientRect();
          return r.width > 40 && r.height > 16 && r.height < 400;
        });
        if (!el) return { name, found: false };
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          name,
          found: true,
          height: Math.round(r.height * 10) / 10,
          radius: cs.borderRadius,
          padX: cs.paddingLeft,
          borderWidth: cs.borderTopWidth,
          borderColor: cs.borderTopColor,
          background: cs.backgroundColor,
          backdrop: backdrop(el.parentElement || el),
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          fontFamily: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
        };
      });
    }, ARCHETYPES);

    const body = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      return {
        family: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
        size: cs.fontSize,
        weight: cs.fontWeight,
        color: cs.color,
        background: cs.backgroundColor,
      };
    });

    console.log(`\n${url}`);
    console.log(
      `body  ${body.family}  ${body.size} / ${body.weight}  fg ${body.color}  bg ${body.background}\n`,
    );
    console.log(
      ['archetype', 'height', 'radius', 'padX', 'border', 'font', 'border-contrast']
        .map((h, i) => h.padEnd([12, 8, 12, 8, 24, 14, 0][i]))
        .join(''),
    );
    console.log('-'.repeat(96));
    for (const row of rows) {
      if (!row.found) {
        console.log(`${row.name.padEnd(12)}(not found)`);
        continue;
      }
      const ratio = contrast(row.borderColor, row.backdrop);
      const flag =
        ratio !== null && Number(row.borderWidth.replace('px', '')) > 0 && ratio < 3
          ? `  ${ratio}:1  below the 3:1 floor`
          : ratio !== null
            ? `  ${ratio}:1`
            : '';
      console.log(
        row.name.padEnd(12) +
          `${row.height}px`.padEnd(8) +
          row.radius.padEnd(12) +
          row.padX.padEnd(8) +
          `${row.borderWidth} ${row.borderColor}`.slice(0, 23).padEnd(24) +
          `${row.fontSize}/${row.fontWeight}`.padEnd(14) +
          flag,
      );
    }
    console.log();
  } finally {
    await browser.close();
  }
}

await main();
