#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-docs-type-ramp.mjs (hds#1496)
 *
 * Loads built docs-site pages (the docs home /docs, the case study, one component page; `/` is only a meta-refresh stub) at 390 and 1440,
 * light and dark, reads the computed font-family, font-size, font-weight and line-height of
 * every visible text node's element, and fails when one matches none of the type-ramp roles
 * (display, title, titleSm, body, bodyStrong, ui, uiRegular, caption, mono), whose values are
 * read from hirobius.tokens.json. Fumadocs defaults count as gaps. No allowlist: a gap is fixed
 * with a ramp class or token, not waived. Live component demos (.hds-demo-frame) render the shipped
 * components with their own type (Button's 600 label, hds#760), so they are skipped; --include-demos
 * audits them too.
 * Run `pnpm docs:publish` first. Chromium comes from scripts/lib/browser-host.mjs.
 *
 * Usage: node scripts/check-docs-type-ramp.mjs [--dir <path>] [--routes /docs,/docs/case-study] [--include-demos] [--json]
 * Exit 0 pass, 1 gaps, 2 setup error. Fixtures: fixtures/check-docs-type-ramp/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeStyle, groupGaps, loadRamp, matchRole } from './lib/docs-type-ramp.mjs';
import { serveStatic } from './lib/docs-axe.mjs';
import { launchChromium } from './lib/browser-host.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_ROUTES = ['/docs', '/docs/case-study', '/docs/components/button'];
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
];
const THEMES = ['light', 'dark'];
const FREEZE_CSS =
  '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

/** Runs in the page: one record per visible text-bearing element. */
function collectText(includeDemos) {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE']);
  const seen = new Set();
  const out = [];
  const part = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id && !/\d{3,}|^[:«]|radix|react/i.test(el.id)) return `${s}#${el.id}`;
    const cls = [...el.classList].filter((c) => !/^[a-z]{1,2}-?\d|\d{4,}/.test(c)).slice(0, 2);
    if (cls.length) s += '.' + cls.join('.');
    return s;
  };
  const selectorOf = (el) => {
    const parts = [];
    for (
      let n = el;
      n && n.nodeType === 1 && n !== document.documentElement && parts.length < 4;
      n = n.parentElement
    ) {
      parts.unshift(part(n));
      if (n.id && parts[0].includes('#')) break;
    }
    return parts.join(' > ');
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || SKIP.has(el.tagName) || seen.has(el)) continue;
    if (!includeDemos && el.closest('.hds-demo-frame')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse')
      continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) continue;
    // Visually hidden text (sr-only: a 1px clipped box) is not seen, so it is not audited.
    if (rects.every((r) => r.width <= 1.5 && r.height <= 1.5)) continue;
    let clipped = false;
    for (let n = el; n && n !== document.body && !clipped; n = n.parentElement) {
      const b = n.getBoundingClientRect();
      clipped = b.width <= 1.5 && b.height <= 1.5 && getComputedStyle(n).overflow !== 'visible';
    }
    if (clipped) continue;
    if (cs.opacity === '0') continue;
    seen.add(el);
    out.push({
      selector: selectorOf(el),
      text: text.slice(0, 40),
      family: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
    });
  }
  return out;
}

async function scan(browser, base, route, viewport, theme, includeDemos) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  try {
    await page.addInitScript((t) => {
      try {
        localStorage.setItem('theme', t);
      } catch {
        /* storage blocked: the attribute set below still applies */
      }
    }, theme);
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
    await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 45000 });
    await page.addStyleTag({ content: FREEZE_CSS });
    await page.evaluate((t) => {
      const el = document.documentElement;
      el.setAttribute('data-theme', t);
      el.classList.toggle('dark', t === 'dark');
      el.classList.toggle('light', t === 'light');
      el.style.colorScheme = t;
    }, theme);
    await page.evaluate(async () => {
      await document.fonts?.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    await page.waitForTimeout(600);
    return await page.evaluate(collectText, includeDemos);
  } finally {
    await context.close().catch(() => {});
  }
}

async function main() {
  const dir = path.resolve(ROOT, arg('dir', 'docs-site/out'));
  const routes = (arg('routes') ?? DEFAULT_ROUTES.join(',')).split(',').filter(Boolean);
  if (!fs.existsSync(dir)) {
    console.error(`No site at ${path.relative(ROOT, dir)}. Run \`pnpm docs:publish\` first.`);
    process.exit(2);
  }
  const includeDemos = process.argv.includes('--include-demos');
  const ramp = loadRamp();
  const { server, port } = await serveStatic(dir);
  const browser = await launchChromium();
  const gaps = [];
  let checked = 0;
  try {
    for (const route of routes) {
      for (const viewport of VIEWPORTS) {
        for (const theme of THEMES) {
          const nodes = await scan(
            browser,
            `http://127.0.0.1:${port}`,
            route,
            viewport,
            theme,
            includeDemos,
          );
          if (!nodes.length) {
            gaps.push({
              where: `${route} @${viewport.name} ${theme}`,
              selector: '(page)',
              family: '',
              fontSize: '',
              fontWeight: '',
              lineHeight: '',
              text: 'no visible text found: the page did not render',
            });
          }
          for (const n of nodes) {
            checked += 1;
            if (!matchRole(n, ramp))
              gaps.push({ where: `${route} @${viewport.name} ${theme}`, ...n });
          }
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  // Collapse repeats across viewports and themes: same selector and values is one gap.
  const byWhere = new Map();
  for (const g of gaps) {
    const k = `${g.selector}|${g.family}|${g.fontSize}|${g.fontWeight}|${g.lineHeight}`;
    const w = byWhere.get(k) ?? { where: new Set(), g };
    w.where.add(g.where);
    byWhere.set(k, w);
  }
  const grouped = groupGaps(gaps).map((g) => ({
    ...g,
    where: [
      ...byWhere.get(`${g.selector}|${g.family}|${g.fontSize}|${g.fontWeight}|${g.lineHeight}`)
        .where,
    ],
  }));
  if (process.argv.includes('--json'))
    console.log(JSON.stringify({ checked, gaps: grouped }, null, 2));
  else
    for (const g of grouped) {
      console.log(`${g.selector}  [${describeStyle(g)}]  "${g.text}"  (${g.where.join('; ')})`);
    }
  (process.argv.includes('--json') ? console.error : console.log)(
    grouped.length
      ? `check-docs-type-ramp: ${grouped.length} off-ramp gap(s) over ${checked} text element(s)`
      : `check-docs-type-ramp: ${checked} text element(s) on the ramp over ${routes.length} page(s), 390 and 1440, light and dark`,
  );
  process.exit(grouped.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
