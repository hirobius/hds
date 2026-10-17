#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * record-motion.mjs — films each component's interactions to motion-reel/
 * (git-ignored), one .webm per scene, so a reviewer can scrub the motion.
 *
 *   pnpm motion:record                  # every scene, real speed
 *   pnpm motion:record tabs list        # just these scenes
 *   pnpm motion:record --rate=0.25      # quarter speed (CSS + Web Animations only;
 *                                       # motion/react JS springs keep real speed)
 *   pnpm motion:record --reduced        # emulate prefers-reduced-motion
 *
 * Serves preview/motion.html (the motion stage) with the preview bench's Vite
 * config, and drives it with Playwright. Chromium comes from
 * PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers in remote sessions) when present.
 * A review aid, not a gate: it asserts nothing.
 */
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'motion-reel');

const step = (n) => `[data-step="${n}"]`;
const pause = (ms) => ({ pause: ms });
const tap = (selector) => ({ tap: selector });
const hover = (selector) => ({ hover: selector });
const key = (name) => ({ key: name });

// Scene name (the stage's URL hash) → the interactions to film, in order.
const SCENES = {
  button: [tap('button >> nth=0'), tap(step(1)), pause(400), tap(step(1))],
  tabs: [tap(step(1)), pause(300), tap(step(2)), pause(300), tap('[role="tab"] >> nth=0')],
  segmented: [tap('[role="radio"] >> nth=1'), pause(300), tap('[role="radio"] >> nth=2')],
  menu: [tap(step(1)), pause(500), key('Escape')],
  popover: [tap(step(1)), pause(500), key('Escape')],
  dialog: [tap(step(1)), pause(600), key('Escape')],
  tooltip: [hover(step('hover')), pause(600), hover('body')],
  toast: [tap(step(1)), pause(2600)],
  disclosure: [tap(`${step(1)} button`), pause(500), tap(`${step(1)} button`)],
  select: [tap('[role="combobox"]'), pause(500), key('Escape')],
  list: [tap(step(1)), pause(500), tap(step(1)), pause(500), tap(step(2))],
  skeleton: [pause(300), tap(step(1)), pause(600), tap(step(1)), pause(300), tap(step(1))],
};

function chromiumPath() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(base)) return undefined;
  return readdirSync(base)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort()
    .reverse()
    .map((d) => join(base, d, 'chrome-linux/chrome'))
    .find((p) => existsSync(p));
}

async function play(page, action) {
  if (action.pause) return page.waitForTimeout(action.pause);
  if (action.key) return page.keyboard.press(action.key);
  const target = page.locator(action.tap ?? action.hover).first();
  await target.hover();
  if (action.hover) return;
  await page.mouse.down();
  await page.waitForTimeout(180); // hold, so the press state is on film
  await page.mouse.up();
  await page.waitForTimeout(250);
}

async function main() {
  const args = process.argv.slice(2);
  const rate = Number(args.find((a) => a.startsWith('--rate='))?.slice(7) ?? 1);
  const reduced = args.includes('--reduced');
  const wanted = args.filter((a) => !a.startsWith('--'));
  const names = wanted.length ? wanted : Object.keys(SCENES);
  const unknown = names.filter((n) => !SCENES[n]);
  if (unknown.length) {
    console.error(
      `Unknown scene(s): ${unknown.join(', ')}. Known: ${Object.keys(SCENES).join(', ')}`,
    );
    return 1;
  }

  mkdirSync(OUT, { recursive: true });
  const server = await createServer({
    configFile: join(ROOT, 'preview/vite.config.mjs'),
    server: { port: 0, host: '127.0.0.1' },
    logLevel: 'error',
  });
  await server.listen();
  const base = server.resolvedUrls.local[0];
  const browser = await chromium.launch({ executablePath: chromiumPath() });
  try {
    for (const name of names) {
      const context = await browser.newContext({
        viewport: { width: 720, height: 480 },
        recordVideo: { dir: OUT, size: { width: 720, height: 480 } },
        reducedMotion: reduced ? 'reduce' : 'no-preference',
      });
      const page = await context.newPage();
      await page.goto(`${base}motion.html#${name}`);
      await page.waitForLoadState('networkidle');
      if (rate !== 1) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Animation.enable');
        await cdp.send('Animation.setPlaybackRate', { playbackRate: rate });
      }
      await page.waitForTimeout(400);
      for (const action of SCENES[name]) await play(page, action);
      await page.waitForTimeout(600);
      const video = page.video();
      await context.close();
      const file = join(OUT, `${name}${reduced ? '.reduced' : ''}.webm`);
      rmSync(file, { force: true });
      renameSync(await video.path(), file);
      console.log(`✓ ${file.replace(`${ROOT}/`, '')}`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
  return 0;
}

process.exit(await main());
