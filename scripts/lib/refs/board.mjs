/** @internal — pure helpers for the design-refs pipeline (eval/refs/README.md). */
/**
 * The review board: one private Artifact page, one card per open proposal,
 * built for a phone. Adrian taps Approve, Reject (with a reason) or Defer; the
 * page stores the tap in the Artifact's database (collection `decisions`, one
 * document per proposal id: { decision, reason, decidedAt }), and the nightly
 * run copies new taps into eval/refs/decisions.json.
 *
 * Images are inlined as data URIs (the original, the rebuild before, the
 * rebuild after the change). The originals are not in the repository; they
 * reach this page only because the page is private to Adrian.
 *
 * The page renders complete with no database: decisions already in the
 * history show as decided, and the buttons say they cannot save.
 *
 *   buildReviewBoard({ generatedAt, threshold, refTotal, proposals, decided, logged }) -> html
 */
import { esc, html, raw } from '../explorations/board-chrome.mjs';
import { benefitSummary } from './proposal.mjs';

/** Rules declared with the page: everyone it is shared with reads; only Adrian (and editors) decide. */
export const BOARD_CAPABILITIES = {
  db: { rules: [{ path: '', read: 'view', write: 'admin' }] },
  user: {},
};

const RECOMMEND = { adopt: 'Adopt', 'adopt-modified': 'Adopt modified', reject: 'Reject' };
const DECIDED = { approve: 'Approved', reject: 'Rejected', defer: 'Deferred' };

const CSS = `
/* Layout: one reading column of proposal bands, divided by rules, a sticky summary on top. */
:root {
  --paper: #fafafa;
  --ink: #18171a;
  --ink-2: #5a5760;
  --rule: #e2e0e4;
  --well: #f0eff1;
  --accent: #433a3f;
  --on-accent: #ffffff;
  --ok: #17663f;
  --warn: #8a5300;
  --bad: #a3271f;
  --ok-wash: #e3f1e9;
  --warn-wash: #f9eedb;
  --bad-wash: #f8e5e3;
  --sans: "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #121113; --ink: #eeedf0; --ink-2: #a9a6ae; --rule: #2c2a2f; --well: #1b1a1d;
    --accent: #d9d3d6; --on-accent: #161416; --ok: #6fd39e; --warn: #f0b75e; --bad: #ff8d84;
    --ok-wash: #12261b; --warn-wash: #2a2010; --bad-wash: #2c1513; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --paper: #121113; --ink: #eeedf0; --ink-2: #a9a6ae; --rule: #2c2a2f; --well: #1b1a1d;
  --accent: #d9d3d6; --on-accent: #161416; --ok: #6fd39e; --warn: #f0b75e; --bad: #ff8d84;
  --ok-wash: #12261b; --warn-wash: #2a2010; --bad-wash: #2c1513; color-scheme: dark;
}
* { box-sizing: border-box; }
body { background: var(--paper); color: var(--ink); font: 15px/1.55 var(--sans); -webkit-font-smoothing: antialiased; }
.wrap { max-width: 46rem; margin-inline: auto; padding-block: 24px 96px;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
h1, h2, h3 { margin: 0; text-wrap: balance; }
h1 { font-size: 26px; line-height: 1.15; letter-spacing: -0.02em; }
h2 { font-size: 20px; line-height: 1.25; letter-spacing: -0.01em; }
h3 { font-size: 13px; font-weight: 600; color: var(--ink-2); }
p { margin: 0; }
code, pre { font-family: var(--mono); font-size: 12.5px; }
code { background: var(--well); padding: 1px 5px; border-radius: 4px; overflow-wrap: anywhere; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.muted { color: var(--ink-2); }
.head { display: grid; gap: 6px; padding-bottom: 16px; border-bottom: 1px solid var(--rule); }
.tally { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 13px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
.tally strong { color: var(--ink); }
.status { font-size: 13px; color: var(--ink-2); min-height: 1.4em; }
.status[data-tone="bad"] { color: var(--bad); }
.prop { display: grid; gap: 14px; padding-block: 24px; border-bottom: 1px solid var(--rule); }
.prop-top { display: grid; gap: 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: var(--well); color: var(--ink-2); }
.chip[data-tone="ok"] { background: var(--ok-wash); color: var(--ok); }
.chip[data-tone="warn"] { background: var(--warn-wash); color: var(--warn); }
.chip[data-tone="bad"] { background: var(--bad-wash); color: var(--bad); }
.facts { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 14px; margin: 0; font-size: 14px; }
.facts dt { color: var(--ink-2); font-size: 13px; padding-top: 1px; }
.facts dd { margin: 0; min-width: 0; }
.gain { font-variant-numeric: tabular-nums; font-weight: 600; }
.diff { margin: 0; padding: 12px; background: var(--well); border-radius: 8px; overflow-x: auto; white-space: pre; line-height: 1.5; }
.strip { display: grid; gap: 12px; }
.ev { display: grid; gap: 6px; }
.ev-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.shot { display: grid; gap: 4px; margin: 0; }
.shot img, .shot .missing { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; object-position: top; border-radius: 6px; background: var(--well); display: block; }
.shot .missing { display: grid; place-items: center; font-size: 12px; color: var(--ink-2); text-align: center; padding: 8px; }
.shot figcaption { font-size: 12px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
.decide { display: grid; gap: 10px; padding: 14px; background: var(--well); border-radius: 10px; }
.btns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.btn { font: 600 15px/1 var(--sans); min-height: 44px; border-radius: 8px; border: 1px solid var(--rule); background: var(--paper); color: var(--ink); cursor: pointer; }
.btn[aria-pressed="true"] { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
label { font-size: 13px; color: var(--ink-2); }
textarea { width: 100%; min-height: 64px; font: 14px/1.4 var(--sans); padding: 8px 10px; border-radius: 8px; border: 1px solid var(--rule); background: var(--paper); color: var(--ink); resize: vertical; }
details { border-top: 1px solid var(--rule); padding-block: 16px; }
summary { cursor: pointer; font-weight: 600; }
.list { margin: 12px 0 0; padding: 0; list-style: none; display: grid; gap: 10px; font-size: 14px; }
.list li { display: grid; gap: 2px; }
.empty { padding-block: 32px; display: grid; gap: 6px; }
@media (max-width: 30rem) { .facts { grid-template-columns: minmax(0, 1fr); gap: 2px 0; } .facts dd { margin-bottom: 8px; } }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;

const SCRIPT = `(function () {
  'use strict';
  var props = Array.prototype.slice.call(document.querySelectorAll('[data-prop]'));
  var status = document.getElementById('board-status');
  var tally = document.getElementById('board-open');
  var db = null;
  function say(text, tone) {
    status.textContent = text;
    if (tone) status.setAttribute('data-tone', tone); else status.removeAttribute('data-tone');
  }
  function show(card, state) {
    var decision = state && state.decision;
    card.setAttribute('data-decision', decision || '');
    card.querySelectorAll('[data-decide]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-decide') === decision));
    });
    var note = card.querySelector('[data-saved]');
    note.textContent = decision ? ({ approve: 'Approved', reject: 'Rejected', defer: 'Deferred' })[decision] + ' and saved. The next nightly run acts on it.' : 'Not decided yet.';
    var reason = card.querySelector('textarea');
    if (state && typeof state.reason === 'string' && document.activeElement !== reason) reason.value = state.reason;
  }
  function count() {
    var open = props.filter(function (c) { return !c.getAttribute('data-decision'); }).length;
    tally.textContent = String(open);
  }
  function enable(on) {
    props.forEach(function (card) {
      card.querySelectorAll('[data-decide], textarea').forEach(function (el) { el.disabled = !on; });
    });
  }
  props.forEach(function (card) {
    var id = card.getAttribute('data-prop');
    var reason = card.querySelector('textarea');
    var warn = card.querySelector('[data-reason-warn]');
    card.querySelectorAll('[data-decide]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!db) return;
        var which = btn.getAttribute('data-decide');
        var current = card.getAttribute('data-decision');
        var text = reason.value.trim();
        if (which === 'reject' && current !== 'reject' && !text) {
          warn.hidden = false;
          reason.focus();
          return;
        }
        warn.hidden = true;
        var ref = db.collection('decisions').doc(id);
        var write = current === which
          ? ref.delete()
          : ref.set({ decision: which, reason: text, decidedAt: new Date().toISOString() });
        say('Saving\\u2026');
        write.then(function () { say('Saved.'); }, function (e) {
          say('Not saved: ' + ((e && e.message) || 'the store refused the write') + '. Try again, or tell Claude in the session.', 'bad');
        });
      });
    });
  });
  enable(false);
  count();
  var use = window.claude && window.claude.use;
  if (!use) { say('Open this page in Claude to record decisions.'); return; }
  Promise.all([use('db'), use('user')]).then(function (got) {
    db = got[0];
    var user = got[1];
    if (!db) { say('Decisions cannot be saved in this view. Open the page in Claude while signed in.'); return; }
    var canEdit = user && user.canEdit ? user.canEdit() : true;
    Promise.resolve(canEdit).then(function (ok) {
      if (ok === false) { say('You can read this board. Only Adrian records decisions.'); return; }
      enable(true);
      say('');
    });
    db.collection('decisions').onSnapshot(function (snap) {
      var byId = {};
      snap.docs.forEach(function (d) { byId[d.id] = d.data(); });
      props.forEach(function (card) { show(card, byId[card.getAttribute('data-prop')]); });
      count();
    }, function (e) { say('Lost the connection to the decision store (' + e.code + '). Reload the page.', 'bad'); });
  });
})();`;

function tone(level) {
  return { none: 'ok', low: 'ok', medium: 'warn', high: 'bad' }[level] ?? null;
}

function shot(label, uri, caption) {
  return html`<figure class="shot">
    ${uri
      ? html`<img src="${uri}" alt="${label}" loading="lazy" />`
      : html`<div class="missing">${label}: not captured</div>`}
    <figcaption>${caption}</figcaption>
  </figure>`;
}

function evidence(p, images, refMeta) {
  const rows = p.benefit?.perRef ?? [];
  const score = Object.fromEntries(rows.map((r) => [r.ref, r]));
  return [...new Set(p.evidence.refs)].map((ref) => {
    const img = images?.[ref] ?? {};
    const s = score[ref] ?? {};
    const meta = refMeta?.[ref];
    return html`<div class="ev">
      <h3>
        ${meta?.title ?? ref} <span class="muted">· ${meta?.surface ?? 'unknown surface'}</span>
      </h3>
      <div class="ev-row">
        ${shot('Original', img.source, 'Original')}
        ${shot('Rebuild now', img.before, `Now ${s.before ?? '?'}`)}
        ${shot(
          'With the change',
          img.after,
          s.after === null || s.after === undefined ? 'After: not rebuilt' : `After ${s.after}`,
        )}
      </div>
    </div>`;
  });
}

function card({ proposal: p, candidate, images, refMeta }) {
  const b = benefitSummary(p.benefit?.perRef ?? []);
  const gain =
    b.gain === null
      ? 'not measured'
      : `${b.before} → ${b.after} (${b.gain >= 0 ? '+' : ''}${b.gain})`;
  const id = `reason-${p.id}`;
  return html`<article class="prop" data-prop="${p.id}" id="p-${p.id}">
    <div class="prop-top">
      <div class="chips">
        <span class="chip" data-tone="${p.recommendation === 'reject' ? 'bad' : 'ok'}"
          >Recommends: ${RECOMMEND[p.recommendation] ?? p.recommendation}</span
        >
        <span class="chip">${p.kind}</span>
        <span class="chip">${p.evidence.refs.length} refs</span>
        ${candidate?.state === 'resurfaced'
          ? html`<span class="chip" data-tone="warn">Back after a defer</span>`
          : ''}
        ${candidate?.driftRisk
          ? html`<span class="chip" data-tone="warn">Evidence is not app or dashboard UI</span>`
          : ''}
      </div>
      <h2>${p.title}</h2>
      <p class="muted">${p.rationale}</p>
    </div>
    <dl class="facts">
      <dt>Change</dt>
      <dd>${p.change.summary}</dd>
      ${p.modified
        ? html`<dt>Modified</dt>
            <dd>${p.modified}</dd>`
        : ''}
      <dt>Benefit</dt>
      <dd>
        <span class="gain">${gain}</span>
        <span class="muted">mean fidelity over ${b.measured} ref${b.measured === 1 ? '' : 's'}</span
        ><br />${p.benefit.summary}
      </dd>
      <dt>Blast radius</dt>
      <dd>
        <span class="chip" data-tone="${tone(p.blastRadius.level)}">${p.blastRadius.level}</span>
        ${p.blastRadius.summary}${p.blastRadius.components.length
          ? html`<br /><span class="muted"
                >Components: ${p.blastRadius.components.join(', ')}</span
              >`
          : ''}<br /><span class="muted">Existing pages: ${p.blastRadius.visualDiff}</span>
      </dd>
      <dt>Consistency</dt>
      <dd>
        <span class="chip" data-tone="${tone(p.consistencyRisk.level)}"
          >${p.consistencyRisk.level} risk</span
        >
        ${p.consistencyRisk.summary}
      </dd>
    </dl>
    <pre class="diff">${p.change.diff}</pre>
    <div class="strip">${evidence(p, images, refMeta)}</div>
    <div class="decide">
      <div class="btns" role="group" aria-label="Decision on ${p.title}">
        <button type="button" class="btn" data-decide="approve" aria-pressed="false">
          Approve
        </button>
        <button type="button" class="btn" data-decide="reject" aria-pressed="false">Reject</button>
        <button type="button" class="btn" data-decide="defer" aria-pressed="false">Defer</button>
      </div>
      <label for="${id}">Reason (needed to reject, so it is not proposed again)</label>
      <textarea id="${id}" placeholder="e.g. we want tighter sections, not bigger ones"></textarea>
      <p class="status" data-reason-warn hidden data-tone="bad">Add a reason before rejecting.</p>
      <p class="status" data-saved>Not decided yet.</p>
    </div>
  </article>`;
}

/**
 * @param {{ generatedAt:string, threshold:number, refTotal:number,
 *   proposals:{ proposal:object, candidate:object|null, images:Record<string,{source?:string,before?:string,after?:string}>, refMeta:Record<string,{title:string,surface:string}> }[],
 *   decided:{ proposal:string, decision:string, at:string, reason?:string, pr?:string }[],
 *   logged:{ id:string, kind:string, refCount:number, needed:string }[] }} input
 * @returns {string} page content in the Artifact form (title and style first)
 */
export function buildReviewBoard({ generatedAt, threshold, refTotal, proposals, decided, logged }) {
  const body = html`<main class="wrap">
  <header class="head">
    <h1>Design refs review</h1>
    <p class="tally"><span><strong id="board-open">${proposals.length}</strong> open</span><span>${refTotal} refs</span><span>a gap needs ${threshold}+ refs</span><span>built ${generatedAt}</span></p>
    <p class="status" id="board-status" aria-live="polite"></p>
  </header>
  ${
    proposals.length
      ? proposals.map(card)
      : html`<section class="empty">
          <h2>Nothing to review</h2>
          <p class="muted">
            No gap has reached ${threshold} refs yet. Save more images to Drive "Design Refs"; the
            nightly run rebuilds each one and proposes a change once a gap recurs.
          </p>
        </section>`
  }
  <details${decided.length ? '' : raw(' hidden')}>
    <summary>Decided (${decided.length})</summary>
    <ul class="list">${decided.map(
      (d) =>
        html`<li>
          <span
            ><strong>${DECIDED[d.decision] ?? d.decision}</strong> <code>${d.proposal}</code>
            <span class="muted">${d.at}</span></span
          >${d.reason ? html`<span class="muted">${d.reason}</span>` : ''}${d.pr
            ? html`<a href="${d.pr}">Pull request</a>`
            : ''}
        </li>`,
    )}</ul>
  </details>
  <details${logged.length ? '' : raw(' hidden')}>
    <summary>Logged, below the threshold (${logged.length})</summary>
    <ul class="list">${logged.map(
      (g) =>
        html`<li>
          <span
            ><code>${g.id}</code>
            <span class="muted">${g.kind} · ${g.refCount} of ${threshold} refs</span></span
          ><span class="muted">${g.needed}</span>
        </li>`,
    )}</ul>
  </details>
</main>
<script>${raw(SCRIPT)}</script>`;
  return [
    `<title>${esc('Design Refs Review')}</title>`,
    '<meta name="claude:viewport-fit-sides" content="cover">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap">',
    `<style>${CSS}</style>`,
    body.text,
    '',
  ].join('\n');
}
