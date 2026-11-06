#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Record the HDS walkthrough video (hds#1148), with no human at the controls.
 *
 *   pnpm docs:build            # once: the static docs site in docs-site/out
 *   pnpm walkthrough:record    # this script
 *
 * Serves docs-site/out locally, drives Chromium through the six approved
 * chapters (chapters.mjs) with Playwright's recordVideo at 1440×900, shows the
 * captions in an injected overlay, and renders command output as styled HTML
 * panels. Every panel line comes from evidence.mjs, run at record time. Then
 * ffmpeg encodes an H.264 MP4 and a poster, and the captions go to a WebVTT
 * track. Output: docs-site/public/walkthrough/ (served as /walkthrough/).
 *
 * Waits are on page state (load, selectors, scroll end, the panels' data-done).
 * The only timed waits are `hold()`: reading time for the viewer.
 *
 * Chromium comes from scripts/lib/browser-host.mjs (PLAYWRIGHT_CHROMIUM_PATH pins one).
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { writeWalkthroughEvidence } from '../check-walkthrough-evidence.mjs';
import { chromiumPath } from '../lib/browser-host.mjs';
import { CHAPTERS, buildVtt, terminalPanelHtml } from './chapters.mjs';
import { collectEvidence } from './evidence.mjs';
import { serve } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITE = path.join(ROOT, 'docs-site', 'out');
const OUT = path.join(ROOT, 'docs-site', 'public', 'walkthrough');
const SIZE = { width: 1440, height: 900 };
const MAX_BYTES = 8 * 1024 * 1024;

if (!existsSync(path.join(SITE, 'docs', 'case-study.html'))) {
  console.error('✗ walkthrough — docs-site/out is missing. Run `pnpm docs:build` first.');
  process.exit(1);
}

const evidence = collectEvidence(ROOT);
// The captions say Figma matches and the release gate is green. Record only
// when that is true (right after a release's Figma delta sync), never a video
// whose panels contradict its captions.
const gateRuns = [
  ['check:figma-drift', evidence.drift],
  ['check:figma-release', evidence.release.gate],
];
const red = gateRuns.filter(([, r]) => r.code !== 0);
// --allow-red is for a local look only: the evidence file records it, and
// check-walkthrough-evidence (pre-commit) refuses to commit that media.
const allowRed = process.argv.includes('--allow-red');
if (red.length && !allowRed) {
  for (const [name, r] of red)
    console.error(`✗ walkthrough — ${name} is red:\n  ${r.lines.join('\n  ')}`);
  console.error('Record after the Figma delta sync makes both green (or pass --allow-red).');
  process.exit(1);
}
const caseStudyHtml = readFileSync(path.join(SITE, 'docs', 'case-study.html'), 'utf8');
const stylesheets = [...caseStudyHtml.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(
  (m) => m[1],
);

const server = await serve(SITE);
const executablePath = chromiumPath();
const browser = await chromium.launch({
  executablePath,
  args: ['--disable-background-networking', '--disable-component-update'],
});
const videoDir = mkdtempSync(path.join(tmpdir(), 'hds-walkthrough-video-'));
const context = await browser.newContext({
  viewport: SIZE,
  deviceScaleFactor: 1,
  colorScheme: 'light',
  reducedMotion: 'no-preference',
  recordVideo: { dir: videoDir, size: SIZE },
});
const page = await context.newPage();
const video = page.video();
const t0 = Date.now();

/** Captions: one cue per chapter, from its start to the next chapter's start. */
const cues = [];
let current = { text: '', index: 0 };

async function drawCaption() {
  await page.evaluate(
    ({ text, index, total }) => {
      let el = document.getElementById('wt-caption');
      if (!el) {
        el = document.createElement('div');
        el.id = 'wt-caption';
        el.setAttribute('aria-hidden', 'true');
        Object.assign(el.style, {
          position: 'fixed',
          left: '50%',
          bottom: '40px',
          transform: 'translateX(-50%)',
          maxWidth: '1080px',
          padding: '16px 28px',
          borderRadius: '14px',
          background: 'rgba(6, 10, 19, 0.88)',
          color: '#fff',
          font: '500 26px/1.35 system-ui, sans-serif',
          textAlign: 'center',
          zIndex: '2147483647',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          pointerEvents: 'none',
        });
        document.body.appendChild(el);
      }
      el.innerHTML = '';
      const step = document.createElement('span');
      step.textContent = `${index} / ${total}  `;
      Object.assign(step.style, { opacity: '0.55', fontSize: '18px', marginRight: '10px' });
      const body = document.createElement('span');
      body.textContent = text;
      el.append(step, body);
    },
    { text: current.text, index: current.index, total: CHAPTERS.length },
  );
}

async function chapter(id) {
  const index = CHAPTERS.findIndex((c) => c.id === id);
  const now = Date.now() - t0;
  if (cues.length) cues[cues.length - 1].end = now;
  cues.push({ start: now, end: now, text: CHAPTERS[index].caption });
  current = { text: CHAPTERS[index].caption, index: index + 1 };
  await drawCaption();
}

/** Reading time for the viewer: the one deliberate timed wait. */
const hold = (ms) => page.waitForTimeout(ms);

async function go(route) {
  await page.goto(server.url + route, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await drawCaption();
}

async function scrollTo(selector, offset = 96) {
  await page.evaluate(
    ({ selector, offset }) =>
      new Promise((resolve) => {
        const el = document.querySelector(selector);
        if (!el) throw new Error(`walkthrough: ${selector} not found`);
        const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
        if (Math.abs(top - window.scrollY) < 2) return resolve();
        const done = () => {
          window.removeEventListener('scrollend', done);
          resolve();
        };
        window.addEventListener('scrollend', done);
        window.scrollTo({ top, behavior: 'smooth' });
      }),
    { selector, offset },
  );
}

async function panel(route, opts) {
  server.setPage(route, terminalPanelHtml({ ...opts, stylesheets }));
  await go(route);
  await page.waitForSelector('body[data-done]');
}

const tone = (code) => (code === 0 ? 'ok' : 'fail');
let trimMs = 0;

try {
  // 1 — the case study
  await go('/docs/case-study');
  trimMs = Date.now() - t0;
  await chapter('case-study');
  await hold(4500);
  await scrollTo('#the-limits');
  await hold(5000);
  await scrollTo('#tokens-are-the-source-of-truth');
  await hold(4500);

  // 2 — a component page: live demo, generated API, then its tokens
  await go('/docs/components/button');
  await chapter('component');
  await hold(2000);
  await page.getByRole('button', { name: 'Primary', exact: true }).first().hover();
  await hold(1200);
  const toggle = page.getByRole('button', { name: 'Toggle', exact: true }).first();
  await toggle.click();
  await page.waitForSelector('button[aria-pressed="true"]');
  await hold(1200);
  await page.locator('summary', { hasText: /^API$/ }).first().click();
  await page.waitForSelector('details[open] summary');
  await scrollTo('h2#best-practices', 24);
  await hold(4000);
  await go('/docs/foundations/color');
  const swatch = 'button[title="Copy --semantic-color-surface-raised"]';
  await scrollTo(swatch, 320);
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    el.style.outline = '3px solid #2563eb';
    el.style.outlineOffset = '6px';
    el.style.borderRadius = '8px';
  }, swatch);
  await hold(5000);

  // 3 — tokens → CSS → Figma, one way, with the drift check
  await chapter('sync');
  await panel('/__walkthrough/sync', {
    title: 'One token, three outputs, one check',
    subtitle: 'semantic.color.surface.raised — read from the repo at record time',
    blocks: [
      { label: 'hirobius.tokens.json · source of truth', lines: evidence.token },
      { label: 'dist/variables.css · generated', lines: evidence.css },
      { label: 'figma/snapshot.json · what Figma holds', lines: evidence.figma },
      {
        label: 'drift check',
        command: 'pnpm check:figma-drift',
        lines: evidence.drift.lines,
        tone: tone(evidence.drift.code),
      },
    ],
  });
  await drawCaption();
  await hold(9500);

  // 4 — a gate catches a mistake, then passes
  await chapter('gates');
  const g = evidence.gates;
  await panel('/__walkthrough/gate-fail', {
    title: 'A gate catches the mistake',
    subtitle: 'The pre-commit spacing gate, run on an agent’s edit',
    blocks: [
      { label: 'plan-row.tsx · the edit', lines: g.bad },
      {
        label: `spacing gate · exit ${g.fail.code}`,
        command: 'node scripts/check-spacing-vocabulary.mjs',
        lines: g.fail.lines.filter((l, i) => l || i),
        tone: tone(g.fail.code),
      },
    ],
  });
  await drawCaption();
  await hold(6500);
  await panel('/__walkthrough/gate-pass', {
    title: 'Fixed with named tokens',
    subtitle: 'Raw integers become steps on the spacing scale',
    blocks: [
      { label: 'plan-row.tsx · the fix', lines: g.good },
      {
        label: `spacing gate · exit ${g.pass.code}`,
        command: 'node scripts/check-spacing-vocabulary.mjs',
        lines: g.pass.lines,
        tone: tone(g.pass.code),
      },
    ],
  });
  await drawCaption();
  await hold(4500);

  // 5 — the release path
  await chapter('release');
  const r = evidence.release;
  await panel('/__walkthrough/release', {
    title: 'From a changeset to npm',
    subtitle: `${r.name} · now at ${r.version}`,
    lineDelayMs: 140,
    blocks: [
      { label: r.changeset.name, lines: r.changeset.lines },
      {
        label: 'the release path',
        lines: [
          '1  changeset in the pull request',
          '2  merge to main → Release opens “Version Packages”',
          '3  independent review: “Reviewed: PASS — <sha>”, then merge',
          '4  agent applies the Figma delta: meta/version → the new version',
          '5  release gate below must pass',
          `6  Release workflow publishes ${r.name}`,
        ],
      },
      {
        label: 'release gate',
        command: 'pnpm check:figma-release',
        lines: r.gate.lines,
        tone: tone(r.gate.code),
      },
    ],
  });
  await drawCaption();
  await hold(9000);

  // 6 — close on the numbers
  await go('/docs/case-study');
  await chapter('close');
  await scrollTo('#the-results');
  await hold(7000);
  cues[cues.length - 1].end = Date.now() - t0;
} finally {
  await context.close();
  await browser.close();
  await server.close();
}

const webm = await video.path();
if (!existsSync(webm) || statSync(webm).size === 0) {
  throw new Error(
    'walkthrough: no video was recorded. Playwright needs its ffmpeg build; see scripts/walkthrough/README.md.',
  );
}
mkdirSync(OUT, { recursive: true });
const mp4 = path.join(OUT, 'walkthrough.mp4');
const poster = path.join(OUT, 'poster.jpg');
const vtt = path.join(OUT, 'walkthrough.vtt');

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
}

const trim = (trimMs / 1000).toFixed(3);
ffmpeg([
  '-ss',
  trim,
  '-i',
  webm,
  '-c:v',
  'libx264',
  '-preset',
  'slow',
  '-crf',
  '28',
  '-tune',
  'stillimage',
  '-pix_fmt',
  'yuv420p',
  '-r',
  '25',
  '-movflags',
  '+faststart',
  '-an',
  mp4,
]);
// Poster: the sync panel once its lines are in (the whole system on one screen).
const sync = cues[CHAPTERS.findIndex((c) => c.id === 'sync')];
const posterAt = ((sync.end - trimMs) / 1000 - 1).toFixed(3);
ffmpeg(['-ss', posterAt, '-i', mp4, '-frames:v', '1', '-q:v', '4', poster]);
writeFileSync(
  vtt,
  buildVtt(cues.map((c) => ({ ...c, start: c.start - trimMs, end: c.end - trimMs }))),
);
rmSync(videoDir, { recursive: true, force: true });
const commit = spawnSync('git', ['rev-parse', '--short=7', 'HEAD'], {
  cwd: ROOT,
  encoding: 'utf8',
});
writeWalkthroughEvidence(OUT, {
  commit: commit.stdout.trim(),
  allowRed,
  gates: Object.fromEntries(gateRuns.map(([name, r]) => [name, r.code])),
});

const bytes = statSync(mp4).size;
const seconds = ((cues[cues.length - 1].end - trimMs) / 1000).toFixed(1);
console.log(
  `✓ walkthrough — ${seconds}s, ${(bytes / 1024 / 1024).toFixed(2)} MB → ${path.relative(ROOT, mp4)}`,
);
if (bytes > MAX_BYTES) {
  console.error(
    `✗ walkthrough — the MP4 is over ${MAX_BYTES / 1024 / 1024} MB; raise -crf or shorten holds.`,
  );
  process.exit(1);
}
