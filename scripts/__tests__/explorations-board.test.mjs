/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The explorations board (hirobius/hds#628, phase 0).
 *
 * `buildBoard` turns one screen's run directory into ONE self-contained HTML
 * file: three directions side by side, tabs for theme and viewport, a side panel
 * per direction (rationale, 21st references, bend log, review score), every
 * screenshot inlined as a data URI. These tests read the file the way a viewer
 * does: the HTML a consumer gets, and the page's behavior in jsdom. They never
 * look at how the module builds the string.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { JSDOM, VirtualConsole } from 'jsdom';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { buildBoard } from '../lib/explorations/board.mjs';
import { tmpDir, writeScreenRun } from './helpers/board-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = path.join(ROOT, 'scripts', 'explorations-board.mjs');

function run(opts = {}) {
  const runDir = writeScreenRun(tmpDir(), opts);
  return runDir;
}

function board(opts = {}, build = {}) {
  const runDir = run(opts);
  return { runDir, ...buildBoard({ runDir, screen: opts.screen ?? 'standing', ...build }) };
}

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

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();

describe('buildBoard: the page a viewer opens', () => {
  it('shows the three directions side by side with their names and questions', () => {
    const { html } = board();
    const { doc } = open(html);
    const dirs = [...doc.querySelectorAll('.dir')];
    expect(dirs.map((d) => d.dataset.dir)).toEqual(['A', 'B', 'C']);
    expect(text(dirs[0])).toContain('Faithful');
    expect(text(dirs[0])).toContain('Is HDS enough as it is?');
    expect(text(dirs[1])).toContain('Ceiling');
    expect(text(dirs[1])).toContain('How far do tokens alone go?');
    expect(text(dirs[2])).toContain('Wildcard');
    expect(text(dirs[2])).toContain('What should HDS add?');
  });

  it('names the screen and gives the page a short title', () => {
    const { html } = board();
    const { doc } = open(html);
    expect(text(doc.querySelector('h1'))).toBe('Standing');
    expect(doc.title).toBe('Standing directions');
  });

  it('inlines every screenshot as a PNG data URI and loads nothing from elsewhere', () => {
    const { html } = board();
    const { doc } = open(html);
    const imgs = [...doc.querySelectorAll('img.shot-img')];
    expect(imgs).toHaveLength(12);
    for (const img of imgs) {
      expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/);
      expect(img.getAttribute('alt')).toMatch(/direction, (light|dark) theme, (1280|390) wide/);
    }
    expect(doc.querySelectorAll('link, script[src], iframe, object, embed')).toHaveLength(0);
    expect(html).not.toMatch(/(?:src|href)=["']https?:\/\/[^"']*\.(?:css|js|png|jpe?g|woff2?)/);
    expect(html).not.toMatch(/@import|url\(\s*["']?https?:/);
  });

  it('has a tile for every direction, theme and viewport', () => {
    const { html } = board();
    const { doc } = open(html);
    for (const d of ['A', 'B', 'C'])
      for (const theme of ['light', 'dark'])
        for (const vp of ['1280', '390']) {
          expect(
            doc.querySelectorAll(`.shot[data-dir="${d}"][data-theme="${theme}"][data-vp="${vp}"]`),
          ).toHaveLength(1);
        }
  });

  it('puts the rationale, the review score and its notes in each direction panel', () => {
    const { doc } = open(board().html);
    const a = doc.querySelector('.dir[data-dir="A"]');
    expect(text(a.querySelector('[data-sec="rationale"]'))).toContain(
      'each band is an open row with a divider',
    );
    const review = text(a.querySelector('[data-sec="review"]'));
    expect(review).toContain('7.5');
    expect(review).toContain('/10');
    expect(review).toContain('Hierarchy holds at 390.');
    expect(review).toContain('Dark surfaces are close to flat.');
    // notes may be a plain string
    expect(text(doc.querySelector('.dir[data-dir="B"] [data-sec="review"]'))).toContain(
      'the count chip is small at 390',
    );
  });

  it('lists the 21st searches, links and what each took, and the demo tenant', () => {
    const { doc } = open(board().html);
    const c = doc.querySelector('.dir[data-dir="C"]');
    const refs = c.querySelector('[data-sec="refs"]');
    expect(text(refs)).toContain('sticky section header list');
    expect(text(refs)).toContain('Preview hid the pin offset.');
    const links = [...refs.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'https://21st.dev/example/sticky-sections',
      'https://21st.dev/example/band-motion',
    ]);
    for (const a of links) {
      expect(a.getAttribute('rel')).toContain('noopener');
      expect(a.getAttribute('target')).toBe('_blank');
    }
    expect(text(refs)).toContain('The header pins under the title.');
    expect(text(c.querySelector('.dir-meta'))).toContain('accent-pair-demo');
    expect(text(doc.querySelector('.dir[data-dir="A"] .dir-meta'))).toContain('HDS default');
  });

  it('lists every bend with the system change that would make it legal', () => {
    const { doc } = open(board().html);
    const bends = doc.querySelector('.dir[data-dir="C"] [data-sec="bends"]');
    const t = text(bends);
    expect(t).toContain('No gradients');
    expect(t).toContain('Add a scroll-edge fade token to the Page pattern.');
    expect(t).toContain('#1a2b3c');
    expect(t).toContain('src/App.tsx');
    expect(t).toContain('Add a semantic.surface.pinned token.');
    expect(text(doc.querySelector('.dir[data-dir="A"] [data-sec="bends"]'))).toContain(
      'No bends logged',
    );
  });

  it('lists the direction gaps', () => {
    const { doc } = open(board().html);
    const gaps = doc.querySelector('.dir[data-dir="B"] [data-sec="gaps"]');
    expect(text(gaps)).toContain('A band section with a count and show all');
    expect(text(gaps)).toContain('Add a BandSection pattern');
    expect(text(doc.querySelector('.dir[data-dir="A"] [data-sec="gaps"]'))).toContain(
      'No gaps logged',
    );
  });
});

describe('buildBoard: nothing is ever blank', () => {
  it('shows a visible "missing" tile for a screenshot that is not there', () => {
    const { html, missing } = board({ omit: ['standing-A/screenshots/dark-390.png'] });
    const { doc } = open(html);
    const tile = doc.querySelector('.shot[data-dir="A"][data-theme="dark"][data-vp="390"]');
    expect(tile.classList.contains('missing')).toBe(true);
    expect(text(tile)).toContain('Missing');
    expect(text(tile)).toContain('screenshots/dark-390.png');
    expect(tile.querySelector('img')).toBeNull();
    expect(doc.querySelectorAll('.shot.missing')).toHaveLength(1);
    expect(doc.querySelectorAll('img.shot-img')).toHaveLength(11);
    expect(missing).toEqual([{ direction: 'A', file: 'dark-390.png' }]);
    // and the top of the page says so
    expect(text(doc.querySelector('.bd-sub'))).toContain('11 of 12 captures');
  });

  it('treats a file that is not a PNG as missing, and says why', () => {
    const runDir = run();
    writeFileSync(path.join(runDir, 'standing-B/screenshots/light-1280.png'), 'not a png');
    const { html } = buildBoard({ runDir, screen: 'standing' });
    const { doc } = open(html);
    const tile = doc.querySelector('.shot[data-dir="B"][data-theme="light"][data-vp="1280"]');
    expect(tile.classList.contains('missing')).toBe(true);
    expect(text(tile)).toContain('not a readable PNG');
  });

  it('shows a placeholder column for a direction that is not in the run', () => {
    const { html } = board({ directions: ['A', 'B'] });
    const { doc } = open(html);
    const c = doc.querySelector('.dir[data-dir="C"]');
    expect(c).not.toBeNull();
    expect(text(c)).toContain('Wildcard');
    expect(text(c)).toContain('Not in this run');
    expect(c.querySelectorAll('img')).toHaveLength(0);
  });

  it('shows each absent panel file as a visible note', () => {
    const { html } = board({
      files: { A: { 'rationale.md': null, 'review.json': null, 'refs.json': null } },
    });
    const { doc } = open(html);
    const a = doc.querySelector('.dir[data-dir="A"]');
    expect(text(a.querySelector('[data-sec="rationale"]'))).toContain('rationale.md is missing');
    expect(text(a.querySelector('[data-sec="review"]'))).toContain('No review yet');
    expect(text(a.querySelector('[data-sec="refs"]'))).toContain('refs.json is missing');
  });

  it('reports a malformed JSON file on the page and keeps rendering the rest', () => {
    const { html, problems } = board({ files: { B: { 'refs.json': '{not json' } } });
    const { doc } = open(html);
    const b = doc.querySelector('.dir[data-dir="B"]');
    expect(text(b.querySelector('[data-sec="refs"]'))).toContain('refs.json is not valid JSON');
    expect(text(b.querySelector('[data-sec="rationale"]'))).toContain('Ceiling');
    expect(text(doc.querySelector('.bd-problems'))).toContain('standing-B');
    expect(text(doc.querySelector('.bd-problems'))).toContain('refs.json');
    expect(problems.some((p) => p.includes('standing-B') && p.includes('refs.json'))).toBe(true);
  });

  it('shows every missing file and malformed file in one problems list', () => {
    const { doc } = open(
      board({
        omit: ['standing-C/screenshots/light-390.png'],
        files: { C: { 'review.json': '[' } },
      }).html,
    );
    const t = text(doc.querySelector('.bd-problems'));
    expect(t).toContain('standing-C/screenshots/light-390.png');
    expect(t).toContain('standing-C/review.json');
  });

  it('has no problems list on a clean run', () => {
    const { doc } = open(board().html);
    expect(doc.querySelector('.bd-problems')).toBeNull();
  });
});

describe('buildBoard: text from the run files is data, never markup', () => {
  it('escapes HTML in the rationale, review notes and refs', () => {
    const { html } = board({
      files: {
        A: {
          'rationale.md': '<img src=x onerror=alert(1)> and <script>alert(2)</script>\n',
          'review.json': { score: '<b>9</b>', notes: ['<script>alert(3)</script>'] },
        },
      },
    });
    const { doc, errors } = open(html);
    const a = doc.querySelector('.dir[data-dir="A"]');
    expect(
      a.querySelectorAll('[data-sec="rationale"] img, [data-sec="rationale"] script'),
    ).toHaveLength(0);
    expect(text(a.querySelector('[data-sec="rationale"]'))).toContain('<script>alert(2)</script>');
    expect(a.querySelector('[data-sec="review"] b')).toBeNull();
    expect(errors).toEqual([]);
  });

  it('turns only https and http references into links', () => {
    const { doc } = open(
      board({
        files: {
          A: {
            'refs.json': {
              tenant: null,
              searches: [],
              refs: [
                { url: 'javascript:alert(1)', took: 'bad one' },
                { url: 'data:text/html,hi', took: 'data one' },
                { url: 'https://21st.dev/example/ok', took: 'good one' },
              ],
            },
          },
        },
      }).html,
    );
    const hrefs = [...doc.querySelectorAll('.dir[data-dir="A"] [data-sec="refs"] a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toEqual(['https://21st.dev/example/ok']);
    expect(text(doc.querySelector('.dir[data-dir="A"] [data-sec="refs"]'))).toContain('bad one');
  });
});

describe('buildBoard: light, dark and the Artifact page shape', () => {
  it('defines its chrome tokens for light, system dark and an explicit dark', () => {
    const { html } = board();
    expect(html).toMatch(/:root\s*\{[^}]*--bd-bg:/);
    expect(html).toMatch(
      /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)/,
    );
    expect(html).toMatch(/:root\[data-theme="dark"\]\s*\{/);
    expect(html).toMatch(/body\s*\{[^}]*background:\s*var\(--bd-bg\)/);
  });

  it('writes a standalone document by default', () => {
    const { html } = board();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain('<html lang="en"');
  });

  it('writes the Artifact page form on request: no document wrapper, title first', () => {
    const { html } = board({}, { form: 'artifact' });
    expect(html).not.toMatch(/<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i);
    expect(html.trimStart().startsWith('<title>Standing directions</title>')).toBe(true);
    expect(html).toContain('<style>');
    expect(html).toContain('data-board');
  });

  it('reports its own byte size', () => {
    const { html, bytes } = board();
    expect(bytes).toBe(Buffer.byteLength(html));
  });
});

describe('buildBoard: the size budget', () => {
  const big = { noise: true, size: [320, 200] };

  it('leaves images alone when the page fits', () => {
    const { downscaled, html } = board(big);
    expect(downscaled).toEqual([]);
    expect(open(html).doc.querySelector('.shot-cap').textContent).not.toMatch(/scaled/);
  });

  it('downscales the heaviest screenshots until the page fits, and says so', () => {
    const unscaled = board(big);
    const budgetBytes = Math.round(unscaled.bytes * 0.5);
    const { html, bytes, downscaled } = board(big, { budgetBytes });
    expect(bytes).toBeLessThanOrEqual(budgetBytes);
    expect(downscaled.length).toBeGreaterThan(0);
    for (const d of downscaled) {
      expect(d.scale).toBeLessThan(1);
      expect(d.toBytes).toBeLessThan(d.fromBytes);
      expect(d.file).toMatch(/^standing-[ABC]\/screenshots\/(light|dark)-1280\.png$/);
    }
    const { doc } = open(html);
    const caps = [...doc.querySelectorAll('.shot-cap')].map((c) => text(c));
    expect(caps.filter((c) => /scaled to \d+%/.test(c))).toHaveLength(downscaled.length);
    // a downscaled tile keeps its logical width, so the lightbox shows the page at its real size
    const scaledImg = [...doc.querySelectorAll('img.shot-img')].find(
      (i) => i.dataset.scale && i.dataset.scale !== '1',
    );
    expect(scaledImg.dataset.w).toBe('320');
    const header = Buffer.from(scaledImg.getAttribute('src').split(',')[1], 'base64');
    const decoded = PNG.sync.read(header);
    expect(decoded.width).toBe(Number(scaledImg.getAttribute('width')));
    expect(decoded.height).toBe(Number(scaledImg.getAttribute('height')));
    expect(decoded.width).toBeLessThan(320);
  });

  it('fails loudly when even the smallest scale cannot fit the page', () => {
    const run1 = run(big);
    expect(() => buildBoard({ runDir: run1, screen: 'standing', budgetBytes: 20_000 })).toThrow(
      /20000|too large|budget/i,
    );
  });

  it('defaults to a budget well under the 16 MB page limit', () => {
    const { budgetBytes } = board();
    expect(budgetBytes).toBeLessThan(16 * 1024 * 1024);
    expect(budgetBytes).toBeGreaterThan(8 * 1024 * 1024);
  });
});

describe('the page behavior in a browser', () => {
  const view = (doc) => ({
    theme: doc.querySelector('[data-board]').dataset.theme,
    vp: doc.querySelector('[data-board]').dataset.vp,
  });

  it('opens on light at 1280 with every direction in view', () => {
    const { doc, errors } = open(board().html);
    expect(errors).toEqual([]);
    expect(view(doc)).toEqual({ theme: 'light', vp: '1280' });
    const pressed = [...doc.querySelectorAll('.bd-controls [aria-pressed="true"]')].map((b) =>
      text(b),
    );
    expect(pressed).toEqual(['Light', '1280']);
  });

  it('switches theme and viewport with the tabs, for every direction at once', () => {
    const { doc, win } = open(board().html);
    doc.querySelector('[data-set-theme="dark"]').click();
    doc.querySelector('[data-set-vp="390"]').click();
    expect(view(doc)).toEqual({ theme: 'dark', vp: '390' });
    expect(doc.querySelector('[data-set-theme="dark"]').getAttribute('aria-pressed')).toBe('true');
    expect(doc.querySelector('[data-set-theme="light"]').getAttribute('aria-pressed')).toBe(
      'false',
    );
    const shown = [...doc.querySelectorAll('.shot')].filter(
      (s) => win.getComputedStyle(s).display !== 'none',
    );
    expect(shown.map((s) => `${s.dataset.dir}-${s.dataset.theme}-${s.dataset.vp}`)).toEqual([
      'A-dark-390',
      'B-dark-390',
      'C-dark-390',
    ]);
  });

  it('opens a screenshot full size and closes it with Escape', () => {
    const { doc, win } = open(board().html);
    doc.querySelector('.shot-btn').click();
    const box = doc.querySelector('.lightbox');
    expect(box).not.toBeNull();
    expect(box.getAttribute('role')).toBe('dialog');
    // the fixture's 1280 capture is 64 px wide; the lightbox shows a capture at the width it was taken
    expect(box.querySelector('img').style.width).toBe('64px');
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(doc.querySelector('.lightbox')).toBeNull();
  });

  describe('the pick hook', () => {
    const hook = (html) => {
      const m = html.match(/<script id="pick-hook">([\s\S]*?)<\/script>/);
      expect(m, 'a <script id="pick-hook"> is in the page').not.toBeNull();
      return m[1];
    };

    it('is one marked script holding one function, recordPick(screen, pick)', () => {
      const { html } = board();
      const body = hook(html);
      expect(body).toMatch(/PICK HOOK/);
      expect([...html.matchAll(/function recordPick\(/g)]).toHaveLength(1);
      expect([...body.matchAll(/function\s+\w+\(/g)]).toHaveLength(1);
    });

    it('does nothing by default', () => {
      const ctx = vm.createContext({});
      vm.runInContext(hook(board().html), ctx);
      expect(typeof ctx.recordPick).toBe('function');
      expect(ctx.recordPick.length).toBe(2);
      expect(ctx.recordPick('standing', { direction: 'A', note: '', at: 'now' })).toBeUndefined();
    });

    it('is called with the screen and the pick when Adrian records one', async () => {
      const { doc, win } = open(board().html);
      const calls = [];
      win.recordPick = (screen, pick) => {
        calls.push([screen, pick]);
        return Promise.resolve(true);
      };
      doc.querySelector('input[name="pick"][value="B"]').click();
      doc.querySelector('#pick-note').value = 'B, but with the C header';
      doc.querySelector('#pick-save').click();
      await new Promise((r) => win.setTimeout(r, 0));
      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toBe('standing');
      expect(calls[0][1]).toMatchObject({ direction: 'B', note: 'B, but with the C header' });
      expect(Number.isNaN(Date.parse(calls[0][1].at))).toBe(false);
      expect(text(doc.querySelector('#pick-status'))).toMatch(/saved/i);
    });

    it('says plainly that nothing is stored while the hook is the default no-op', async () => {
      const { doc, win } = open(board().html);
      doc.querySelector('input[name="pick"][value="A"]').click();
      doc.querySelector('#pick-save').click();
      await new Promise((r) => win.setTimeout(r, 0));
      expect(text(doc.querySelector('#pick-status'))).toMatch(/not stored/i);
      expect(text(doc.querySelector('#pick-status'))).not.toMatch(/\bsaved\b/i);
    });

    it('reports a failed save instead of claiming one', async () => {
      const { doc, win } = open(board().html);
      win.recordPick = () => Promise.reject(new Error('quota exceeded'));
      doc.querySelector('input[name="pick"][value="C"]').click();
      doc.querySelector('#pick-save').click();
      await new Promise((r) => win.setTimeout(r, 0));
      expect(text(doc.querySelector('#pick-status'))).toMatch(/could not save/i);
      expect(text(doc.querySelector('#pick-status'))).toContain('quota exceeded');
    });

    it('needs a note before a mix can be recorded', () => {
      const { doc } = open(board().html);
      const save = doc.querySelector('#pick-save');
      expect(save.disabled).toBe(true); // nothing chosen yet
      doc.querySelector('input[name="pick"][value="mix"]').click();
      expect(save.disabled).toBe(true);
      const note = doc.querySelector('#pick-note');
      note.value = 'A rows, C header';
      note.dispatchEvent(new note.ownerDocument.defaultView.Event('input', { bubbles: true }));
      expect(save.disabled).toBe(false);
    });

    it('shows a stored pick when the page is told about it', () => {
      const { doc, win } = open(board().html);
      win.hdsBoard.setPick({
        direction: 'C',
        note: 'C, quieter header',
        at: '2026-10-13T09:00:00Z',
      });
      expect(doc.querySelector('input[name="pick"][value="C"]').checked).toBe(true);
      expect(doc.querySelector('#pick-note').value).toBe('C, quieter header');
      expect(doc.querySelector('.dir[data-dir="C"]').dataset.picked).toBe('true');
      expect(doc.querySelector('.dir[data-dir="A"]').dataset.picked).toBeUndefined();
    });
  });
});

describe('explorations-board CLI: board', () => {
  const cli = (args, opts = {}) =>
    spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', ...opts });

  it('writes the page and prints a one-line summary', () => {
    const runDir = run();
    const out = path.join(tmpDir(), 'standing.html');
    const r = cli(['board', runDir, 'standing', '--out', out]);
    expect(r.status).toBe(0);
    expect(existsSync(out)).toBe(true);
    expect(statSync(out).size).toBeGreaterThan(1000);
    expect(r.stdout).toContain('standing');
    expect(r.stdout).toMatch(/12 of 12 captures/);
    expect(readFileSync(out, 'utf8').startsWith('<!doctype html>')).toBe(true);
  });

  it('warns about a missing capture and still exits 0; --strict makes it exit 1', () => {
    const runDir = run({ omit: ['standing-B/screenshots/dark-1280.png'] });
    const out = path.join(tmpDir(), 'standing.html');
    const loose = cli(['board', runDir, 'standing', '--out', out]);
    expect(loose.status).toBe(0);
    expect(loose.stderr).toContain('standing-B/screenshots/dark-1280.png');
    expect(existsSync(out)).toBe(true);
    const strict = cli(['board', runDir, 'standing', '--out', out, '--strict']);
    expect(strict.status).toBe(1);
  });

  it('writes the Artifact page form with --artifact', () => {
    const runDir = run();
    const out = path.join(tmpDir(), 'standing.html');
    expect(cli(['board', runDir, 'standing', '--out', out, '--artifact']).status).toBe(0);
    expect(readFileSync(out, 'utf8')).not.toMatch(/<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i);
  });

  it('exits 2 when the run has no directions for that screen', () => {
    const runDir = run();
    const r = cli(['board', runDir, 'pitch', '--out', path.join(tmpDir(), 'x.html')]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/no directions for screen "pitch"/);
  });

  it('exits 2 on a missing run directory and on a missing --out', () => {
    expect(cli(['board', path.join(tmpDir(), 'nope'), 'standing', '--out', 'x.html']).status).toBe(
      2,
    );
    expect(cli(['board', run(), 'standing']).status).toBe(2);
  });

  it('prints usage with --help', () => {
    const r = cli(['--help']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Usage: node scripts\/explorations-board\.mjs/);
    expect(r.stdout).toContain('board');
    expect(r.stdout).toContain('index');
  });
});
