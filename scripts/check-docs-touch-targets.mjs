#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-docs-touch-targets.mjs (hds#750)
 *
 * Loads the built docs-site pages of the small controls (sm Button, Tabs and
 * SegmentedControl triggers, Tag and its dismiss X, Disclosure trigger, Input clear) on a 390x844
 * touch phone and a 1024x768 touch tablet (wide, so only `pointer: coarse` can
 * lift it) and fails when any matched control's box is under
 * --semantic-size-touchTarget (44px) in either axis, or when a selector matches
 * nothing (a renamed demo must not pass silently). Targets live in
 * scripts/docs-touch-targets.json. Run `pnpm docs:publish` first. Chromium comes
 * from scripts/lib/browser-host.mjs.
 *
 * Usage: node scripts/check-docs-touch-targets.mjs [--dir <path>] [--targets <path>]
 * Exit 0 pass, 1 violations, 2 setup error. Fixtures: fixtures/check-docs-touch-targets/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_MIN, evaluateTargets, validateTargets } from './lib/docs-touch-targets.mjs';
import { serveStatic } from './lib/docs-axe.mjs';
import { launchChromium } from './lib/browser-host.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SETTLE_MS = 800;
const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  tablet: { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true },
};

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

async function scan(context, base, target, device) {
  const page = await context.newPage();
  try {
    await page.goto(`${base}${target.route}`, { waitUntil: 'load', timeout: 45000 });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(SETTLE_MS);
    const { min, boxes } = await page.evaluate(
      ({ selector, fallback }) => {
        const raw = getComputedStyle(document.documentElement)
          .getPropertyValue('--semantic-size-touchTarget')
          .trim();
        const r = (n) => Math.round(n * 100) / 100;
        const els = [...document.querySelectorAll(selector)].filter((el) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && b.height > 0 && !el.disabled;
        });
        return {
          min: parseFloat(raw) || fallback,
          boxes: els.map((el) => {
            const b = el.getBoundingClientRect();
            const label = (el.getAttribute('aria-label') || el.textContent || '').trim();
            return { label: label.slice(0, 40), width: r(b.width), height: r(b.height) };
          }),
        };
      },
      { selector: target.selector, fallback: DEFAULT_MIN },
    );
    return { route: target.route, name: `${target.name} @${device}`, min, boxes };
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const dir = path.resolve(ROOT, arg('dir', 'docs-site/out'));
  if (!fs.existsSync(dir)) {
    console.error(`No build in ${path.relative(ROOT, dir)}. Run \`pnpm docs:publish\` first.`);
    process.exit(2);
  }
  const targetsPath = path.resolve(ROOT, arg('targets', 'scripts/docs-touch-targets.json'));
  const targets = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
  const invalid = validateTargets(targets);
  if (invalid.length) {
    console.error(`${path.relative(ROOT, targetsPath)} is invalid:\n  ${invalid.join('\n  ')}`);
    process.exit(2);
  }
  const { server, port } = await serveStatic(dir);
  const browser = await launchChromium();
  const scans = [];
  for (const [device, options] of Object.entries(DEVICES)) {
    const context = await browser.newContext(options);
    for (const t of targets) scans.push(await scan(context, `http://127.0.0.1:${port}`, t, device));
    await context.close();
  }
  await browser.close();
  server.close();
  const problems = evaluateTargets(scans);
  for (const p of problems) console.log(`${p.route} [${p.name}] ${p.detail}`);
  const measured = scans.reduce((n, s) => n + s.boxes.length, 0);
  console.log(
    problems.length
      ? `check-docs-touch-targets: ${problems.length} problem(s) over ${measured} control(s)`
      : `check-docs-touch-targets: ${measured} control(s) on ${targets.length} target(s) x ${Object.keys(DEVICES).length} device(s) clean`,
  );
  process.exit(problems.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
