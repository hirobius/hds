/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * component-page — the reference page and index, as pure functions.
 *
 * The rendering lives here rather than in the CLI so the part with real logic
 * — working out which tokens a component actually references — can be tested
 * without a browser or a Storybook build.
 *
 * HDS names a token THREE ways, and component-api.json's `observedTokens`
 * only ever saw the first:
 *
 *   1. hds.typeStyles.ui                  the JS token object
 *   2. text-[color:var(--semantic-…)]     a Tailwind arbitrary value
 *   3. bg-primary                         a named utility mapped in
 *                                         tailwind.config.tokens.cjs to a var()
 *
 * That is why 78 of 128 components recorded zero tokens while plainly being
 * tokenized, and why Button — the most-used component in the system — recorded
 * nothing but a mention inside a comment.
 */
import path from 'node:path';
import {
  buildUtilityMap,
  mergeReferences,
  utilityReferences,
  varReferences,
} from './token-references.mjs';

export { buildUtilityMap };

/**
 * Merge all three detectors for one component. The detection rule itself
 * lives in token-references so the component-api generator and this site
 * cannot drift apart on what counts as a token reference.
 */
export function collectTokens({ observed = [], source = '', utilityMap = new Map() }) {
  return mergeReferences([observed, varReferences(source), utilityReferences(source, utilityMap)]);
}

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** `primitives-table--density-compact` -> `Density Compact` */
export const storyLabel = (id) =>
  (id.split('--')[1] ?? id)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const GAP_LABEL = Object.freeze({
  'overflow-x': 'content overflows its frame',
  'clipped-y': 'content clipped vertically',
  'past-viewport': 'pushed past the viewport',
  'zero-size-control': 'control renders at 0×0',
  'small-target': 'below the 24px WCAG 2.2 AA target',
  'link-no-affordance': 'link has colour as its only affordance',
  'row-misaligned': 'table row baselines misaligned',
});

/** Shared chrome. One stylesheet for every page, so the site reads as one. */
export const STYLES = `
  :root {
    --bg:#fff; --surface:#fafafa; --line:#e5e5e5;
    --ink:#111; --ink-2:#555; --ink-3:#888; --ok:#157f3d; --warn:#9a6b00;
    --mono:ui-monospace,"Geist Mono",SFMono-Regular,Menlo,monospace;
    --sans:"Satoshi",ui-sans-serif,system-ui,-apple-system,sans-serif;
  }
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
    --bg:#0d0d0d; --surface:#161616; --line:#2a2a2a;
    --ink:#f5f5f5; --ink-2:#b0b0b0; --ink-3:#7d7d7d; --ok:#4ad07d; --warn:#e0a83a;
  }}
  :root[data-theme="dark"]{
    --bg:#0d0d0d; --surface:#161616; --line:#2a2a2a;
    --ink:#f5f5f5; --ink-2:#b0b0b0; --ink-3:#7d7d7d; --ok:#4ad07d; --warn:#e0a83a;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);
       font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
  a{color:inherit}
  .wrap{max-width:880px;margin:0 auto;padding:40px 16px 120px}
  .back{display:inline-block;font-size:13px;color:var(--ink-3);text-decoration:none;margin-bottom:28px}
  .back:hover{color:var(--ink)}
  header{border-bottom:1px solid var(--line);padding-bottom:28px}
  .eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin:0 0 8px}
  h1{font-size:40px;line-height:1.1;margin:0 0 10px;letter-spacing:-.02em}
  .lede{color:var(--ink-2);margin:0 0 20px;max-width:62ch}
  .meta{display:flex;flex-wrap:wrap;gap:8px}
  .pill{font-size:12px;padding:4px 10px;border:1px solid var(--line);border-radius:999px;
        color:var(--ink-2);text-decoration:none}
  a.pill:hover{border-color:var(--ink);color:var(--ink)}
  .pill.warn{color:var(--warn);border-color:var(--warn)}
  section{padding-top:48px}
  h2{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);
     margin:0 0 18px;font-weight:600}
  .note{color:var(--ink-2);font-size:14px;margin:-8px 0 18px;max-width:64ch}
  pre{background:var(--surface);border:1px solid var(--line);border-radius:8px;
      padding:14px 16px;overflow-x:auto;margin:0}
  code{font-family:var(--mono);font-size:13px}
  .type{color:var(--ink-2)}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th{text-align:left;font-weight:600;font-size:12px;letter-spacing:.06em;text-transform:uppercase;
     color:var(--ink-3);padding:0 12px 8px 0;border-bottom:1px solid var(--line)}
  td{padding:10px 12px 10px 0;border-bottom:1px solid var(--line);vertical-align:top}
  td:last-child,th:last-child{padding-right:0}
  .req{font-size:10px;margin-left:8px;color:var(--warn);letter-spacing:.04em;text-transform:uppercase}
  .src{color:var(--ink-3);font-size:12px}
  .empty{color:var(--ink-3)}
  .ok{color:var(--ok)}
  .examples{display:grid;gap:20px}
  .example{margin:0;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface)}
  .example img{display:block;width:100%;height:auto;background:#fff}
  .example .missing{padding:40px;text-align:center;color:var(--ink-3);font-size:13px}
  figcaption{display:flex;justify-content:space-between;align-items:center;gap:12px;
             padding:10px 14px;border-top:1px solid var(--line);font-size:13px}
  figcaption code{color:var(--ink-3);font-size:11px}
  .rules{margin:0;padding-left:18px;color:var(--ink-2)}
  .rules li{margin-bottom:6px}
  footer{margin-top:72px;padding-top:20px;border-top:1px solid var(--line);color:var(--ink-3);font-size:12px}
  @media (max-width:600px){h1{font-size:30px}.wrap{padding-top:28px}}
`;

const section = (id, title, body, note) => `
  <section id="${id}">
    <h2>${esc(title)}</h2>
    ${note ? `<p class="note">${note}</p>` : ''}
    ${body}
  </section>`;

/**
 * One component's page.
 * `shots` maps story id -> relative image path; a missing entry renders a
 * placeholder rather than a broken image.
 */
export function renderPage({
  name,
  spec,
  props,
  tokens,
  defects,
  shots = {},
  repo,
  branch = 'main',
  packageName = 'the design system',
  dispositionClass,
}) {
  const storyIds = spec.storyIds ?? [];

  const examples = storyIds.length
    ? storyIds
        .map(
          (id) => `
      <figure class="example">
        ${
          shots[id]
            ? `<img src="${esc(shots[id])}" alt="${esc(storyLabel(id))}" loading="lazy">`
            : '<div class="missing">no render captured</div>'
        }
        <figcaption><span>${esc(storyLabel(id))}</span><code>${esc(id)}</code></figcaption>
      </figure>`,
        )
        .join('')
    : `<p class="empty">${
        dispositionClass === 'internal'
          ? 'No stories, by design — this is an <strong>internal</strong> component under the ratified disposition (hds#235), not part of the consumer-facing surface. ' +
            (spec.filePath?.endsWith('.mjs')
              ? 'It is a Compiler primitive defined in a build script rather than a React module, so there is nothing to mount.'
              : 'Every consumer-facing component does have one — <code>check-story-coverage</code> fails when one does not.')
          : 'No stories. This component is consumer-facing, so that is a gap <code>check-story-coverage</code> should have caught.'
      }</p>`;

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
          <td class="src">${
            t.sourceLine
              ? `${esc(path.basename(spec.filePath ?? ''))}:${t.sourceLine}`
              : '<span class="empty">—</span>'
          }</td>
        </tr>`,
        )
        .join('')
    : '<tr><td colspan="3" class="empty">No tokens referenced — this component contributes no styling of its own.</td></tr>';

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
    ? `<ul class="rules">${spec.a11yRules
        .map((r) => `<li>${esc(typeof r === 'string' ? r : (r.rule ?? JSON.stringify(r)))}</li>`)
        .join('')}</ul>`
    : '<p class="empty">No accessibility rules recorded.</p>';

  const blob = (p) => `${repo}/blob/${branch}/${p}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} — Hirobius Components</title>
<style>${STYLES}</style>
</head>
<body>
<div class="wrap">
  <a class="back" href="./index.html">← All components</a>
  <header>
    <p class="eyebrow">${esc(spec.category ?? 'Component')} · ${esc(spec.tier ?? 'component')}</p>
    <h1>${esc(name)}</h1>
    <p class="lede">${esc((spec.description ?? '').split('\n')[0])}</p>
    <div class="meta">
      ${spec.filePath ? `<a class="pill" href="${esc(blob(spec.filePath))}">Source</a>` : ''}
      ${(spec.storyFiles ?? []).length ? `<a class="pill" href="${esc(blob(spec.storyFiles[0]))}">Stories</a>` : ''}
      ${spec.figmaUrl ? `<a class="pill" href="${esc(spec.figmaUrl)}">Figma</a>` : '<span class="pill">No Figma node</span>'}
      <span class="pill">${
        storyIds.length
          ? `${storyIds.length} stor${storyIds.length === 1 ? 'y' : 'ies'}`
          : dispositionClass === 'internal'
            ? 'internal — no story by design'
            : 'no story'
      }</span>
      <span class="pill">${props.length} prop${props.length === 1 ? '' : 's'}</span>
      ${defects.length ? `<span class="pill warn">${defects.length} finding${defects.length === 1 ? '' : 's'}</span>` : ''}
    </div>
  </header>

  ${section(
    'usage',
    'Usage',
    `<pre><code>import { ${esc(name)} } from '${esc(packageName)}';</code></pre>`,
  )}

  ${section(
    'examples',
    'Examples',
    `<div class="examples">${examples}</div>`,
    'Every image is the real story rendered in Chromium, not a mockup — so a visual defect here is a defect in the component.',
  )}

  ${section(
    'styling',
    'Styling reference',
    `<table><thead><tr><th>Token</th><th>Source expression</th><th>Where</th></tr></thead><tbody>${tokenRows}</tbody></table>`,
    'Read from the source, not declared by hand: the tokens this component actually references, however it names them.',
  )}

  ${section(
    'api',
    'API reference',
    `<table><thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead><tbody>${propRows}</tbody></table>`,
  )}

  ${section('a11y', 'Accessibility', a11y)}

  ${section(
    'status',
    'Status',
    `<table><thead><tr><th>Finding</th><th>Meaning</th><th>Where</th></tr></thead><tbody>${defectRows}</tbody></table>`,
    'Measured by check-rendered-geometry against the real render. An empty table means the sweep found nothing, not that nobody looked.',
  )}

  <footer>
    Generated from <code>hds-manifest.json</code>, <code>component-api.json</code> and the
    rendered-geometry baseline. Do not hand-edit — run <code>pnpm docs:site</code>.
  </footer>
</div>
</body>
</html>`;
}

/** The index: every component, grouped, filterable, with its health on the row. */
export function renderIndex({ rows, generated, summary }) {
  const byCategory = new Map();
  for (const r of rows) {
    const key = r.category || 'Uncategorized';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(r);
  }

  const groups = [...byCategory.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([category, items]) => `
      <section class="group" data-group>
        <h2>${esc(category)} <span class="count">${items.length}</span></h2>
        <table>
          <thead><tr><th>Component</th><th>Tier</th><th>Stories</th><th>Tokens</th><th>Figma</th><th>Status</th></tr></thead>
          <tbody>
            ${items
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(
                (r) => `
              <tr data-row data-name="${esc(r.name.toLowerCase())}">
                <td><a href="./${esc(r.slug)}.html"><strong>${esc(r.name)}</strong></a></td>
                <td class="src">${esc(r.tier ?? '—')}</td>
                <td class="src">${r.stories || '<span class="empty">—</span>'}</td>
                <td class="src">${r.tokens || '<span class="empty">—</span>'}</td>
                <td class="src">${r.figma ? '✓' : '<span class="empty">—</span>'}</td>
                <td>${
                  r.defects
                    ? `<span class="warn-text">${r.defects} finding${r.defects === 1 ? '' : 's'}</span>`
                    : '<span class="ok">clean</span>'
                }</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </section>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hirobius Components</title>
<style>${STYLES}
  .wrap{max-width:1000px}
  .stats{display:flex;flex-wrap:wrap;gap:24px;margin:24px 0 0}
  .stat{min-width:96px}
  .stat b{display:block;font-size:26px;line-height:1.2;letter-spacing:-.01em}
  .stat span{font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em}
  .group{padding-top:40px}
  .group h2{display:flex;align-items:baseline;gap:10px}
  .count{font-size:12px;color:var(--ink-3);letter-spacing:0}
  #filter{width:100%;margin-top:28px;padding:11px 14px;font:inherit;font-size:14px;
          background:var(--surface);color:var(--ink);
          border:1px solid var(--line);border-radius:8px}
  #filter:focus{outline:2px solid var(--ink-3);outline-offset:2px}
  tbody tr:hover{background:var(--surface)}
  td a{text-decoration:none}
  td a:hover{text-decoration:underline}
  .warn-text{color:var(--warn)}
  #none{display:none;color:var(--ink-3);padding-top:32px}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <p class="eyebrow">Hirobius Design System</p>
    <h1>Components</h1>
    <p class="lede">Every component in the system, with what it binds and whether it renders clean. Generated from the manifest — if a component is here, it exists in code.</p>
    <div class="stats">
      <div class="stat"><b>${summary.components}</b><span>Components</span></div>
      <div class="stat"><b>${summary.stories}</b><span>Stories</span></div>
      <div class="stat"><b>${summary.tokens}</b><span>Token refs</span></div>
      <div class="stat"><b>${summary.figma}</b><span>In Figma</span></div>
      <div class="stat"><b>${summary.withDefects}</b><span>With findings</span></div>
    </div>
    <input id="filter" type="search" placeholder="Filter components…" autocomplete="off" aria-label="Filter components">
  </header>
  ${groups}
  <p id="none">No component matches that filter.</p>
  <footer>Generated ${esc(generated)} by <code>pnpm docs:site</code>.</footer>
</div>
<script>
  const input = document.getElementById('filter');
  const rows = [...document.querySelectorAll('[data-row]')];
  const groups = [...document.querySelectorAll('[data-group]')];
  const none = document.getElementById('none');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    for (const row of rows) {
      const hit = !q || row.dataset.name.includes(q);
      row.style.display = hit ? '' : 'none';
      if (hit) shown++;
    }
    // Hide a group whose every row filtered out, so the page does not become
    // a column of empty headings.
    for (const g of groups) {
      g.style.display = g.querySelector('[data-row]:not([style*="none"])') ? '' : 'none';
    }
    none.style.display = shown ? 'none' : 'block';
  });
</script>
</body>
</html>`;
}
