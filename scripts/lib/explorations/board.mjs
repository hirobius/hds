/** @internal — the explorations board for one screen (hirobius/hds#628). */
/**
 * Turn one screen's run directory into ONE self-contained HTML file: the three
 * directions side by side, tabs for theme and viewport, a side panel per
 * direction (rationale, 21st references, bend log, review score) and every
 * screenshot inlined as a data URI.
 *
 *   buildBoard({ runDir, screen, out })
 *
 * The page never shows a blank: a screenshot that is absent or unreadable is a
 * visible "missing" tile, an absent panel file is a visible note, and a file
 * that is not valid JSON is named on the page and in `problems`.
 *
 * The page carries two hooks for the orchestrator to wire to Artifact data
 * storage: `recordPick(screen, pick)` (a no-op until it is wired) and
 * `hdsBoard.setPick(pick)` (to show a stored pick). See the marked script.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  LETTERS,
  DIRECTIONS,
  esc,
  formatBytes,
  html,
  humanize,
  raw,
  safeHref,
  wrapPage,
} from './board-chrome.mjs';
import { fitImages } from './board-images.mjs';
import { THEMES, VIEWPORTS, expandRunDirs, readScreenRun } from './board-run.mjs';

/** Under the 16 MB Artifact page limit, with room for the page itself. */
export const DEFAULT_BUDGET_BYTES = 12 * 1024 * 1024;
export const PAGE_LIMIT_BYTES = 16 * 1000 * 1000;
// Slack for what the first render cannot know: a "scaled to N%" caption per image and the data URI prefixes.
const SAFETY_BYTES = 4096;

const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/* ---------- reading the files into what the panel shows ---------- */

function refsView(file) {
  if (file.state !== 'ok') return { state: file.state, error: file.error, problems: [] };
  const v = file.value;
  if (!isObject(v)) return { state: 'bad', problems: ['must be an object'] };
  const problems = [];
  const searches = [];
  const links = [];
  if (v.searches !== undefined && !Array.isArray(v.searches))
    problems.push('searches must be an array');
  (Array.isArray(v.searches) ? v.searches : []).forEach((s, i) => {
    if (!isObject(s) || !isText(s.query)) return problems.push(`search ${i + 1} needs a query`);
    searches.push({
      tool: isText(s.tool) ? s.tool : 'search',
      query: s.query,
      reason: isText(s.reason) ? s.reason : '',
    });
  });
  if (v.refs !== undefined && !Array.isArray(v.refs)) problems.push('refs must be an array');
  (Array.isArray(v.refs) ? v.refs : []).forEach((r, i) => {
    if (!isObject(r)) return problems.push(`ref ${i + 1} must be an object`);
    const href = safeHref(r.url);
    if (!href) problems.push(`ref ${i + 1} has no http(s) URL`);
    links.push({ url: isText(r.url) ? r.url : '', href, took: isText(r.took) ? r.took : '' });
  });
  const tenant = isText(v.tenant) ? v.tenant : null;
  return { state: 'ok', tenant, searches, links, problems };
}

function reviewView(file) {
  if (file.state !== 'ok') return { state: file.state, error: file.error, problems: [] };
  const v = file.value;
  if (!isObject(v)) return { state: 'bad', problems: ['must be an object'] };
  const problems = [];
  const hasScore = (typeof v.score === 'number' && Number.isFinite(v.score)) || isText(v.score);
  if (!hasScore) problems.push('has no score');
  const max = typeof v.max === 'number' && Number.isFinite(v.max) ? v.max : null;
  const notes = [];
  const rawNotes = Array.isArray(v.notes) ? v.notes : v.notes === undefined ? [] : [v.notes];
  for (const n of rawNotes) {
    if (isText(n)) notes.push(n);
    else if (isObject(n)) {
      const t = Object.values(n).filter(isText).join(' · ');
      if (t) notes.push(t);
    }
  }
  return {
    state: 'ok',
    score: hasScore ? String(v.score) : null,
    max,
    notes,
    asList: Array.isArray(v.notes),
    problems,
  };
}

function bendsView(file) {
  if (file.state !== 'ok') return { state: file.state, error: file.error, problems: [] };
  if (!Array.isArray(file.value))
    return { state: 'bad', problems: ['must be an array (use [] for none)'] };
  const problems = [];
  const bends = [];
  file.value.forEach((b, i) => {
    if (!isObject(b)) return problems.push(`bend ${i + 1} must be an object`);
    bends.push({
      kind: isText(b.kind) ? b.kind : 'bend',
      rule: isText(b.rule) ? b.rule : '',
      file: isText(b.file) ? b.file : '',
      match: isText(b.match) ? b.match : '',
      why: isText(b.why) ? b.why : '',
      change: isText(b.change) ? b.change : '',
    });
  });
  return { state: 'ok', bends, problems };
}

function gapsView(file) {
  if (file.state !== 'ok') return { state: file.state, error: file.error, problems: [] };
  if (!Array.isArray(file.value))
    return { state: 'bad', problems: ['must be an array (use [] for none)'] };
  const problems = [];
  const gaps = [];
  file.value.forEach((g, i) => {
    if (!isObject(g) || !isText(g.needed)) return problems.push(`gap ${i + 1} needs a "needed"`);
    const t = (k) => (isText(g[k]) ? g[k] : '');
    gaps.push({
      id: t('id'),
      kind: t('kind') || 'gap',
      needed: g.needed,
      didInstead: t('didInstead'),
      proposal: t('proposal'),
      evidence: t('evidence'),
    });
  });
  return { state: 'ok', gaps, problems };
}

/** Everything a direction's panel needs, and every problem found with its files. */
function readView(d) {
  const view = { d, problems: [] };
  const add = (file, msg) => view.problems.push(`${d.id}/${file} ${msg}`);
  const state = (name, file, required = true) => {
    if (file.state === 'invalid') add(name, `is not valid JSON (${file.error})`);
    else if (file.state === 'missing' && required) add(name, 'is missing');
  };

  if (d.rationale.state === 'missing') add('rationale.md', 'is missing');
  if (d.rationale.state === 'empty') add('rationale.md', 'is empty');

  view.refs = refsView(d.refs);
  state('refs.json', d.refs);
  view.refs.problems.forEach((p) => add('refs.json', p));
  if (view.refs.state === 'bad') add('refs.json', view.refs.problems[0]);

  view.review = reviewView(d.review);
  state('review.json', d.review, false); // a review comes after the build, so none yet is not a problem
  view.review.problems.forEach((p) => add('review.json', p));

  view.bends = bendsView(d.bends);
  state('bend-log.json', d.bends, d.letter === 'C');
  view.bends.problems.forEach((p) => add('bend-log.json', p));

  view.gaps = gapsView(d.gaps);
  state('gaps.json', d.gaps);
  view.gaps.problems.forEach((p) => add('gaps.json', p));

  for (const s of d.shots) {
    if (s.state === 'missing') view.problems.push(`${s.rel} is missing`);
    if (s.state === 'unreadable') view.problems.push(`${s.rel} is not a readable PNG`);
  }
  return view;
}

/* ---------- markup ---------- */

const label = (letter) => `${letter} ${DIRECTIONS[letter].name}`;

function scoreText(review) {
  if (review.state !== 'ok' || review.score === null) return null;
  return { score: review.score, max: review.max };
}

function shotTile(d, s, image) {
  if (s.state !== 'ok') {
    const why = s.state === 'unreadable' ? s.error : 'not found';
    return html`<figure
      class="shot missing"
      data-dir="${d.letter}"
      data-theme="${s.theme}"
      data-vp="${s.vp}"
      data-file="${s.file}"
    >
      <div
        class="missing-tile"
        role="img"
        aria-label="Missing screenshot ${s.file} for ${DIRECTIONS[d.letter].name}"
      >
        <strong>Missing</strong>
        <code>screenshots/${s.file}</code>
        <span>${s.rel}: ${why}</span>
      </div>
      <figcaption class="shot-cap">${s.theme} · ${s.vp}</figcaption>
    </figure>`;
  }
  const alt = `${DIRECTIONS[d.letter].name} direction, ${s.theme} theme, ${s.vp} wide`;
  const scaled = image.scale < 1 ? ` · scaled to ${Math.round(image.scale * 100)}%` : '';
  return html`<figure
    class="shot"
    data-dir="${d.letter}"
    data-theme="${s.theme}"
    data-vp="${s.vp}"
    data-file="${s.file}"
  >
    <button
      type="button"
      class="shot-btn"
      aria-label="View full size: ${DIRECTIONS[d.letter].name}, ${s.theme}, ${s.vp} wide"
    >
      <img
        class="shot-img"
        src="${image.dataUri}"
        width="${image.width}"
        height="${image.height}"
        alt="${alt}"
        data-w="${s.width}"
        data-scale="${image.scale}"
      />
    </button>
    <figcaption class="shot-cap">${s.theme} · ${s.vp}${scaled}</figcaption>
  </figure>`;
}

function refsSection(v) {
  const r = v.refs;
  let body;
  let count = '';
  if (r.state === 'missing')
    body = html`<p class="empty" data-tone="warn">refs.json is missing</p>`;
  else if (r.state === 'invalid')
    body = html`<p class="empty" data-tone="warn">refs.json is not valid JSON (${r.error})</p>`;
  else if (r.state === 'bad')
    body = html`<p class="empty" data-tone="warn">refs.json ${r.problems[0]}</p>`;
  else {
    count = r.links.length;
    body = html` ${r.searches.length === 0 && r.links.length === 0
      ? html`<p class="empty">No 21st references logged</p>`
      : ''}
    ${r.searches.length
      ? html`<ul>
          ${r.searches.map(
            (s) =>
              html`<li class="kv">
                <b><span class="kind">${s.tool}</span>${s.query}</b>${s.reason
                  ? html`<span>${s.reason}</span>`
                  : ''}
              </li>`,
          )}
        </ul>`
      : ''}
    ${r.links.length
      ? html`<ul>
          ${r.links.map(
            (l) =>
              html`<li class="kv">
                <b
                  >${l.href
                    ? html`<a href="${l.href}" target="_blank" rel="noopener noreferrer"
                        >${l.url}</a
                      >`
                    : l.url || '(no URL)'}</b
                >${l.took ? html`<span>Took: ${l.took}</span>` : ''}
              </li>`,
          )}
        </ul>`
      : ''}`;
  }
  return html`<details class="panel-sec" data-sec="refs" open>
    <summary>
      21st references ${count === '' ? '' : html`<span class="count">${count}</span>`}
    </summary>
    ${body}
  </details>`;
}

function bendsSection(v) {
  const b = v.bends;
  const letterC = v.d.letter === 'C';
  let body;
  let count = '';
  if (b.state === 'missing') {
    body = letterC
      ? html`<p class="empty" data-tone="warn">bend-log.json is missing</p>`
      : html`<p class="empty">No bends logged</p>`;
  } else if (b.state === 'invalid')
    body = html`<p class="empty" data-tone="warn">bend-log.json is not valid JSON (${b.error})</p>`;
  else if (b.state === 'bad')
    body = html`<p class="empty" data-tone="warn">bend-log.json ${b.problems[0]}</p>`;
  else if (b.bends.length === 0) body = html`<p class="empty">No bends logged</p>`;
  else {
    count = b.bends.length;
    body = html`<ul>
      ${b.bends.map(
        (x) =>
          html`<li class="kv">
            <b
              ><span class="kind" data-kind="${x.kind}">${x.kind}</span>${x.rule ||
              x.match ||
              ''}${x.file ? html` <code>${x.file}</code>` : ''}${x.rule && x.match
                ? html` <code>${x.match}</code>`
                : ''}</b
            >${x.why ? html`<span>${x.why}</span>` : ''}${x.change
              ? html`<span>To make it legal: ${x.change}</span>`
              : ''}
          </li>`,
      )}
    </ul>`;
  }
  return html`<details class="panel-sec" data-sec="bends" ${letterC ? raw('open') : ''}>
    <summary>Bend log ${count === '' ? '' : html`<span class="count">${count}</span>`}</summary>
    ${body}
  </details>`;
}

function gapsSection(v) {
  const g = v.gaps;
  let body;
  let count = '';
  if (g.state === 'missing')
    body = html`<p class="empty" data-tone="warn">gaps.json is missing</p>`;
  else if (g.state === 'invalid')
    body = html`<p class="empty" data-tone="warn">gaps.json is not valid JSON (${g.error})</p>`;
  else if (g.state === 'bad')
    body = html`<p class="empty" data-tone="warn">gaps.json ${g.problems[0]}</p>`;
  else if (g.gaps.length === 0) body = html`<p class="empty">No gaps logged</p>`;
  else {
    count = g.gaps.length;
    body = html`<ul>
      ${g.gaps.map(
        (x) =>
          html`<li class="kv">
            <b
              ><span class="kind">${x.kind}</span>${x.needed}${x.id
                ? html` <code>${x.id}</code>`
                : ''}</b
            >${x.didInstead ? html`<span>Did instead: ${x.didInstead}</span>` : ''}${x.proposal
              ? html`<span>Proposal: ${x.proposal}</span>`
              : ''}${x.evidence ? html`<span>Evidence: ${x.evidence}</span>` : ''}
          </li>`,
      )}
    </ul>`;
  }
  return html`<details class="panel-sec" data-sec="gaps">
    <summary>Gaps ${count === '' ? '' : html`<span class="count">${count}</span>`}</summary>
    ${body}
  </details>`;
}

function reviewSection(v) {
  const r = v.review;
  let body;
  if (r.state === 'missing') body = html`<p class="empty">No review yet</p>`;
  else if (r.state === 'invalid')
    body = html`<p class="empty" data-tone="warn">review.json is not valid JSON (${r.error})</p>`;
  else if (r.state === 'bad')
    body = html`<p class="empty" data-tone="warn">review.json ${r.problems[0]}</p>`;
  else {
    body = html` ${r.score === null
      ? html`<p class="empty" data-tone="warn">review.json has no score</p>`
      : html`<p class="score">
          ${r.score}${r.max === null ? '' : html`<small>/${r.max}</small>`}
        </p>`}
    ${r.notes.length === 0
      ? ''
      : r.asList
        ? html`<ul class="notes">
            ${r.notes.map((n) => html`<li>${n}</li>`)}
          </ul>`
        : r.notes.map((n) => html`<p class="note">${n}</p>`)}`;
  }
  return html`<section class="panel-sec" data-sec="review">
    <h3>Review</h3>
    ${body}
  </section>`;
}

function rationaleSection(v) {
  const r = v.d.rationale;
  let body;
  if (r.state === 'ok')
    body = html`<p>${raw(esc(r.text).replace(/`([^`]+)`/g, '<code>$1</code>'))}</p>`;
  else if (r.state === 'empty')
    body = html`<p class="empty" data-tone="warn">rationale.md is empty</p>`;
  else body = html`<p class="empty" data-tone="warn">rationale.md is missing</p>`;
  return html`<section class="panel-sec" data-sec="rationale">
    <h3>Rationale</h3>
    ${body}
  </section>`;
}

function directionColumn(v, images) {
  const { d } = v;
  const meta = DIRECTIONS[d.letter];
  if (!d.present) {
    return html`<article class="dir" id="dir-${d.letter}" data-dir="${d.letter}" data-absent="true">
      <header class="dir-head">
        <span class="dir-letter" aria-hidden="true">${d.letter}</span>
        <h2>${meta.name}</h2>
        <p class="dir-q">${meta.question}</p>
      </header>
      <div class="dir-absent">
        <strong>Not in this run</strong><span>No ${d.id} folder was found.</span>
      </div>
    </article>`;
  }
  const refs = v.refs;
  const tenant =
    refs.state === 'ok'
      ? refs.tenant
        ? `Tenant: ${refs.tenant}`
        : 'Tenant: HDS default'
      : 'Tenant: unknown';
  const score = scoreText(v.review);
  return html`<article class="dir" id="dir-${d.letter}" data-dir="${d.letter}">
    <header class="dir-head">
      <span class="dir-letter" aria-hidden="true">${d.letter}</span>
      <h2>${meta.name}</h2>
      ${score
        ? html`<span class="score-pill" title="Review score"
            >${score.score}${score.max === null ? '' : `/${score.max}`}</span
          >`
        : html`<span class="score-pill" data-state="none">No review</span>`}
      <p class="dir-q">${meta.question} <span class="dir-pickmark">Your pick</span></p>
      <p class="dir-meta">${tenant}</p>
    </header>
    <div class="frame" tabindex="0" role="region" aria-label="${meta.name} screenshots, scrollable">
      ${d.shots.map((s) => shotTile(d, s, images.get(`${d.id}/${s.file}`)))}
    </div>
    <div class="panel">
      ${rationaleSection(v)} ${reviewSection(v)} ${refsSection(v)} ${bendsSection(v)}
      ${gapsSection(v)}
    </div>
  </article>`;
}

const PICK_HOOK = `/* === PICK HOOK =================================================================
   The one place the orchestrator wires storage for Adrian's pick.

   recordPick(screen, pick) runs when he presses "Record pick".
     screen  the screen id, for example "standing"
     pick    { direction: "A" | "B" | "C" | "mix", note: string, at: ISO time }

   It is a no-op by default. To store the pick (Artifact data, one document per
   screen), replace the body below and return a promise that resolves to true
   once the pick is stored, or rejects with an Error that says why it was not.
   For any other return value the page says "Not stored", so a board published
   without storage never claims it saved anything.

   To show a stored pick when the board opens, read it back and call
   hdsBoard.setPick(pick). Nothing else on the page needs to change.
   ============================================================================ */
function recordPick(screen, pick) {
  // no-op
}`;

const BOARD_SCRIPT = `(function () {
  'use strict';
  var root = document.querySelector('[data-board]');
  if (!root) return;
  var screen = root.getAttribute('data-screen');
  var KEY = 'hds-board-view';
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function keep(patch) {
    try {
      var s = load();
      Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) { /* storage is a convenience; the page works without it */ }
  }

  var themeBtns = root.querySelectorAll('[data-set-theme]');
  var vpBtns = root.querySelectorAll('[data-set-vp]');
  var frames = Array.prototype.slice.call(root.querySelectorAll('.frame'));
  var linkBox = document.getElementById('link-scroll');

  function setView(theme, vp) {
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-vp', vp);
    themeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-theme') === theme)); });
    vpBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-vp') === vp)); });
    frames.forEach(function (f) { f.scrollTop = 0; });
  }
  themeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      setView(b.getAttribute('data-set-theme'), root.getAttribute('data-vp'));
      keep({ theme: root.getAttribute('data-theme') });
    });
  });
  vpBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      setView(root.getAttribute('data-theme'), b.getAttribute('data-set-vp'));
      keep({ vp: root.getAttribute('data-vp') });
    });
  });
  var saved = load();
  if ((saved.theme === 'light' || saved.theme === 'dark') && (saved.vp === '1280' || saved.vp === '390')) setView(saved.theme, saved.vp);
  if (saved.link === false) linkBox.checked = false;
  linkBox.addEventListener('change', function () { keep({ link: linkBox.checked }); });

  // Linked scrolling: moving one direction moves the others to the same point down the page.
  frames.forEach(function (f) {
    f.addEventListener('scroll', function () {
      if (f.__sync !== undefined && Math.abs(f.scrollTop - f.__sync) <= 1) { f.__sync = undefined; return; }
      // columns only sit side by side from 62rem up; stacked, linking would just fight the page scroll
      if (!linkBox.checked || (window.matchMedia && !window.matchMedia('(min-width: 62rem)').matches)) return;
      var max = f.scrollHeight - f.clientHeight;
      var ratio = max > 0 ? f.scrollTop / max : 0;
      frames.forEach(function (o) {
        if (o === f) return;
        var m = o.scrollHeight - o.clientHeight;
        o.scrollTop = ratio * m;
        o.__sync = o.scrollTop;
      });
    });
  });

  // Full-size view of one screenshot, at the width the page was captured.
  var opener = null;
  function closeBox() {
    var box = document.querySelector('.lightbox');
    if (!box) return;
    box.remove();
    if (opener && opener.focus) opener.focus();
    opener = null;
  }
  function openBox(btn) {
    var img = btn.querySelector('img');
    if (!img) return;
    closeBox();
    opener = document.activeElement;
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', img.getAttribute('alt') || 'Screenshot');
    var bar = document.createElement('div');
    bar.className = 'lightbox-bar';
    var cap = document.createElement('span');
    var scale = img.getAttribute('data-scale');
    cap.textContent = (img.getAttribute('alt') || '') + (scale && scale !== '1' ? ', reduced to ' + Math.round(Number(scale) * 100) + '% to fit the page' : '');
    var close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    bar.appendChild(cap);
    bar.appendChild(close);
    var scroller = document.createElement('div');
    scroller.className = 'lightbox-scroll';
    var big = document.createElement('img');
    big.src = img.getAttribute('src');
    big.alt = img.getAttribute('alt') || '';
    big.style.width = (img.getAttribute('data-w') || img.naturalWidth) + 'px';
    scroller.appendChild(big);
    box.appendChild(bar);
    box.appendChild(scroller);
    document.body.appendChild(box);
    close.addEventListener('click', closeBox);
    box.addEventListener('click', function (e) { if (e.target === box) closeBox(); });
    close.focus();
  }
  root.querySelectorAll('.shot-btn').forEach(function (b) { b.addEventListener('click', function () { openBox(b); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeBox();
    else if (e.key === 'Tab' && document.querySelector('.lightbox')) e.preventDefault();
  });

  // The pick. Selection is kept on the page; storing it is the hook's job.
  var radios = root.querySelectorAll('input[name="pick"]');
  var note = document.getElementById('pick-note');
  var saveBtn = document.getElementById('pick-save');
  var status = document.getElementById('pick-status');
  function chosen() {
    var found = null;
    radios.forEach(function (r) { if (r.checked) found = r.value; });
    return found;
  }
  function say(text, tone) {
    status.textContent = text;
    if (tone) status.setAttribute('data-tone', tone); else status.removeAttribute('data-tone');
  }
  function refresh() {
    var c = chosen();
    saveBtn.disabled = !c || (c === 'mix' && !note.value.trim());
    root.querySelectorAll('.dir').forEach(function (d) {
      if (d.getAttribute('data-dir') === c) d.setAttribute('data-picked', 'true'); else d.removeAttribute('data-picked');
    });
  }
  radios.forEach(function (r) { r.addEventListener('change', refresh); });
  note.addEventListener('input', refresh);
  saveBtn.addEventListener('click', function () {
    var c = chosen();
    if (!c) return;
    var pick = { direction: c, note: note.value.trim(), at: new Date().toISOString() };
    say('Saving\\u2026');
    var result;
    try { result = window.recordPick(screen, pick); } catch (e) { result = Promise.reject(e); }
    Promise.resolve(result).then(
      function (ok) {
        if (ok !== true) say('Noted on this page only. Not stored: the storage hook did not confirm a save (it is a no-op until wired).', 'warn');
        else say('Saved: ' + (c === 'mix' ? 'a mix' : 'direction ' + c) + '.', 'ok');
      },
      function (err) { say('Could not save: ' + (err && err.message ? err.message : String(err)), 'bad'); }
    );
  });
  window.hdsBoard = {
    setPick: function (pick) {
      if (!pick) return;
      radios.forEach(function (r) { r.checked = r.value === pick.direction; });
      note.value = pick.note || '';
      refresh();
      say('Stored pick: ' + (pick.direction === 'mix' ? 'a mix' : 'direction ' + pick.direction) + (pick.at ? ', ' + String(pick.at).slice(0, 10) : '') + '.', 'ok');
    }
  };
  refresh();
})();`;

/**
 * Render a screen's board.
 * @param {object} model from readScreenRun
 * @param {{ images: Map<string, {dataUri:string, scale:number, width:number, height:number}>,
 *           title?: string, form?: 'document'|'artifact' }} opts
 * @returns {{ html: string, problems: string[], missing: {direction:string,file:string}[],
 *             captures: {present:number,total:number} }}
 */
export function renderBoard(model, { images, title, form = 'document' }) {
  const views = model.directions.map((d) =>
    d.present ? readView(d) : { d, problems: [], refs: {} },
  );
  const problems = [];
  const missing = [];
  let present = 0;
  for (const v of views) {
    if (!v.d.present) {
      problems.push(`direction ${v.d.letter} is not in this run (no ${v.d.id} folder)`);
      continue;
    }
    problems.push(...v.problems);
    for (const s of v.d.shots) {
      if (s.state === 'ok') present += 1;
      if (s.state === 'missing') missing.push({ direction: v.d.letter, file: s.file });
    }
  }
  const total = LETTERS.length * THEMES.length * VIEWPORTS.length;
  const heading = title ?? humanize(model.screen);
  const dirsHere = views.filter((v) => v.d.present).length;
  const runs = model.runs.length === 1 ? `Run ${model.runs[0]}` : `Runs ${model.runs.join(', ')}`;

  const body = html` <main
      class="bd"
      data-board
      data-screen="${model.screen}"
      data-theme="light"
      data-vp="1280"
    >
      <header class="bd-head">
        <p class="bd-eyebrow">Design explorations · hds#628</p>
        <h1>${heading}</h1>
        <p class="bd-sub">
          ${runs} · ${dirsHere} ${dirsHere === 1 ? 'direction' : 'directions'} · ${present} of
          ${total} captures
        </p>
      </header>
      ${problems.length
        ? html`<section class="bd-problems" aria-labelledby="problems-h">
            <h2 id="problems-h">Needs attention (${problems.length})</h2>
            <ul>
              ${problems.map((p) => html`<li>${p}</li>`)}
            </ul>
          </section>`
        : ''}
      <div class="bd-controls" role="group" aria-label="View">
        <div class="bd-ctl">
          <span id="theme-l">Theme</span>
          <div class="seg" role="group" aria-labelledby="theme-l">
            ${THEMES.map(
              (t) =>
                html`<button
                  type="button"
                  data-set-theme="${t}"
                  aria-pressed="${String(t === 'light')}"
                >
                  ${t === 'light' ? 'Light' : 'Dark'}
                </button>`,
            )}
          </div>
        </div>
        <div class="bd-ctl">
          <span id="vp-l">Viewport</span>
          <div class="seg" role="group" aria-labelledby="vp-l">
            ${VIEWPORTS.map(
              (w) =>
                html`<button type="button" data-set-vp="${w}" aria-pressed="${String(w === 1280)}">
                  ${w}
                </button>`,
            )}
          </div>
        </div>
        <label class="bd-check"
          ><input type="checkbox" id="link-scroll" checked /> Link scroll</label
        >
      </div>
      <section class="bd-pick" aria-labelledby="pick-h">
        <fieldset>
          <legend id="pick-h">Your pick</legend>
          ${views.map(
            (v) =>
              html`<label class="opt"
                ><input
                  type="radio"
                  name="pick"
                  value="${v.d.letter}"
                  ${v.d.present ? '' : raw('disabled')}
                />
                ${label(v.d.letter)}</label
              >`,
          )}
          <label class="opt"><input type="radio" name="pick" value="mix" /> Mix</label>
        </fieldset>
        <div class="bd-pick-row">
          <textarea
            id="pick-note"
            rows="2"
            aria-label="Pick note"
            placeholder="Note (required for a mix)"
          ></textarea>
          <button type="button" class="btn" id="pick-save" disabled>Record pick</button>
        </div>
        <p class="bd-status" id="pick-status" role="status" aria-live="polite"></p>
      </section>
      <div class="bd-dirs">${views.map((v) => directionColumn(v, images))}</div>
    </main>
    <script id="pick-hook">
      ${raw(PICK_HOOK)};
    </script>
    <script>
      ${raw(BOARD_SCRIPT)};
    </script>`;

  const page = wrapPage({ title: `${heading} directions`, body: body.text, form });
  return { html: page, problems, missing, captures: { present, total } };
}

const dataUri = (buf) => `data:image/png;base64,${buf.toString('base64')}`;

/**
 * Build one screen's board.
 * @param {{ runDir?: string, runDirs?: string[], screen: string, out?: string, title?: string,
 *           form?: 'document'|'artifact', budgetBytes?: number }} opts
 *   `runDir` is `runs/<date>` (or a `runs/` root); give `runDirs` for several runs, oldest first.
 *   `budgetBytes` caps the whole page; screenshots are downscaled to fit (see board-images.mjs).
 */
export function buildBoard({
  runDir,
  runDirs,
  screen,
  out,
  title,
  form = 'document',
  budgetBytes = DEFAULT_BUDGET_BYTES,
}) {
  const budget = Math.min(budgetBytes, PAGE_LIMIT_BYTES);
  const model = readScreenRun(expandRunDirs(runDirs ?? [runDir]), screen);

  const shots = [];
  for (const d of model.directions) {
    if (!d.present) continue;
    for (const s of d.shots)
      if (s.state === 'ok') shots.push({ key: `${d.id}/${s.file}`, file: s.rel, buf: s.buf });
  }

  // Render once with no image data to measure the page around the screenshots.
  const empty = new Map(shots.map((s) => [s.key, { dataUri: '', scale: 1, width: 1, height: 1 }]));
  const frame = renderBoard(model, { images: empty, title, form });
  const target = budget - Buffer.byteLength(frame.html) - SAFETY_BYTES;

  let fit = { images: new Map(), downscaled: [], total: 0 };
  if (shots.length) {
    try {
      fit = fitImages(shots, target);
    } catch (err) {
      throw new Error(`board "${screen}" is too large: ${err.message}`);
    }
  }
  const images = new Map();
  for (const [key, img] of fit.images) {
    images.set(key, {
      dataUri: dataUri(img.buf),
      scale: img.scale,
      width: img.width,
      height: img.height,
    });
  }
  const page = renderBoard(model, { images, title, form });
  const bytes = Buffer.byteLength(page.html);
  if (bytes > budget) {
    throw new Error(`board "${screen}" is too large: ${bytes} bytes against a budget of ${budget}`);
  }

  if (out) {
    mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    writeFileSync(out, page.html);
  }
  return {
    screen,
    html: page.html,
    bytes,
    budgetBytes: budget,
    out: out ?? null,
    directions: model.directions.map((d) => ({ letter: d.letter, present: d.present })),
    captures: page.captures,
    missing: page.missing,
    problems: page.problems,
    downscaled: fit.downscaled,
    summary: `${screen}: ${model.directions.filter((d) => d.present).length} directions, ${page.captures.present} of ${page.captures.total} captures, ${page.problems.length} problems, ${formatBytes(bytes)}`,
  };
}
