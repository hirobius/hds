#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * generate-component-page — one reference page per component, generated.
 *
 * The data for a real component reference already existed and was scattered
 * across four artifacts that did not reference each other: hds-manifest.json
 * (inventory, Figma link, story ids), component-api.json (props, observed
 * tokens), the rendered-geometry baseline (measured defects) and
 * storybook-static (what it actually looks like). Answering "what is Table,
 * how do I use it, what does it bind, and is it healthy" meant opening all
 * four.
 *
 * The page anatomy follows the one every mature library converges on —
 * usage, examples, styling reference, API reference, status — and every
 * section is READ FROM THOSE ARTIFACTS. Nothing here is hand-written prose
 * that can rot: if the manifest is stale the page is stale in the same way,
 * and check-sync-map already fails on that.
 *
 *   node scripts/generate-component-page.mjs Table
 *   node scripts/generate-component-page.mjs Table --no-shots   # skip Chromium
 *
 * Output: docs/components/<name>.html, self-contained apart from the story
 * screenshots it writes beside it.
 */
import http from 'node:http';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const NAME = argv.find((a) => !a.startsWith('--'));
const SHOTS = !argv.includes('--no-shots');

if (!NAME) {
  console.error('✗ generate-component-page — needs a component name');
  console.error('  usage: node scripts/generate-component-page.mjs Table');
  process.exit(1);
}

const readJson = (p, fallback = null) =>
  existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback;

const manifest = readJson(path.join(ROOT, 'public/hds-manifest.json'));
if (!manifest) {
  console.error('✗ public/hds-manifest.json is missing — run pnpm manifest:generate');
  process.exit(1);
}
const spec = manifest.componentSpecs?.[NAME];
if (!spec) {
  const near = Object.keys(manifest.componentSpecs ?? {})
    .filter((n) => n.toLowerCase().includes(NAME.toLowerCase()))
    .slice(0, 5);
  console.error(`✗ no component named ${NAME} in the manifest`);
  if (near.length) console.error(`  did you mean: ${near.join(', ')}`);
  process.exit(1);
}

const api = readJson(path.join(ROOT, 'src/app/data/component-api.json'), { components: {} });
const apiEntry = api.components?.[NAME] ?? {};
const baseline = readJson(path.join(ROOT, 'docs/guardrails/rendered-geometry-baseline.json'), {
  accepted: [],
});

const storyIds = spec.storyIds ?? [];
const storyIdSet = new Set(storyIds);
const defects = (baseline.accepted ?? [])
  .filter((fp) => storyIdSet.has(fp.split(' :: ')[0]))
  .map((fp) => {
    const [storyId, kind, selector] = fp.split(' :: ');
    return { storyId, kind, selector };
  });

const OUT_DIR = path.join(ROOT, 'docs/components');
const SHOT_DIR = path.join(OUT_DIR, `${NAME.toLowerCase()}-shots`);
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

/** Render each story to a PNG. Returns { storyId: relativePath }. */
async function captureStories() {
  const STATIC = path.join(ROOT, 'storybook-static');
  if (!existsSync(path.join(STATIC, 'index.json'))) {
    console.warn('  (no storybook-static — run pnpm build-storybook for example images)');
    return {};
  }
  const { chromium } = await import('playwright');
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(STATIC, urlPath);
    if (!file.startsWith(STATIC)) return res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const exe =
    process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : {});
  const page = await browser.newPage({
    viewport: { width: 1100, height: 700 },
    deviceScaleFactor: 2,
  });
  mkdirSync(SHOT_DIR, { recursive: true });

  const shots = {};
  for (const id of storyIds) {
    try {
      await page.goto(`${base}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`, {
        waitUntil: 'networkidle',
        timeout: 20000,
      });
      await page.waitForSelector('#storybook-root > *', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(150);
      // #storybook-root fills the viewport even when the component is 200px
      // tall, so screenshotting it pads every example with dead space. Clip to
      // the union of what actually rendered instead.
      const clip = await page.evaluate(() => {
        const root = document.querySelector('#storybook-root');
        if (!root) return null;
        // Clipping to the root's CHILDREN is not enough: a story's own wrapper
        // is often a transparent full-height box, so the crop keeps all the
        // dead space. Measure what actually PAINTS instead — an element that
        // draws text, a background or a border.
        const paints = [];
        for (const el of root.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
          const hasBg =
            cs.backgroundColor && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(cs.backgroundColor);
          const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some(
            (side) => parseFloat(cs[`border${side}Width`]) > 0,
          );
          const hasImage =
            el.tagName === 'IMG' || el.tagName === 'SVG' || cs.backgroundImage !== 'none';
          const hasOwnText = [...el.childNodes].some(
            (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
          );
          if (hasBg || hasBorder || hasImage || hasOwnText) paints.push(r);
        }
        if (!paints.length) return null;
        const PAD = 16;
        const left = Math.max(0, Math.min(...paints.map((b) => b.left)) - PAD);
        const top = Math.max(0, Math.min(...paints.map((b) => b.top)) - PAD);
        const right = Math.max(...paints.map((b) => b.right)) + PAD;
        const bottom = Math.max(...paints.map((b) => b.bottom)) + PAD;
        return { x: left, y: top, width: right - left, height: bottom - top };
      });
      const file = path.join(SHOT_DIR, `${id}.png`);
      if (clip && clip.width >= 1 && clip.height >= 1) {
        await page.screenshot({ path: file, clip });
      } else {
        // Nothing measurable rendered — fall back rather than emit no image.
        const root = await page.$('#storybook-root');
        await (root ?? page).screenshot({ path: file });
      }
      shots[id] = path.relative(OUT_DIR, file).split(path.sep).join('/');
    } catch (err) {
      console.warn(`  (story ${id} did not render: ${String(err.message).slice(0, 80)})`);
    }
  }
  await browser.close();
  server.close();
  return shots;
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Story id -> the export name a reader recognises. */
const storyLabel = (id) =>
  id
    .split('--')[1]
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const props = Array.isArray(apiEntry.props)
  ? apiEntry.props
  : Object.values(apiEntry.props ?? spec.props ?? {});

/**
 * Tokens the component actually references.
 *
 * component-api.json's `observedTokens` only detects the `hds.*` JS token
 * object. HDS references tokens two ways, and the other one — a Tailwind
 * arbitrary value like `text-[color:var(--semantic-color-content-primary)]` —
 * is invisible to it. That is why 78 of 128 components record zero tokens
 * while plainly being tokenized; Button's only entry is inside a comment.
 * So the CSS custom properties are read straight from the source here too.
 */
/**
 * The third way HDS names a token: a Tailwind utility whose colour is mapped in
 * tailwind.config.tokens.cjs to a var(). `bg-primary` is
 * var(--role-primary) and `text-feedback-warning` is
 * var(--semantic-color-feedback-warning), but neither string contains "var(",
 * so scanning source text alone misses all of it — which is why Button, the
 * most-used component in the system, recorded zero tokens.
 */
function buildUtilityMap() {
  const map = new Map();
  const walk = (node, trail) => {
    for (const [key, value] of Object.entries(node ?? {})) {
      const next = key === 'DEFAULT' ? trail : [...trail, key];
      if (typeof value === 'string') {
        const m = /var\(\s*(--[\w-]+)\s*\)/.exec(value);
        if (m) map.set(next.join('-'), m[1]);
      } else if (value && typeof value === 'object') {
        walk(value, next);
      }
    }
  };
  try {
    const tokens = require(path.join(ROOT, 'tailwind.config.tokens.cjs'));
    walk(tokens?.theme?.extend?.colors, []);
  } catch {
    /* config absent — the two other detectors still run */
  }
  // The feedback family is declared in tailwind.config.ts, which is TS and
  // cannot be required here, so it is read as text.
  const tsConfig = path.join(ROOT, 'tailwind.config.ts');
  if (existsSync(tsConfig)) {
    const src = readFileSync(tsConfig, 'utf8');
    let group = null;
    for (const line of src.split('\n')) {
      const g = /^\s*'?([\w-]+)'?:\s*\{\s*$/.exec(line);
      if (g) {
        group = g[1];
        continue;
      }
      const e = /^\s*'?([\w-]+)'?:\s*'var\(\s*(--[\w-]+)\s*\)'/.exec(line);
      if (e && group && group !== 'colors') map.set(`${group}-${e[1]}`, e[2]);
    }
  }
  return map;
}
const UTILITY_TO_VAR = buildUtilityMap();
const UTILITY_PREFIX =
  /\b(?:bg|text|border|ring|fill|stroke|divide|outline|decoration|shadow|from|via|to|accent|caret|placeholder)-([a-z][\w-]*)/g;

function readUtilityReferences(filePath) {
  if (!filePath) return [];
  const abs = path.join(ROOT, filePath);
  if (!existsSync(abs)) return [];
  const out = [];
  readFileSync(abs, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const m of line.matchAll(UTILITY_PREFIX)) {
        const cssVar = UTILITY_TO_VAR.get(m[1]);
        if (!cssVar) continue;
        out.push({
          raw: m[0],
          tokenPath: cssVar.replace(/^--/, '').replace(/-/g, '.'),
          sourceLine: i + 1,
          sourceSnippet: line.trim().slice(0, 120),
        });
      }
    });
  return out;
}

function readVarReferences(filePath) {
  if (!filePath) return [];
  const abs = path.join(ROOT, filePath);
  if (!existsSync(abs)) return [];
  const lines = readFileSync(abs, 'utf8').split('\n');
  const found = [];
  lines.forEach((line, i) => {
    // A token named in a comment is documentation, not a binding.
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    for (const m of line.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
      found.push({
        raw: `var(${m[1]})`,
        // --semantic-color-content-primary -> semantic.color.content.primary
        tokenPath: m[1].replace(/^--/, '').replace(/-/g, '.'),
        sourceLine: i + 1,
        sourceSnippet: line.trim().slice(0, 120),
      });
    }
  });
  return found;
}

const tokens = [];
const seenToken = new Set();
for (const t of [
  ...(apiEntry.observedTokens ?? []),
  ...readVarReferences(spec.filePath),
  ...readUtilityReferences(spec.filePath),
]) {
  const key = t.tokenPath ?? t.raw;
  if (!key || seenToken.has(key)) continue;
  // A token mention inside a comment is not a binding.
  if (/^\s*\/\//.test(t.sourceSnippet ?? '')) continue;
  seenToken.add(key);
  tokens.push(t);
}
tokens.sort((a, b) => String(a.tokenPath ?? a.raw).localeCompare(String(b.tokenPath ?? b.raw)));

const GAP_LABEL = {
  'overflow-x': 'content overflows its frame',
  'clipped-y': 'content clipped vertically',
  'past-viewport': 'pushed past the viewport',
  'zero-size-control': 'control renders at 0×0',
  'small-target': 'below the 24px WCAG 2.2 AA target',
  'link-no-affordance': 'link has colour as its only affordance',
  'row-misaligned': 'table row baselines misaligned',
};

const section = (id, title, body, note) => `
  <section id="${id}">
    <h2>${esc(title)}</h2>
    ${note ? `<p class="note">${note}</p>` : ''}
    ${body}
  </section>`;

const examples = (shots) =>
  storyIds.length
    ? storyIds
        .map(
          (id) => `
      <figure class="example">
        ${shots[id] ? `<img src="${esc(shots[id])}" alt="${esc(storyLabel(id))}" loading="lazy">` : '<div class="missing">no render captured</div>'}
        <figcaption><span>${esc(storyLabel(id))}</span><code>${esc(id)}</code></figcaption>
      </figure>`,
        )
        .join('')
    : '<p class="empty">This component has no stories.</p>';

const propRows = props.length
  ? props
      .map(
        (p) => `
        <tr>
          <td><code>${esc(p.name)}</code>${p.required ? '<span class="req">required</span>' : ''}</td>
          <td><code class="type">${esc(p.type)}</code></td>
          <td>${esc(p.description) || '<span class="empty">—</span>'}</td>
        </tr>`,
      )
      .join('')
  : '<tr><td colspan="3" class="empty">No props recorded.</td></tr>';

const tokenRows = tokens.length
  ? tokens
      .map(
        (t) => `
        <tr>
          <td><code>${esc(t.tokenPath ?? t.raw)}</code></td>
          <td><code class="type">${esc(t.raw)}</code></td>
          <td class="src">${t.sourceLine ? `${esc(path.basename(spec.filePath ?? ''))}:${t.sourceLine}` : '<span class="empty">—</span>'}</td>
        </tr>`,
      )
      .join('')
  : '<tr><td colspan="3" class="empty">No tokens observed in source.</td></tr>';

const defectRows = defects.length
  ? defects
      .map(
        (d) => `
        <tr>
          <td><code>${esc(d.kind)}</code></td>
          <td>${esc(GAP_LABEL[d.kind] ?? d.kind)}</td>
          <td class="src"><code>${esc(d.selector)}</code><br><code class="type">${esc(d.storyId)}</code></td>
        </tr>`,
      )
      .join('')
  : '<tr><td colspan="3" class="ok">No rendered-geometry findings.</td></tr>';

const a11y = (spec.a11yRules ?? []).length
  ? `<ul class="rules">${spec.a11yRules.map((r) => `<li>${esc(typeof r === 'string' ? r : (r.rule ?? JSON.stringify(r)))}</li>`).join('')}</ul>`
  : '<p class="empty">No accessibility rules recorded.</p>';

const importName = NAME;
const usage = `import { ${importName} } from '@hirobius/design-system';`;

function buildHtml(shots) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(NAME)} — Hirobius Design System</title>
<style>
  :root {
    --bg: #ffffff; --surface: #fafafa; --line: #e5e5e5;
    --ink: #111111; --ink-2: #555555; --ink-3: #888888;
    --accent: #111111; --ok: #157f3d; --warn: #9a6b00;
    --mono: ui-monospace, "Geist Mono", SFMono-Regular, Menlo, monospace;
    --sans: "Satoshi", ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  :root:not([data-theme="light"]) { }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0d0d0d; --surface: #161616; --line: #2a2a2a;
      --ink: #f5f5f5; --ink-2: #b0b0b0; --ink-3: #7d7d7d;
      --accent: #f5f5f5; --ok: #4ad07d; --warn: #e0a83a;
    }
  }
  :root[data-theme="dark"] {
    --bg: #0d0d0d; --surface: #161616; --line: #2a2a2a;
    --ink: #f5f5f5; --ink-2: #b0b0b0; --ink-3: #7d7d7d;
    --accent: #f5f5f5; --ok: #4ad07d; --warn: #e0a83a;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font-family: var(--sans); font-size: 15px; line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 880px; margin: 0 auto; padding: 64px 16px 120px; }
  header { border-bottom: 1px solid var(--line); padding-bottom: 28px; margin-bottom: 8px; }
  .eyebrow { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); margin: 0 0 8px; }
  h1 { font-size: 40px; line-height: 1.1; margin: 0 0 10px; letter-spacing: -.02em; }
  .lede { color: var(--ink-2); margin: 0 0 20px; max-width: 62ch; }
  .meta { display: flex; flex-wrap: wrap; gap: 8px; }
  .pill {
    font-size: 12px; padding: 4px 10px; border: 1px solid var(--line);
    border-radius: 999px; color: var(--ink-2); text-decoration: none;
  }
  a.pill:hover { border-color: var(--accent); color: var(--ink); }
  section { padding-top: 48px; }
  h2 { font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3);
       margin: 0 0 18px; font-weight: 600; }
  .note { color: var(--ink-2); font-size: 14px; margin: -8px 0 18px; max-width: 64ch; }
  pre { background: var(--surface); border: 1px solid var(--line); border-radius: 8px;
        padding: 14px 16px; overflow-x: auto; margin: 0; }
  code { font-family: var(--mono); font-size: 13px; }
  .type { color: var(--ink-2); }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; font-weight: 600; font-size: 12px; letter-spacing: .06em;
       text-transform: uppercase; color: var(--ink-3); padding: 0 12px 8px 0;
       border-bottom: 1px solid var(--line); }
  td { padding: 10px 12px 10px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
  td:last-child, th:last-child { padding-right: 0; }
  .req { font-size: 10px; margin-left: 8px; color: var(--warn); letter-spacing: .04em;
         text-transform: uppercase; }
  .src { color: var(--ink-3); font-size: 12px; }
  .empty { color: var(--ink-3); }
  .ok { color: var(--ok); }
  .examples { display: grid; gap: 20px; }
  .example { margin: 0; border: 1px solid var(--line); border-radius: 10px; overflow: hidden;
             background: var(--surface); }
  .example img { display: block; width: 100%; height: auto; background: #fff; }
  .example .missing { padding: 40px; text-align: center; color: var(--ink-3); font-size: 13px; }
  figcaption { display: flex; justify-content: space-between; align-items: center; gap: 12px;
               padding: 10px 14px; border-top: 1px solid var(--line); font-size: 13px; }
  figcaption code { color: var(--ink-3); font-size: 11px; }
  .rules { margin: 0; padding-left: 18px; color: var(--ink-2); }
  .rules li { margin-bottom: 6px; }
  footer { margin-top: 72px; padding-top: 20px; border-top: 1px solid var(--line);
           color: var(--ink-3); font-size: 12px; }
  @media (max-width: 600px) { h1 { font-size: 30px; } .wrap { padding-top: 40px; } }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <p class="eyebrow">${esc(spec.category ?? 'Component')} · ${esc(spec.tier ?? 'component')}</p>
    <h1>${esc(NAME)}</h1>
    <p class="lede">${esc((spec.description ?? '').split('\n')[0])}</p>
    <div class="meta">
      ${spec.filePath ? `<a class="pill" href="https://github.com/hirobius/hds/blob/main/${esc(spec.filePath)}">Source</a>` : ''}
      ${(spec.storyFiles ?? []).length ? `<a class="pill" href="https://github.com/hirobius/hds/blob/main/${esc(spec.storyFiles[0])}">Stories</a>` : ''}
      ${spec.figmaUrl ? `<a class="pill" href="${esc(spec.figmaUrl)}">Figma</a>` : '<span class="pill">No Figma node</span>'}
      <span class="pill">${storyIds.length} stor${storyIds.length === 1 ? 'y' : 'ies'}</span>
      <span class="pill">${props.length} prop${props.length === 1 ? '' : 's'}</span>
    </div>
  </header>

  ${section('usage', 'Usage', `<pre><code>${esc(usage)}</code></pre>`)}

  ${section(
    'examples',
    'Examples',
    `<div class="examples">${examples(shots)}</div>`,
    'Every image is the real story rendered in Chromium, not a mockup — so a visual defect here is a defect in the component.',
  )}

  ${section(
    'styling',
    'Styling reference',
    `<table>
      <thead><tr><th>Token</th><th>Source expression</th><th>Where</th></tr></thead>
      <tbody>${tokenRows}</tbody>
    </table>`,
    'Read from the source, not declared by hand: these are the tokens the component was observed to reference.',
  )}

  ${section(
    'api',
    'API reference',
    `<table>
      <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
      <tbody>${propRows}</tbody>
    </table>`,
  )}

  ${section('a11y', 'Accessibility', a11y)}

  ${section(
    'status',
    'Status',
    `<table>
      <thead><tr><th>Finding</th><th>Meaning</th><th>Where</th></tr></thead>
      <tbody>${defectRows}</tbody>
    </table>`,
    'Measured by check-rendered-geometry against the real render. An empty table means the sweep found nothing, not that nobody looked.',
  )}

  <footer>
    Generated by <code>scripts/generate-component-page.mjs</code> from
    <code>hds-manifest.json</code>, <code>component-api.json</code> and the
    rendered-geometry baseline. Do not hand-edit — regenerate.
  </footer>
</div>
</body>
</html>`;
}

const shots = SHOTS ? await captureStories() : {};
mkdirSync(OUT_DIR, { recursive: true });
const outFile = path.join(OUT_DIR, `${NAME.toLowerCase()}.html`);
writeFileSync(outFile, buildHtml(shots));

console.log(`✓ ${path.relative(ROOT, outFile)}`);
console.log(
  `  ${storyIds.length} stories (${Object.keys(shots).length} rendered) · ${props.length} props · ` +
    `${tokens.length} tokens · ${defects.length} findings`,
);
