/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The explorations index (hirobius/hds#628, phase 0): a link to each screen's
 * board plus the gap table, ranked by how many screens hit each gap. It is the
 * page Adrian accepts or rejects gaps on, so the ranking is the part that must
 * be right: a screen counts once however many of its directions hit a gap, two
 * wordings of one gap merge only when they share an id or their folded text,
 * and an invalid gap log is shown, not silently dropped.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { JSDOM, VirtualConsole } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { buildIndex, rankGaps } from '../lib/explorations/board-index.mjs';
import { gap, tmpDir, writeScreenRun } from './helpers/board-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = path.join(ROOT, 'scripts', 'explorations-board.mjs');

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();

function open(html) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => errors.push(e.message));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://board.test/',
    pretendToBeVisual: true,
    virtualConsole,
  });
  return { win: dom.window, doc: dom.window.document, errors };
}

describe('rankGaps', () => {
  it('ranks by distinct screens hit, before total hits', () => {
    const ranked = rankGaps([
      // two screens, six hits
      ...['A', 'B', 'C'].map((d) => gap('standing', d, { id: 'wide-gap' })),
      ...['A', 'B', 'C'].map((d) => gap('pitch', d, { id: 'wide-gap' })),
      // three screens, one hit each
      gap('standing', 'C', { id: 'broad-gap', needed: 'A stage chain' }),
      gap('pitch', 'C', { id: 'broad-gap', needed: 'A stage chain' }),
      gap('leads', 'C', { id: 'broad-gap', needed: 'A stage chain' }),
    ]);
    expect(ranked.map((g) => g.id)).toEqual(['broad-gap', 'wide-gap']);
    expect(ranked[0]).toMatchObject({ screenCount: 3, hits: 3 });
    expect(ranked[1]).toMatchObject({ screenCount: 2, hits: 6 });
  });

  it('counts a screen once however many of its directions hit the gap', () => {
    const [g] = rankGaps([gap('standing', 'B'), gap('standing', 'C')]);
    expect(g.screenCount).toBe(1);
    expect(g.screens).toEqual(['standing']);
    expect(g.hits).toBe(2);
    expect(g.directions).toEqual({ A: 0, B: 1, C: 1 });
  });

  it('breaks a tie on screens by total hits, then by key', () => {
    const ranked = rankGaps([
      gap('standing', 'B', { id: 'zeta' }),
      gap('standing', 'C', { id: 'zeta' }),
      gap('standing', 'B', { id: 'beta' }),
      gap('standing', 'B', { id: 'alpha' }),
    ]);
    expect(ranked.map((g) => g.id)).toEqual(['zeta', 'alpha', 'beta']);
  });

  it('merges two wordings of one gap when they share an id', () => {
    const ranked = rankGaps([
      gap('standing', 'C', { id: 'stage-chain', needed: 'A stepper for the lead stages' }),
      gap('leads', 'C', { id: 'stage-chain', needed: 'Stage chain with a count per stage' }),
    ]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].screenCount).toBe(2);
    expect(ranked[0].id).toBe('stage-chain');
  });

  it('merges gaps without an id on kind and wording folded for case, spacing and punctuation', () => {
    const ranked = rankGaps([
      gap('standing', 'C', { needed: 'A band section, with a count!' }),
      gap('pitch', 'C', { needed: 'a  band section with a COUNT' }),
    ]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].screenCount).toBe(2);
  });

  it('does not merge the same wording across different kinds', () => {
    const ranked = rankGaps([
      gap('standing', 'C', { kind: 'token', needed: 'Soft surface' }),
      gap('pitch', 'C', { kind: 'component', needed: 'Soft surface' }),
    ]);
    expect(ranked).toHaveLength(2);
  });

  it('keeps every proposal, workaround and piece of evidence of a merged gap', () => {
    const [g] = rankGaps([
      gap('standing', 'B', {
        id: 'x',
        proposal: 'Add X',
        didInstead: 'Used a Card',
        evidence: 'e1',
      }),
      gap('pitch', 'C', {
        id: 'x',
        proposal: 'Add X pattern',
        didInstead: 'Used a Card',
        evidence: 'e2',
      }),
    ]);
    expect(g.proposals).toEqual(['Add X', 'Add X pattern']);
    expect(g.didInstead).toEqual(['Used a Card']);
    // screens in the spec's priority order, then direction letter, whatever order they were read in
    expect(g.evidence).toEqual([
      { screen: 'standing', direction: 'B', evidence: 'e1' },
      { screen: 'pitch', direction: 'C', evidence: 'e2' },
    ]);
  });

  it('gives the same ranking whatever order the logs were read in', () => {
    const gaps = [
      gap('standing', 'B', { id: 'one' }),
      gap('pitch', 'B', { id: 'one' }),
      gap('leads', 'C', { id: 'two' }),
      gap('standing', 'C', { id: 'two', needed: 'Other wording' }),
    ];
    expect(rankGaps([...gaps].reverse())).toEqual(rankGaps(gaps));
  });

  it('returns nothing for no gaps', () => {
    expect(rankGaps([])).toEqual([]);
  });
});

function twoScreens() {
  const root = tmpDir();
  writeScreenRun(root, {
    screen: 'pitch',
    gaps: {
      B: [gap('pitch', 'B', { id: 'band-section', needed: 'A band section' })],
      C: [
        gap('pitch', 'C', {
          id: 'phone-action-bar',
          kind: 'component',
          needed: 'A phone action bar',
        }),
      ],
    },
  });
  writeScreenRun(root, {
    screen: 'standing',
    gaps: {
      B: [gap('standing', 'B', { id: 'band-section', needed: 'Band section with a count' })],
      C: [
        gap('standing', 'C', { id: 'band-section', needed: 'A band section' }),
        gap('standing', 'C', { id: 'label-value-lockup', needed: 'Label and value lockup' }),
      ],
    },
  });
  return root;
}

describe('buildIndex: the page', () => {
  it('links every board, in the priority order of the spec, whatever the directory order', () => {
    const { html, boards } = buildIndex({ runDirs: [twoScreens()] });
    const { doc } = open(html);
    expect(boards.map((b) => b.screen)).toEqual(['standing', 'pitch']);
    const links = [...doc.querySelectorAll('[data-board-link]')];
    expect(links.map((a) => a.dataset.boardLink)).toEqual(['standing', 'pitch']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['standing.html', 'pitch.html']);
    expect(doc.title).toBe('Explorations index');
  });

  it('points a board at its published URL when one is given, and only for http(s)', () => {
    const { doc } = open(
      buildIndex({
        runDirs: [twoScreens()],
        links: { standing: 'https://claude.ai/artifact/abc', pitch: 'javascript:alert(1)' },
      }).html,
    );
    const hrefs = Object.fromEntries(
      [...doc.querySelectorAll('[data-board-link]')].map((a) => [
        a.dataset.boardLink,
        a.getAttribute('href'),
      ]),
    );
    expect(hrefs.standing).toBe('https://claude.ai/artifact/abc');
    expect(hrefs.pitch).toBe('pitch.html');
  });

  it('shows each direction with its review score, and marks a direction that did not run', () => {
    const root = tmpDir();
    writeScreenRun(root, { screen: 'standing', directions: ['A', 'B'] });
    const { doc } = open(buildIndex({ runDirs: [root] }).html);
    const row = doc.querySelector('[data-board-row="standing"]');
    const chip = (l) => row.querySelector(`[data-chip="${l}"]`);
    expect(text(chip('A'))).toContain('7.5');
    expect(text(chip('B'))).toContain('8');
    expect(chip('C').dataset.state).toBe('absent');
    expect(text(chip('C'))).toContain('not run');
  });

  it('uses the newest run for a direction run on two dates, from a runs root', () => {
    const root = tmpDir();
    const old = path.join(root, '2026-10-12');
    const next = path.join(root, '2026-10-13');
    mkdirSync(old, { recursive: true });
    writeScreenRun(old, { screen: 'standing' });
    writeFileSync(
      path.join(old, 'standing-A', 'review.json'),
      JSON.stringify({ score: 5, max: 10, notes: 'old' }),
    );
    writeScreenRun(next, { screen: 'standing', directions: ['A'] });
    writeFileSync(
      path.join(next, 'standing-A', 'review.json'),
      JSON.stringify({ score: 9, max: 10, notes: 'new' }),
    );
    const { doc } = open(buildIndex({ runDirs: [root] }).html);
    const row = doc.querySelector('[data-board-row="standing"]');
    expect(text(row.querySelector('[data-chip="A"]'))).toContain('9');
    expect(text(row.querySelector('[data-chip="B"]'))).toContain('8'); // from the older run
  });

  it('ranks the gap table by screens hit and shows who hit each gap', () => {
    const built = buildIndex({ runDirs: [twoScreens()] });
    const { doc } = open(built.html);
    const rows = [...doc.querySelectorAll('[data-gap-row]')];
    expect(rows.map((r) => r.dataset.gapRow)).toEqual(built.gaps.map((g) => g.key));
    expect(rows[0].dataset.gapRow).toBe('band-section');
    expect(text(rows[0].querySelector('[data-col="screens"]'))).toContain('2 screens');
    expect(text(rows[0].querySelector('[data-col="screens"]'))).toContain('standing');
    expect(text(rows[0].querySelector('[data-col="screens"]'))).toContain('pitch');
    expect(text(rows[1].querySelector('[data-col="screens"]'))).toContain('1 screen');
    expect(text(rows[0].querySelector('[data-col="proposal"]'))).toContain(
      'Add a BandSection pattern',
    );
    expect(text(rows[0].querySelector('[data-col="rank"]'))).toBe('1');
  });

  it('keeps the table in its own scroll container so the page never scrolls sideways', () => {
    const { doc } = open(buildIndex({ runDirs: [twoScreens()] }).html);
    const table = doc.querySelector('table.gap-table');
    expect(table.closest('.table-scroll')).not.toBeNull();
  });

  it('says so when no gaps are logged', () => {
    const root = tmpDir();
    writeScreenRun(root, { screen: 'standing', gaps: { A: [], B: [], C: [] } });
    const { doc } = open(buildIndex({ runDirs: [root] }).html);
    expect(doc.querySelectorAll('[data-gap-row]')).toHaveLength(0);
    expect(text(doc.querySelector('.gap-empty'))).toContain('No gaps logged');
  });

  it('shows an invalid gap log in a problems list and does not rank it', () => {
    const root = tmpDir();
    writeScreenRun(root, {
      screen: 'standing',
      files: {
        B: { 'gaps.json': [{ screen: 'standing', direction: 'B', kind: 'wish', needed: 'x' }] },
        C: { 'gaps.json': '{oops' },
      },
    });
    const { html, problems, gaps } = buildIndex({ runDirs: [root] });
    const { doc } = open(html);
    const t = text(doc.querySelector('.bd-problems'));
    expect(t).toContain('standing-B');
    expect(t).toContain('kind "wish"');
    expect(t).toContain('standing-C');
    expect(t).toContain('not valid JSON');
    expect(problems).toHaveLength(2);
    expect(gaps).toEqual([]);
  });

  it('escapes the gap text it shows', () => {
    const root = tmpDir();
    writeScreenRun(root, {
      screen: 'standing',
      gaps: { B: [gap('standing', 'B', { needed: '<script>alert(1)</script> band', id: 'x' })] },
    });
    const { doc, errors } = open(buildIndex({ runDirs: [root] }).html);
    expect(doc.querySelectorAll('[data-gap-row] script')).toHaveLength(0);
    expect(text(doc.querySelector('[data-gap-row="x"]'))).toContain(
      '<script>alert(1)</script> band',
    );
    expect(errors).toEqual([]);
  });

  it('writes the Artifact page form on request', () => {
    const { html } = buildIndex({ runDirs: [twoScreens()], form: 'artifact' });
    expect(html).not.toMatch(/<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i);
    expect(html.trimStart().startsWith('<title>Explorations index</title>')).toBe(true);
  });

  it('supports light and dark with its own chrome tokens', () => {
    const { html } = buildIndex({ runDirs: [twoScreens()] });
    expect(html).toMatch(
      /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)/,
    );
    expect(html).toMatch(/:root\[data-theme="dark"\]\s*\{/);
  });
});

describe('buildIndex: accepting or rejecting a gap', () => {
  const hookBody = (html) => {
    const m = html.match(/<script id="decision-hook">([\s\S]*?)<\/script>/);
    expect(m, 'a <script id="decision-hook"> is in the page').not.toBeNull();
    return m[1];
  };

  it('has one marked no-op hook, recordGapDecision(gapKey, decision)', () => {
    const { html } = buildIndex({ runDirs: [twoScreens()] });
    const body = hookBody(html);
    expect(body).toMatch(/DECISION HOOK/);
    const ctx = vm.createContext({});
    vm.runInContext(body, ctx);
    expect(ctx.recordGapDecision.length).toBe(2);
    expect(ctx.recordGapDecision('band-section', 'accept')).toBeUndefined();
  });

  it('calls the hook with the gap key and the decision, and toggles back to undecided', async () => {
    const { doc, win } = open(buildIndex({ runDirs: [twoScreens()] }).html);
    const calls = [];
    win.recordGapDecision = (key, decision) => {
      calls.push([key, decision]);
      return Promise.resolve(true);
    };
    const row = doc.querySelector('[data-gap-row="band-section"]');
    row.querySelector('[data-decide="accept"]').click();
    await new Promise((r) => win.setTimeout(r, 0));
    expect(row.dataset.decision).toBe('accept');
    expect(row.querySelector('[data-decide="accept"]').getAttribute('aria-pressed')).toBe('true');
    row.querySelector('[data-decide="reject"]').click();
    await new Promise((r) => win.setTimeout(r, 0));
    expect(row.dataset.decision).toBe('reject');
    row.querySelector('[data-decide="reject"]').click();
    await new Promise((r) => win.setTimeout(r, 0));
    expect(row.dataset.decision).toBeUndefined();
    expect(calls).toEqual([
      ['band-section', 'accept'],
      ['band-section', 'reject'],
      ['band-section', 'clear'],
    ]);
  });

  it('does not claim a decision is stored while the hook is the default no-op', async () => {
    const { doc, win } = open(buildIndex({ runDirs: [twoScreens()] }).html);
    const row = doc.querySelector('[data-gap-row="band-section"]');
    row.querySelector('[data-decide="accept"]').click();
    await new Promise((r) => win.setTimeout(r, 0));
    expect(text(doc.querySelector('#decision-status'))).toMatch(/not stored/i);
  });

  it('claims a decision is stored only when the hook resolves to exactly true', async () => {
    for (const value of [{ id: 'gaps/band-section' }, 'ok', 1]) {
      const { doc, win } = open(buildIndex({ runDirs: [twoScreens()] }).html);
      win.recordGapDecision = () => Promise.resolve(value);
      doc.querySelector('[data-gap-row="band-section"] [data-decide="accept"]').click();
      await new Promise((r) => win.setTimeout(r, 0));
      expect(text(doc.querySelector('#decision-status')), String(value)).toMatch(/not stored/i);
    }
  });

  it('shows stored decisions when the page is told about them', () => {
    const { doc, win } = open(buildIndex({ runDirs: [twoScreens()] }).html);
    win.hdsIndex.setDecisions({ 'band-section': 'accept', 'label-value-lockup': 'reject' });
    expect(doc.querySelector('[data-gap-row="band-section"]').dataset.decision).toBe('accept');
    expect(doc.querySelector('[data-gap-row="label-value-lockup"]').dataset.decision).toBe(
      'reject',
    );
    expect(text(doc.querySelector('#decision-summary'))).toContain('1 accepted');
    expect(text(doc.querySelector('#decision-summary'))).toContain('1 rejected');
  });
});

describe('explorations-board CLI: index', () => {
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

  it('writes the index and prints what it found', () => {
    const out = path.join(tmpDir(), 'index.html');
    const links = path.join(tmpDir(), 'links.json');
    writeFileSync(links, JSON.stringify({ standing: 'https://claude.ai/artifact/abc' }));
    const r = cli(['index', twoScreens(), '--out', out, '--links', links]);
    expect(r.status).toBe(0);
    expect(existsSync(out)).toBe(true);
    expect(r.stdout).toMatch(/2 boards/);
    expect(r.stdout).toMatch(/3 gaps/);
    expect(readFileSync(out, 'utf8')).toContain('https://claude.ai/artifact/abc');
  });

  it('exits 1 under --strict when a gap log is invalid, and 0 without it', () => {
    const root = tmpDir();
    writeScreenRun(root, { screen: 'standing', files: { C: { 'gaps.json': '{oops' } } });
    const out = path.join(tmpDir(), 'index.html');
    expect(cli(['index', root, '--out', out]).status).toBe(0);
    expect(cli(['index', root, '--out', out, '--strict']).status).toBe(1);
  });

  it('exits 2 when there is nothing to index', () => {
    const r = cli(['index', tmpDir(), '--out', path.join(tmpDir(), 'i.html')]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/no directions/i);
  });
});
