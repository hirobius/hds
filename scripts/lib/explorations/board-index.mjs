/** @internal — the explorations index board (hirobius/hds#628). */
/**
 * The index: a link to each screen's board and the gap table, ranked by how
 * many screens hit each gap. It is the page Adrian accepts or rejects gaps on.
 *
 * Ranking lives here (`rankGaps`) rather than being imported from the harness
 * part, which this branch does not have yet. It follows the same rules so the
 * two can be swapped: gaps merge on their `id` when they have one, else on their
 * kind and their wording folded for case, spacing and punctuation; a screen
 * counts once however many of its directions hit a gap; ties go to total hits,
 * then to the key.
 *
 * `validateGapLog` here checks only what the table needs (an array of gaps that
 * each have a known kind and a "needed"). The full schema is the harness gate's
 * job. An invalid log is reported on the page and none of its gaps are ranked.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  LETTERS,
  DIRECTIONS,
  compareScreens,
  formatBytes,
  html,
  humanize,
  raw,
  safeHref,
  wrapPage,
} from './board-chrome.mjs';
import { expandRunDirs, listScreens, readDirection } from './board-run.mjs';

export const GAP_KINDS = ['token', 'component', 'pattern', 'rule', 'bug'];
const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const fold = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** What makes two gaps the same gap: the id, else the kind plus the folded wording. */
export const gapKey = (g) => g.id ?? `${g.kind}:${fold(g.needed)}`;

const unique = (list) => [...new Set(list)];

/**
 * Rank gaps by how many distinct screens hit them, then by total hits, then by key.
 * @param {{ screen:string, direction:string, kind:string, needed:string, didInstead?:string,
 *           proposal?:string, evidence?:string, id?:string }[]} gaps valid gaps from any number of logs
 */
export function rankGaps(gaps) {
  // A stable order in, so the representative wording and the evidence list never depend on read order.
  const ordered = gaps
    .map((g, index) => ({ g, index }))
    .sort(
      (a, b) =>
        compareScreens(a.g.screen, b.g.screen) ||
        a.g.direction.localeCompare(b.g.direction) ||
        a.index - b.index,
    )
    .map(({ g }) => g);

  const groups = new Map();
  for (const g of ordered) {
    const key = gapKey(g);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(g);
  }

  const ranked = [...groups].map(([key, members]) => {
    const counts = new Map();
    for (const m of members) counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1);
    const kinds = GAP_KINDS.filter((k) => counts.has(k));
    const kind = kinds.length
      ? kinds.reduce((best, k) => (counts.get(k) > counts.get(best) ? k : best))
      : members[0].kind;
    const screens = unique(members.map((m) => m.screen));
    const directions = Object.fromEntries(LETTERS.map((l) => [l, 0]));
    for (const m of members) directions[m.direction] += 1;
    return {
      key,
      id: members.find((m) => m.id)?.id ?? null,
      kind,
      kinds,
      needed: members[0].needed,
      screens,
      screenCount: screens.length,
      hits: members.length,
      directions,
      proposals: unique(members.map((m) => m.proposal).filter(Boolean)),
      didInstead: unique(members.map((m) => m.didInstead).filter(Boolean)),
      evidence: members.map((m) => ({
        screen: m.screen,
        direction: m.direction,
        evidence: m.evidence,
      })),
    };
  });

  return ranked.sort(
    (a, b) => b.screenCount - a.screenCount || b.hits - a.hits || a.key.localeCompare(b.key),
  );
}

/**
 * Check one gaps.json for what the table needs.
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function validateGapLog(log) {
  if (!Array.isArray(log))
    return { ok: false, problems: ['a gap log must be an array (use [] for none)'] };
  const problems = [];
  log.forEach((g, i) => {
    const at = `gap ${i + 1}`;
    if (!isObject(g)) return problems.push(`${at}: must be an object`);
    if (!GAP_KINDS.includes(g.kind))
      problems.push(`${at}: kind "${g.kind}" is not one of ${GAP_KINDS.join(', ')}`);
    if (!isText(g.needed)) problems.push(`${at}: needed must be a non-empty string`);
    if (g.id !== undefined && !(typeof g.id === 'string' && KEBAB.test(g.id))) {
      problems.push(`${at}: id "${g.id}" must be kebab-case`);
    }
  });
  return { ok: problems.length === 0, problems };
}

const str = (v) => (isText(v) ? v : '');

/* ---------- reading ---------- */

function readDirections(dirs, screen, problems) {
  return LETTERS.map((letter) => {
    const d = readDirection(dirs, screen, letter, { screenshots: false });
    if (!d.present) return { letter, present: false, gaps: [], score: null };
    let score = null;
    if (d.review.state === 'invalid')
      problems.push(`${d.id}/review.json is not valid JSON (${d.review.error})`);
    else if (d.review.state === 'ok' && isObject(d.review.value)) {
      const s = d.review.value.score;
      if ((typeof s === 'number' && Number.isFinite(s)) || isText(s)) {
        const max = d.review.value.max;
        score = `${s}${typeof max === 'number' && Number.isFinite(max) ? `/${max}` : ''}`;
      }
    }
    const gaps = [];
    if (d.gaps.state === 'missing')
      problems.push(`${d.id}/gaps.json is missing, so its gaps are not counted`);
    else if (d.gaps.state === 'invalid')
      problems.push(
        `${d.id}/gaps.json is not valid JSON (${d.gaps.error}); its gaps are not ranked`,
      );
    else {
      const check = validateGapLog(d.gaps.value);
      if (!check.ok)
        problems.push(`${d.id}/gaps.json: ${check.problems.join('; ')}; its gaps are not ranked`);
      else {
        for (const g of d.gaps.value) {
          gaps.push({
            screen,
            direction: letter,
            kind: g.kind,
            needed: g.needed,
            didInstead: str(g.didInstead),
            proposal: str(g.proposal),
            evidence: str(g.evidence),
            ...(g.id ? { id: g.id } : {}),
          });
        }
      }
    }
    return { letter, present: true, gaps, score };
  });
}

/* ---------- markup ---------- */

function boardRow(b) {
  return html`<li class="idx-board" data-board-row="${b.screen}">
    <div>
      <h3>${b.title}</h3>
      <span class="idx-id">${b.screen} · ${b.gapCount} ${b.gapCount === 1 ? 'gap' : 'gaps'}</span>
    </div>
    <a class="idx-open" data-board-link="${b.screen}" href="${b.href}">Open board</a>
    <div class="chips">
      ${b.directions.map((d) =>
        d.present
          ? html`<span class="chip" data-chip="${d.letter}" data-state="present"
              >${d.letter} ${DIRECTIONS[d.letter].name} · ${d.score ?? 'no review'}</span
            >`
          : html`<span class="chip" data-chip="${d.letter}" data-state="absent"
              >${d.letter} ${DIRECTIONS[d.letter].name} · not run</span
            >`,
      )}
    </div>
  </li>`;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function gapRow(g, rank) {
  return html`<tr data-gap-row="${g.key}">
    <td data-col="rank">${rank}</td>
    <td data-col="gap">
      <div class="gap-need"><span class="kind">${g.kind}</span>${g.needed}</div>
      ${g.id ? html`<div class="gap-meta">${g.id}</div>` : ''}
      <div class="hits" aria-label="Hits by direction">
        ${LETTERS.map((l) => html`<span>${l} ${g.directions[l]}</span>`)}
      </div>
      <details>
        <summary>Evidence (${g.evidence.length})</summary>
        <ul>
          ${g.evidence.map(
            (e) =>
              html`<li>
                <code>${e.screen}-${e.direction}</code> ${e.evidence || 'no evidence written'}
              </li>`,
          )}
        </ul>
        ${g.didInstead.length
          ? html`<ul>
              ${g.didInstead.map((d) => html`<li>Did instead: ${d}</li>`)}
            </ul>`
          : ''}
      </details>
    </td>
    <td data-col="screens">
      <strong>${plural(g.screenCount, 'screen', 'screens')}</strong>
      <div class="gap-meta">${g.screens.join(', ')}</div>
    </td>
    <td data-col="proposal">
      ${g.proposals.length
        ? g.proposals.map((p) => html`<p>${p}</p>`)
        : html`<span class="gap-meta">no proposal written</span>`}
    </td>
    <td data-col="decision">
      <div class="seg" role="group" aria-label="Decision">
        <button type="button" data-decide="accept" aria-pressed="false">Accept</button>
        <button type="button" data-decide="reject" aria-pressed="false">Reject</button>
      </div>
    </td>
  </tr>`;
}

const DECISION_HOOK = `/* === DECISION HOOK =============================================================
   The one place the orchestrator wires storage for Adrian's accept or reject.

   recordGapDecision(gapKey, decision) runs when he presses Accept or Reject.
     gapKey    the gap's id, or its kind and folded wording when it has no id
     decision  "accept", "reject", or "clear" when he takes a decision back

   It is a no-op by default. To store decisions (Artifact data, one document per
   gap key), replace the body below and return a promise that resolves to true
   once the decision is stored, or rejects with an Error that says why it was not.
   For any other value (even a truthy one) the page says "Not stored".

   To show stored decisions when the index opens, read them back and call
   hdsIndex.setDecisions({ "<gapKey>": "accept" | "reject", ... }).
   ============================================================================ */
function recordGapDecision(gapKey, decision) {
  // no-op
}`;

const INDEX_SCRIPT = `(function () {
  'use strict';
  var rows = Array.prototype.slice.call(document.querySelectorAll('[data-gap-row]'));
  var status = document.getElementById('decision-status');
  var summary = document.getElementById('decision-summary');
  function say(text, tone) {
    if (!status) return;
    status.textContent = text;
    if (tone) status.setAttribute('data-tone', tone); else status.removeAttribute('data-tone');
  }
  function count() {
    var acc = 0, rej = 0;
    rows.forEach(function (r) {
      var d = r.getAttribute('data-decision');
      if (d === 'accept') acc += 1; else if (d === 'reject') rej += 1;
    });
    if (summary) summary.textContent = acc + ' accepted, ' + rej + ' rejected, ' + (rows.length - acc - rej) + ' undecided';
  }
  function show(row, decision) {
    if (decision === 'accept' || decision === 'reject') row.setAttribute('data-decision', decision); else row.removeAttribute('data-decision');
    row.querySelectorAll('[data-decide]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-decide') === decision));
    });
  }
  rows.forEach(function (row) {
    row.querySelectorAll('[data-decide]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = row.getAttribute('data-gap-row');
        var which = btn.getAttribute('data-decide');
        var before = row.getAttribute('data-decision') || '';
        var next = before === which ? '' : which;
        show(row, next);
        count();
        say('Saving\\u2026');
        var result;
        try { result = window.recordGapDecision(key, next || 'clear'); } catch (e) { result = Promise.reject(e); }
        Promise.resolve(result).then(
          function (ok) {
            if (ok !== true) say('Noted on this page only. Not stored: the storage hook did not confirm a save (it is a no-op until wired).', 'warn');
            else say('Saved.', 'ok');
          },
          function (err) {
            show(row, before);
            count();
            say('Could not save: ' + (err && err.message ? err.message : String(err)), 'bad');
          }
        );
      });
    });
  });
  window.hdsIndex = {
    setDecisions: function (map) {
      rows.forEach(function (row) {
        var d = map ? map[row.getAttribute('data-gap-row')] : '';
        show(row, d);
      });
      count();
    }
  };
  count();
})();`;

/**
 * Render the index page.
 * @param {{ boards: object[], gaps: object[], problems: string[], hits: number }} model
 */
export function renderIndex(model, { form = 'document' } = {}) {
  const { boards, gaps, problems, hits } = model;
  const body = html` <main class="bd" data-index>
      <header class="bd-head">
        <p class="bd-eyebrow">Design explorations · hds#628</p>
        <h1>Explorations index</h1>
        <p class="bd-sub">
          ${plural(boards.length, 'board', 'boards')} · ${plural(gaps.length, 'gap', 'gaps')} from
          ${plural(hits, 'hit', 'hits')}
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
      <section aria-labelledby="boards-h">
        <h2 id="boards-h">Boards</h2>
        <ol class="idx-boards">
          ${boards.map(boardRow)}
        </ol>
      </section>
      <section aria-labelledby="gaps-h">
        <h2 id="gaps-h">Gaps, ranked by screens hit</h2>
        <p class="bd-sum" id="decision-summary" aria-live="polite"></p>
        <p class="bd-status" id="decision-status" role="status" aria-live="polite"></p>
        ${gaps.length === 0
          ? html`<p class="gap-empty">No gaps logged yet.</p>`
          : html`<div class="table-scroll">
              <table class="gap-table">
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Gap</th>
                    <th scope="col">Screens</th>
                    <th scope="col">Proposal</th>
                    <th scope="col">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  ${gaps.map((g, i) => gapRow(g, i + 1))}
                </tbody>
              </table>
            </div>`}
      </section>
    </main>
    <script id="decision-hook">
      ${raw(DECISION_HOOK)};
    </script>
    <script>
      ${raw(INDEX_SCRIPT)};
    </script>`;
  return wrapPage({ title: 'Explorations index', body: body.text, form });
}

/**
 * Build the index over one or more run directories.
 * @param {{ runDirs: string[], links?: Record<string,string>, titles?: Record<string,string>,
 *           form?: 'document'|'artifact', out?: string }} opts
 *   `links` maps a screen id to the URL its board is published at (http or https);
 *   without one a board links to `<screen>.html` beside the index.
 */
export function buildIndex({ runDirs, links = {}, titles = {}, form = 'document', out }) {
  const dirs = expandRunDirs(runDirs);
  const screens = listScreens(dirs);
  if (screens.length === 0) throw new Error(`no directions found under ${runDirs.join(', ')}`);

  const problems = [];
  const boards = [];
  const allGaps = [];
  for (const screen of screens) {
    const directions = readDirections(dirs, screen, problems);
    for (const d of directions) allGaps.push(...d.gaps);
    boards.push({
      screen,
      title: titles[screen] ?? humanize(screen),
      href: safeHref(links[screen]) ?? `${screen}.html`,
      directions: directions.map(({ letter, present, score }) => ({ letter, present, score })),
      gapCount: directions.reduce((n, d) => n + d.gaps.length, 0),
    });
  }
  const gaps = rankGaps(allGaps);
  const page = renderIndex({ boards, gaps, problems, hits: allGaps.length }, { form });
  const bytes = Buffer.byteLength(page);
  if (out) {
    mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    writeFileSync(out, page);
  }
  return {
    html: page,
    bytes,
    out: out ?? null,
    boards,
    gaps,
    hits: allGaps.length,
    problems,
    summary: `index: ${plural(boards.length, 'board', 'boards')}, ${plural(gaps.length, 'gap', 'gaps')} (${plural(allGaps.length, 'hit', 'hits')}), ${plural(problems.length, 'problem', 'problems')}, ${formatBytes(bytes)}`,
  };
}
