#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * generate-component-page — the component reference site.
 *
 * The data already existed, scattered across four artifacts that did not
 * reference each other: hds-manifest.json (inventory, Figma link, story ids),
 * component-api.json (props), the rendered-geometry baseline (measured
 * defects) and storybook-static (what it actually looks like). This joins
 * them into one page per component plus an index.
 *
 *   pnpm docs:site                  every component + index
 *   pnpm docs:component Table       one component
 *   … --no-shots                    skip Chromium (tables only, seconds)
 *
 * Rendering lives in scripts/lib/component-page.mjs so the token detection can
 * be tested without a browser. Output is gitignored: the screenshots are
 * regenerated binaries, and a checked-in page is one more generated artifact
 * that can go stale while asserting it is current.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildUtilityMap, collectTokens, renderIndex, renderPage } from './lib/component-page.mjs';
import { mappedByOverride } from './figma-disposition.mjs';
import { launchChromium, serveStorybook, storyUrl } from './lib/storybook-host.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJsonAt = (p, fallback = null) =>
  existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback;

const OUT_DIR = path.join(ROOT, 'docs/components');
const SHOT_DIR = path.join(OUT_DIR, '_shots');
// The repository and branch are already recorded in figma/links.json, which
// pnpm figma:links reads to build design<->code links. Hardcoding them here
// would be a second copy of a fact that can move.
const links = readJsonAt(path.join(ROOT, 'figma/links.json'), {});
const REPO = links.repository ?? 'https://github.com/hirobius/hds';
const BRANCH = links.branch ?? 'main';

const argv = process.argv.slice(2);
const ALL = argv.includes('--all');
const SHOTS = !argv.includes('--no-shots');
const CLEAN = argv.includes('--clean');
const ONLY = argv.find((a) => !a.startsWith('--'));

if (!ALL && !ONLY) {
  console.error('✗ generate-component-page — needs a component name, or --all');
  console.error('  pnpm docs:component Table');
  console.error('  pnpm docs:site');
  process.exit(1);
}

const readJson = (p, fallback = null) =>
  existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback;

const manifest = readJson(path.join(ROOT, 'public/hds-manifest.json'));
if (!manifest) {
  console.error('✗ public/hds-manifest.json is missing');
  console.error('  fix: pnpm manifest:generate');
  process.exit(1);
}
const api = readJson(path.join(ROOT, 'src/app/data/component-api.json'), { components: {} });
const baseline = readJson(path.join(ROOT, 'docs/guardrails/rendered-geometry-baseline.json'), {
  accepted: [],
});
const utilityMap = buildUtilityMap(ROOT, require);
// A component can be linked to Figma two ways: a figmaUrl on the spec, or an
// entry in figma/mapping-overrides.json. Counting only the first reports 44
// where check-sync-map reports 47 — two generated records disagreeing about
// the same fact is the failure this whole line of work exists to remove.
const figmaMapped = mappedByOverride();

const specs = manifest.componentSpecs ?? {};
let names = Object.keys(specs);
if (ONLY) {
  const match = names.find((n) => n.toLowerCase() === ONLY.toLowerCase());
  if (!match) {
    const near = names.filter((n) => n.toLowerCase().includes(ONLY.toLowerCase())).slice(0, 5);
    console.error(`✗ no component named ${ONLY}`);
    if (near.length) console.error(`  did you mean: ${near.join(', ')}`);
    process.exit(1);
  }
  names = [match];
}

/** Defect fingerprints grouped by the story they were measured on. */
const defectsByStory = new Map();
for (const fp of baseline.accepted ?? []) {
  const [storyId, kind, selector] = fp.split(' :: ');
  if (!defectsByStory.has(storyId)) defectsByStory.set(storyId, []);
  defectsByStory.get(storyId).push({ storyId, kind, selector });
}

/**
 * Runs INSIDE the page. Clipping to #storybook-root pads every example with
 * viewport-height dead space, and clipping to its children does not help
 * because a story's own wrapper is usually a transparent full-height box.
 * Measure what actually PAINTS instead.
 */
const PAINTED_BOUNDS = () => {
  const root = document.querySelector('#storybook-root');
  if (!root) return null;
  const boxes = [];
  for (const el of root.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const hasBg =
      cs.backgroundColor && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(cs.backgroundColor);
    const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some(
      (s) => parseFloat(cs[`border${s}Width`]) > 0,
    );
    const hasImage = el.tagName === 'IMG' || el.tagName === 'SVG' || cs.backgroundImage !== 'none';
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasBg || hasBorder || hasImage || hasText) boxes.push(r);
  }
  if (!boxes.length) return null;
  const PAD = 16;
  const left = Math.max(0, Math.min(...boxes.map((b) => b.left)) - PAD);
  const top = Math.max(0, Math.min(...boxes.map((b) => b.top)) - PAD);
  return {
    x: left,
    y: top,
    width: Math.max(...boxes.map((b) => b.right)) + PAD - left,
    height: Math.max(...boxes.map((b) => b.bottom)) + PAD - top,
  };
};

/**
 * Capture every story for every component in ONE browser session. Launching a
 * browser per component made --all unusable; this keeps it to a single launch
 * and a small pool of pages.
 */
async function captureAll(work) {
  const unique = new Set(work.flatMap((w) => w.storyIds));
  const total = unique.size;
  if (!total) return {};
  const host = await serveStorybook(ROOT);
  if (!host) {
    console.warn('  (no storybook-static — run pnpm build-storybook for example images)');
    return {};
  }
  const browser = await launchChromium();

  // Several components legitimately share one story file — Card and its seven
  // slot components all resolve to card.stories.tsx — so the same story id
  // appears in several components' lists. Capturing per component wrote the
  // same PNG into several directories and left each page pointing at whichever
  // finished last. One shared directory, one capture per unique story.
  const queue = [...new Set(work.flatMap((w) => w.storyIds))].map((id) => ({ id, dir: SHOT_DIR }));
  const shots = {};
  let done = 0;
  let failed = 0;

  const worker = async () => {
    const ctx = await browser.newContext({
      viewport: { width: 1100, height: 700 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    while (queue.length) {
      const job = queue.shift();
      try {
        await page.goto(storyUrl(host.baseUrl, job.id), {
          waitUntil: 'networkidle',
          timeout: 20000,
        });
        await page.waitForSelector('#storybook-root > *', { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(120);
        const clip = await page.evaluate(PAINTED_BOUNDS);
        mkdirSync(job.dir, { recursive: true });
        const file = path.join(job.dir, `${job.id}.png`);
        if (clip && clip.width >= 1 && clip.height >= 1) {
          await page.screenshot({ path: file, clip });
        } else {
          const root = await page.$('#storybook-root');
          await (root ?? page).screenshot({ path: file });
        }
        shots[job.id] = path.relative(OUT_DIR, file).split(path.sep).join('/');
      } catch {
        failed += 1;
      }
      done += 1;
      if (done % 50 === 0) process.stderr.write(`  captured ${done}/${total}\n`);
    }
    await ctx.close();
  };

  await Promise.all(Array.from({ length: 4 }, worker));
  await browser.close();
  host.close();
  if (failed) console.warn(`  (${failed} stor${failed === 1 ? 'y' : 'ies'} did not render)`);
  return shots;
}

if (CLEAN && existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

// Assemble every component's data first, so a capture failure cannot leave
// half the site un-generated.
const work = names.map((name) => {
  const spec = specs[name];
  const apiEntry = api.components?.[name] ?? {};
  const source =
    spec.filePath && existsSync(path.join(ROOT, spec.filePath))
      ? readFileSync(path.join(ROOT, spec.filePath), 'utf8')
      : '';
  const storyIds = spec.storyIds ?? [];
  return {
    name,
    slug: name.toLowerCase(),
    spec,
    storyIds,
    props: Array.isArray(apiEntry.props)
      ? apiEntry.props
      : Object.values(apiEntry.props ?? spec.props ?? {}),
    tokens: collectTokens({ observed: apiEntry.observedTokens ?? [], source, utilityMap }),
    defects: storyIds.flatMap((id) => defectsByStory.get(id) ?? []),
  };
});

const shots = SHOTS ? await captureAll(work) : {};

for (const w of work) {
  writeFileSync(
    path.join(OUT_DIR, `${w.slug}.html`),
    renderPage({
      name: w.name,
      spec: w.spec,
      props: w.props,
      tokens: w.tokens,
      defects: w.defects,
      shots,
      repo: REPO,
      branch: BRANCH,
    }),
  );
}

if (ALL) {
  const rows = work.map((w) => ({
    name: w.name,
    slug: w.slug,
    category: w.spec.category,
    tier: w.spec.tier,
    stories: w.storyIds.length,
    tokens: w.tokens.length,
    figma: Boolean(w.spec.figmaUrl) || figmaMapped.has(w.name),
    defects: w.defects.length,
  }));
  writeFileSync(
    path.join(OUT_DIR, 'index.html'),
    renderIndex({
      rows,
      generated: manifest.generated ?? 'from the current manifest',
      summary: {
        components: rows.length,
        stories: rows.reduce((n, r) => n + r.stories, 0),
        tokens: rows.reduce((n, r) => n + r.tokens, 0),
        figma: rows.filter((r) => r.figma).length,
        withDefects: rows.filter((r) => r.defects).length,
      },
    }),
  );
}

const totals = work.reduce(
  (acc, w) => ({
    stories: acc.stories + w.storyIds.length,
    tokens: acc.tokens + w.tokens.length,
    defects: acc.defects + w.defects.length,
  }),
  { stories: 0, tokens: 0, defects: 0 },
);

console.log(
  `✓ ${work.length} page${work.length === 1 ? '' : 's'}${ALL ? ' + index' : ''} → ${path.relative(ROOT, OUT_DIR)}/`,
);
console.log(
  `  ${totals.stories} stories (${Object.keys(shots).length} rendered) · ${totals.tokens} token refs · ${totals.defects} findings`,
);
if (ALL) console.log(`  open ${path.relative(ROOT, path.join(OUT_DIR, 'index.html'))}`);
