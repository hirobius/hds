/** @internal — pure helpers for the explorations board (hirobius/hds#628). */
/**
 * The board's page chrome and the small tools both pages share: HTML escaping,
 * the `--bd-*` stylesheet, and the wrapper that turns page content into either a
 * standalone document or the Artifact page form.
 *
 * Like the preview bench's `--pv-*` variables, the chrome is deliberately NOT
 * driven by HDS tokens. The boards show screens built on HDS and on its tenant
 * overlays; if the frame around them reskinned too, you could not tell what the
 * overlay changed.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for HTML content and double- or single-quoted attributes. */
export const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

class Raw {
  constructor(text) {
    this.text = text;
  }
}

/** Mark a string as markup that is already safe. */
export const raw = (text) => new Raw(String(text));

/**
 * Tagged template that escapes every interpolated value unless it is `raw()`.
 * Arrays are joined; `null`, `undefined` and `false` print nothing. Text from a
 * run's files goes through here, so it can only ever be text.
 */
export function html(strings, ...values) {
  const part = (v) => {
    if (v === null || v === undefined || v === false) return '';
    if (v instanceof Raw) return v.text;
    if (Array.isArray(v)) return v.map(part).join('');
    return esc(v);
  };
  return raw(
    strings.reduce((out, s, i) => out + s + (i < values.length ? part(values[i]) : ''), ''),
  );
}

/** An http or https URL as a normalized string, or null for anything else (javascript:, data:, relative). */
export function safeHref(url) {
  try {
    const u = new URL(String(url).trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

/** `ops-home` -> `Ops home`. The fallback title for a screen id. */
export function humanize(slug) {
  const words = String(slug).replace(/[-_]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : words;
}

/** Bytes as a short human figure for CLI output. */
export function formatBytes(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/** The three directions of hds#628: A faithful, B ceiling, C wildcard. */
export const DIRECTIONS = {
  A: { name: 'Faithful', question: 'Is HDS enough as it is?' },
  B: { name: 'Ceiling', question: 'How far do tokens alone go?' },
  C: { name: 'Wildcard', question: 'What should HDS add?' },
};
export const LETTERS = Object.keys(DIRECTIONS);

/**
 * The six screens in the priority order of the table in hds#628. Only an
 * ordering hint for the index: a screen not listed sorts after these, by name.
 */
export const SCREEN_ORDER = [
  'standing',
  'ops-home',
  'drops-inbox',
  'pitch',
  'leads',
  'client-dashboard',
];

export function compareScreens(a, b) {
  const ia = SCREEN_ORDER.indexOf(a);
  const ib = SCREEN_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  return a.localeCompare(b);
}

export const CSS = `
/* Board chrome. Not token-driven on purpose: it must stay put while the stage reskins. */
:root {
  --bd-bg: #f5f6f8;
  --bd-surface: #ffffff;
  --bd-sunken: #eceef2;
  --bd-fg: #15171c;
  --bd-dim: #565c69;
  --bd-rule: #d9dce3;
  --bd-accent: #2f48d8;
  --bd-accent-fg: #ffffff;
  --bd-accent-soft: #e6eafc;
  --bd-warn: #8f5300;
  --bd-warn-soft: #fcf0d9;
  --bd-bad: #ad2a22;
  --bd-bad-soft: #fbe6e4;
  --bd-ok: #146c43;
  --bd-ok-soft: #e1f2e9;
  --bd-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --bd-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --bd-gutter: 16px;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bd-bg: #0f1115;
    --bd-surface: #171a20;
    --bd-sunken: #0b0c10;
    --bd-fg: #eceef3;
    --bd-dim: #a2a8b5;
    --bd-rule: #2a2f39;
    --bd-accent: #8da0ff;
    --bd-accent-fg: #0b0e1a;
    --bd-accent-soft: #1b2142;
    --bd-warn: #f0b45a;
    --bd-warn-soft: #2b2111;
    --bd-bad: #ff8f86;
    --bd-bad-soft: #2d1514;
    --bd-ok: #5fd39a;
    --bd-ok-soft: #112419;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bd-bg: #0f1115;
  --bd-surface: #171a20;
  --bd-sunken: #0b0c10;
  --bd-fg: #eceef3;
  --bd-dim: #a2a8b5;
  --bd-rule: #2a2f39;
  --bd-accent: #8da0ff;
  --bd-accent-fg: #0b0e1a;
  --bd-accent-soft: #1b2142;
  --bd-warn: #f0b45a;
  --bd-warn-soft: #2b2111;
  --bd-bad: #ff8f86;
  --bd-bad-soft: #2d1514;
  --bd-ok: #5fd39a;
  --bd-ok-soft: #112419;
  color-scheme: dark;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
img { max-width: 100%; }
body {
  margin: 0;
  background: var(--bd-bg);
  color: var(--bd-fg);
  font: 15px/1.55 var(--bd-sans);
  -webkit-font-smoothing: antialiased;
}
a { color: var(--bd-accent); text-underline-offset: 2px; }
code { font: 0.9em var(--bd-mono); background: var(--bd-sunken); padding: 1px 5px; border-radius: 4px; overflow-wrap: anywhere; }
:focus-visible { outline: 2px solid var(--bd-accent); outline-offset: 2px; }

.bd { max-width: 96rem; margin-inline: auto; padding-block: 32px 96px; padding-inline: var(--bd-gutter); }
.bd-head { display: grid; gap: 8px; margin-bottom: 24px; }
.bd-eyebrow { margin: 0; font: 600 12px/1.2 var(--bd-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--bd-dim); }
.bd-head h1 { margin: 0; font-size: clamp(26px, 4vw, 34px); line-height: 1.1; letter-spacing: -0.02em; text-wrap: balance; }
.bd-sub { margin: 0; color: var(--bd-dim); font-size: 14px; }
.bd h2 { margin: 0; font-size: 20px; line-height: 1.25; }
.bd h3 { margin: 0; font: 600 12px/1.3 var(--bd-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--bd-dim); }

.bd-problems { margin: 0 0 24px; padding: 16px; background: var(--bd-warn-soft); color: var(--bd-warn); border-block: 1px solid var(--bd-warn); }
.bd-problems h2 { font-size: 15px; margin-bottom: 8px; color: inherit; }
.bd-problems ul { margin: 0; padding-left: 20px; display: grid; gap: 4px; font-size: 14px; overflow-wrap: anywhere; }

/* controls */
.bd-controls { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; margin-inline: calc(var(--bd-gutter) * -1); padding: 12px var(--bd-gutter); background: var(--bd-bg); border-bottom: 1px solid var(--bd-rule); }
.bd-ctl { display: flex; align-items: center; gap: 8px; }
.bd-ctl > span, .bd-ctl legend { font: 600 12px/1 var(--bd-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--bd-dim); padding: 0; }
.seg { display: inline-flex; border: 1px solid var(--bd-rule); border-radius: 6px; overflow: hidden; background: var(--bd-surface); }
.seg button { font: 500 14px/1 var(--bd-sans); min-height: 36px; padding: 0 14px; border: 0; border-left: 1px solid var(--bd-rule); background: transparent; color: var(--bd-fg); cursor: pointer; }
.seg button:first-child { border-left: 0; }
.seg button[aria-pressed="true"] { background: var(--bd-accent); color: var(--bd-accent-fg); }
.bd-check { display: none; align-items: center; gap: 8px; font-size: 14px; min-height: 36px; }
@media (min-width: 62rem) { .bd-check { display: inline-flex; } }
.bd-check input { width: 16px; height: 16px; accent-color: var(--bd-accent); }

/* pick: one compact row so the screenshots stay near the top */
.bd-pick { margin-block: 16px 24px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; }
.bd-pick fieldset { margin: 0; padding: 0; border: 0; display: flex; flex-wrap: wrap; gap: 4px 20px; align-items: center; min-width: 0; }
.bd-pick legend { float: left; padding: 0; margin-right: 20px; font: 600 12px/36px var(--bd-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--bd-dim); }
.bd-pick label.opt { display: inline-flex; align-items: center; gap: 8px; min-height: 36px; cursor: pointer; font-size: 15px; }
.bd-pick input[type="radio"] { width: 18px; height: 18px; accent-color: var(--bd-accent); }
.bd-pick-row { flex: 1 1 24rem; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; min-width: 0; }
.bd-pick textarea { flex: 1 1 14rem; min-width: 0; height: 40px; min-height: 40px; padding: 9px 10px; font: 16px/1.3 var(--bd-sans); color: var(--bd-fg); background: var(--bd-surface); border: 1px solid var(--bd-rule); border-radius: 6px; resize: vertical; }
.btn { font: 600 14px/1 var(--bd-sans); min-height: 40px; padding: 0 18px; border-radius: 6px; border: 1px solid var(--bd-accent); background: var(--bd-accent); color: var(--bd-accent-fg); cursor: pointer; white-space: nowrap; }
.btn[disabled] { background: var(--bd-sunken); border-color: var(--bd-rule); color: var(--bd-dim); cursor: not-allowed; }
.bd-status { margin: 0; font-size: 14px; color: var(--bd-dim); }
.bd-status:empty { display: none; }
.bd-pick .bd-status { flex-basis: 100%; }
.bd-status[data-tone="ok"] { color: var(--bd-ok); }
.bd-status[data-tone="warn"] { color: var(--bd-warn); }
.bd-status[data-tone="bad"] { color: var(--bd-bad); }

/* directions */
.bd-dirs { display: grid; gap: 40px 24px; grid-template-columns: minmax(0, 1fr); align-items: start; }
@media (min-width: 62rem) { .bd-dirs { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.dir { min-width: 0; display: grid; gap: 12px; }
.dir-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 4px 12px; align-items: center; }
.dir-letter { grid-row: span 2; width: 36px; height: 36px; display: grid; place-items: center; font: 700 16px/1 var(--bd-mono); border: 1px solid var(--bd-rule); border-radius: 6px; background: var(--bd-surface); }
.dir[data-picked="true"] .dir-letter { background: var(--bd-accent); border-color: var(--bd-accent); color: var(--bd-accent-fg); }
.dir-head h2 { font-size: 20px; }
.dir-q { grid-column: 2; margin: 0; font-size: 13px; color: var(--bd-dim); }
.dir-meta { grid-column: 1 / -1; margin: 0; font: 12px/1.4 var(--bd-mono); color: var(--bd-dim); overflow-wrap: anywhere; }
.score-pill { grid-row: 1; grid-column: 3; font: 600 14px/1 var(--bd-mono); padding: 6px 10px; border: 1px solid var(--bd-rule); border-radius: 999px; background: var(--bd-surface); white-space: nowrap; }
.score-pill[data-state="none"] { color: var(--bd-dim); font-weight: 500; }
.dir-pickmark { display: none; }
.dir[data-picked="true"] .dir-pickmark { display: inline; font: 600 12px/1 var(--bd-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--bd-accent); }

.frame { max-height: min(80vh, 64rem); overflow: auto; border: 1px solid var(--bd-rule); border-radius: 6px; background: var(--bd-sunken); padding: 12px; }
.frame:focus-visible { outline-offset: 0; }
.shot { margin: 0; display: grid; gap: 8px; }
[data-board][data-theme="light"] .shot[data-theme="dark"],
[data-board][data-theme="dark"] .shot[data-theme="light"],
[data-board][data-vp="1280"] .shot[data-vp="390"],
[data-board][data-vp="390"] .shot[data-vp="1280"] { display: none; }
.shot-btn { display: block; width: 100%; padding: 0; margin: 0; border: 0; background: none; cursor: zoom-in; }
.shot-img { display: block; width: 100%; height: auto; border: 1px solid var(--bd-rule); background: var(--bd-surface); }
.shot[data-vp="1280"] .shot-img { max-width: 80rem; }
.shot[data-vp="390"] .shot-btn { max-width: 24.375rem; margin-inline: auto; }
.shot-cap { font: 12px/1.3 var(--bd-mono); color: var(--bd-dim); }
.missing-tile { min-height: 12rem; display: grid; place-content: center; gap: 6px; text-align: center; padding: 24px 16px; border: 2px dashed var(--bd-warn); background: var(--bd-warn-soft); color: var(--bd-warn); border-radius: 4px; }
.missing-tile strong { font-size: 18px; }
.missing-tile code { background: transparent; color: inherit; padding: 0; font-size: 13px; }
.missing-tile span { font-size: 13px; overflow-wrap: anywhere; }
.dir-absent { min-height: 16rem; display: grid; place-content: center; gap: 6px; text-align: center; padding: 24px 16px; border: 2px dashed var(--bd-rule); color: var(--bd-dim); border-radius: 6px; }
.dir-absent strong { font-size: 18px; color: var(--bd-fg); }

/* panel */
.panel { display: grid; gap: 20px; padding-top: 4px; }
.panel-sec { display: grid; gap: 8px; min-width: 0; }
.panel p { margin: 0; overflow-wrap: anywhere; }
.panel ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 12px; }
.panel li { min-width: 0; overflow-wrap: anywhere; }
.score { display: flex; align-items: baseline; gap: 4px; font: 700 28px/1 var(--bd-mono); font-variant-numeric: tabular-nums; }
.score small { font: 500 14px/1 var(--bd-mono); color: var(--bd-dim); }
.notes { padding-left: 18px !important; list-style: disc !important; gap: 6px !important; font-size: 14px; }
.note { margin: 0; padding: 8px 12px; border-left: 2px solid var(--bd-rule); color: var(--bd-dim); font-size: 14px; }
details.panel-sec > summary { cursor: pointer; font: 600 12px/1.3 var(--bd-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--bd-dim); min-height: 28px; display: flex; align-items: center; gap: 8px; }
details.panel-sec[open] > summary { margin-bottom: 8px; }
.count { font: 600 12px/1 var(--bd-mono); padding: 3px 7px; border-radius: 999px; background: var(--bd-sunken); color: var(--bd-fg); letter-spacing: 0; }
.kind { display: inline-block; font: 600 11px/1 var(--bd-mono); letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 7px; border-radius: 3px; background: var(--bd-sunken); color: var(--bd-dim); margin-right: 6px; vertical-align: 1px; }
.kind[data-kind="design-rule"], .kind[data-kind="rule"] { background: var(--bd-warn-soft); color: var(--bd-warn); }
.kv { display: grid; gap: 2px; font-size: 14px; }
.kv b { font-weight: 600; }
.kv span { color: var(--bd-dim); }
.empty { color: var(--bd-dim); font-size: 14px; }
.empty[data-tone="warn"] { color: var(--bd-warn); }

/* lightbox */
.lightbox { position: fixed; inset: 0; z-index: 20; display: grid; grid-template-rows: auto minmax(0, 1fr); background: var(--bd-bg); padding-top: env(safe-area-inset-top, 0px); }
.lightbox-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px var(--bd-gutter); border-bottom: 1px solid var(--bd-rule); font: 13px/1.3 var(--bd-mono); color: var(--bd-dim); }
.lightbox-bar button { font: 600 14px/1 var(--bd-sans); min-height: 36px; padding: 0 14px; border: 1px solid var(--bd-rule); border-radius: 6px; background: var(--bd-surface); color: var(--bd-fg); cursor: pointer; }
.lightbox-scroll { overflow: auto; padding: 16px var(--bd-gutter) calc(16px + env(safe-area-inset-bottom, 0px)); }
.lightbox-scroll img { display: block; max-width: none; height: auto; margin-inline: auto; border: 1px solid var(--bd-rule); background: var(--bd-surface); }

/* index */
.idx-boards { list-style: none; margin: 0 0 40px; padding: 0; }
.idx-board { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px 24px; align-items: center; padding-block: 16px; border-top: 1px solid var(--bd-rule); }
.idx-board:last-child { border-bottom: 1px solid var(--bd-rule); }
.idx-board h3 { font: 600 17px/1.3 var(--bd-sans); letter-spacing: 0; text-transform: none; color: var(--bd-fg); }
.idx-id { font: 12px/1.4 var(--bd-mono); color: var(--bd-dim); }
.chips { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; }
.chip { font: 13px/1 var(--bd-mono); padding: 7px 10px; border: 1px solid var(--bd-rule); border-radius: 999px; background: var(--bd-surface); white-space: nowrap; }
.chip[data-state="absent"] { color: var(--bd-dim); border-style: dashed; background: transparent; }
.idx-open { font-weight: 600; white-space: nowrap; }
.table-scroll { overflow-x: auto; border-block: 1px solid var(--bd-rule); }
.gap-table { width: 100%; min-width: 58rem; border-collapse: collapse; font-size: 14px; }
.gap-table th { text-align: left; font: 600 12px/1.3 var(--bd-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--bd-dim); padding: 10px 12px; border-bottom: 1px solid var(--bd-rule); white-space: nowrap; }
.gap-table td { vertical-align: top; padding: 14px 12px; border-top: 1px solid var(--bd-rule); overflow-wrap: anywhere; min-width: 0; }
.gap-table tbody tr:first-child td { border-top: 0; }
.gap-table td[data-col="rank"] { font: 700 16px/1.3 var(--bd-mono); font-variant-numeric: tabular-nums; width: 3rem; }
.gap-table td[data-col="screens"] { min-width: 11rem; }
.gap-table td[data-col="proposal"] { min-width: 14rem; }
.gap-table td[data-col="decision"] { white-space: nowrap; }
.gap-table tr[data-decision="accept"] td { background: var(--bd-ok-soft); }
.gap-table tr[data-decision="reject"] td { background: var(--bd-bad-soft); }
.gap-need { font-weight: 600; margin-bottom: 4px; }
.gap-meta { font: 12px/1.4 var(--bd-mono); color: var(--bd-dim); }
.hits { display: flex; gap: 6px; font: 12px/1 var(--bd-mono); color: var(--bd-dim); margin-top: 6px; }
.gap-empty { padding: 24px 0; color: var(--bd-dim); }
.gap-table details { margin-top: 8px; }
.gap-table summary { cursor: pointer; font-size: 13px; color: var(--bd-dim); }
.gap-table details ul { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 6px; }
.bd-sum { margin: 0 0 12px; color: var(--bd-dim); font-size: 14px; }

@media (max-width: 40rem) {
  .bd { padding-block: 24px 72px; }
  .bd-controls { gap: 8px 16px; }
  /* the control names stay for assistive tech; the buttons say enough on a phone */
  .bd-ctl > span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .idx-board { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; transition: none !important; animation: none !important; } }
`;

/**
 * Wrap page content. `document` is a standalone HTML file that opens anywhere;
 * `artifact` is the page-content form the Artifact tool wraps in its own
 * skeleton at publish time (title and style first, no document tags).
 */
export function wrapPage({ title, body, form = 'document' }) {
  if (form !== 'document' && form !== 'artifact') {
    throw new Error(`form must be "document" or "artifact", got "${form}"`);
  }
  const head = `<title>${esc(title)}</title>\n<style>${CSS}</style>`;
  if (form === 'artifact') return `${head}\n${body}\n`;
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
    head,
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}
