/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The walkthrough's script and its pure helpers (hds#1148): chapter captions,
 * the WebVTT captions track, terminal-panel HTML and path redaction. record.mjs
 * drives the browser; this file holds everything that can be tested without one.
 */

/** The approved script. Captions show on screen and go into the .vtt track. */
export const CHAPTERS = [
  {
    id: 'case-study',
    caption: 'HDS: one design system for one owner’s apps, built and guarded by agents.',
  },
  {
    id: 'component',
    caption:
      'Every component page is generated from the code: a live demo, the props, and the tokens behind it.',
  },
  {
    id: 'sync',
    caption:
      'One token file. Generators make the CSS and the Figma model. Sync runs one way, and a drift check proves the match.',
  },
  {
    id: 'gates',
    caption:
      'A mistake an agent makes is caught before the commit. Fix it with a named token, and the gate passes.',
  },
  {
    id: 'release',
    caption:
      'Each change carries a changeset. A reviewed merge, a Figma sync, then the release publishes only when Figma matches.',
  },
  {
    id: 'close',
    caption: 'The owner decides what. Agents decide how. Checks keep both honest.',
  },
];

const pad = (n, w = 2) => String(n).padStart(w, '0');

/** Milliseconds → WebVTT timestamp (HH:MM:SS.mmm). */
export function formatVttTime(ms) {
  const t = Math.max(0, Math.round(ms));
  const h = Math.floor(t / 3_600_000);
  const m = Math.floor((t % 3_600_000) / 60_000);
  const s = Math.floor((t % 60_000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(t % 1000, 3)}`;
}

/** Escape text for HTML (and for WebVTT cue text, which shares &, < and >). */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Cues ({ start, end, text } in ms) → a WebVTT file. */
export function buildVtt(cues) {
  const body = cues
    .filter((c) => c.end > c.start)
    .map(
      (c, i) =>
        `${i + 1}\n${formatVttTime(c.start)} --> ${formatVttTime(c.end)}\n${escapeHtml(c.text)
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")}\n`,
    )
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

/**
 * Strip machine-specific paths from captured command output, so nothing local
 * (home directory, scratch folders) reaches the video. Each entry in `files`
 * is replaced by its basename; `root` (the repo) is removed as a prefix.
 */
export function redactPaths(text, files = [], { root } = {}) {
  let out = String(text);
  const sorted = [...files].sort((a, b) => b.length - a.length);
  for (const f of sorted) {
    const base = f.split('/').pop();
    out = out.split(f).join(base);
  }
  if (root) out = out.split(`${root.replace(/\/$/, '')}/`).join('');
  return out;
}

/**
 * A full-screen "terminal" page made of labelled blocks. Lines start hidden
 * (data-line) and a small in-page script reveals them one by one, then sets
 * data-done on <body> so the recorder waits on a state, not a timer.
 *
 * @param {{ title: string, subtitle?: string, stylesheets?: string[],
 *   blocks: { label: string, command?: string, lines: string[], tone?: 'ok'|'fail'|'code' }[],
 *   lineDelayMs?: number }} opts
 */
export function terminalPanelHtml({
  title,
  subtitle = '',
  blocks,
  stylesheets = [],
  lineDelayMs = 90,
}) {
  const links = stylesheets
    .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
    .join('');
  const blockHtml = blocks
    .map((b) => {
      const cmd = b.command
        ? `<div class="wt-line wt-cmd" data-line><span class="wt-prompt">$</span> ${escapeHtml(b.command)}</div>`
        : '';
      const lines = b.lines
        .map((l) => `<div class="wt-line" data-line>${escapeHtml(l) || '&nbsp;'}</div>`)
        .join('');
      return `<section class="wt-block" data-tone="${escapeHtml(b.tone ?? 'code')}"><header class="wt-label">${escapeHtml(b.label)}</header><div class="wt-body">${cmd}${lines}</div></section>`;
    })
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${links}
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; height: 100%; }
  body {
    background: var(--primitive-color-neutral-black, #05070c);
    color: var(--primitive-color-neutral-150, #e9eaec);
    font-family: var(--hds-font-family, system-ui, sans-serif);
    display: flex; flex-direction: column; gap: 20px;
    padding: 56px 72px 150px; box-sizing: border-box;
  }
  h1 { font-family: var(--hds-font-family-display, inherit); font-size: 40px; margin: 0; letter-spacing: -0.01em; }
  .wt-sub { margin: 0; font-size: 18px; opacity: 0.7; }
  .wt-grid { display: grid; grid-template-columns: repeat(${Math.min(Math.max(blocks.length, 1), 2)}, minmax(0, 1fr)); gap: 16px; }
  .wt-block { border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; overflow: hidden; background: rgba(255,255,255,0.04); }
  .wt-label { font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); opacity: 0.75; }
  .wt-body { padding: 14px 16px; font-family: 'DejaVu Sans Mono', ui-monospace, monospace; font-size: 15px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
  .wt-line { opacity: 0; transform: translateY(2px); transition: opacity 120ms, transform 120ms; }
  .wt-line.on { opacity: 1; transform: none; }
  .wt-prompt { color: #7dd3a8; }
  .wt-cmd { color: #fff; font-weight: 600; }
  [data-tone="fail"] { border-color: rgba(248,113,113,0.55); }
  [data-tone="fail"] .wt-label { color: #fca5a5; }
  [data-tone="ok"] { border-color: rgba(74,222,128,0.5); }
  [data-tone="ok"] .wt-label { color: #86efac; }
</style></head>
<body><h1>${escapeHtml(title)}</h1>${subtitle ? `<p class="wt-sub">${escapeHtml(subtitle)}</p>` : ''}
<div class="wt-grid">${blockHtml}</div>
<script>
  (function () {
    var lines = document.querySelectorAll('[data-line]');
    var i = 0;
    function next() {
      if (i >= lines.length) { document.body.dataset.done = '1'; return; }
      lines[i++].classList.add('on');
      setTimeout(next, ${Number(lineDelayMs)});
    }
    next();
  })();
</script></body></html>`;
}
