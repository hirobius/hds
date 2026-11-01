// @vitest-environment node
/**
 * `hds-check` (bin/hds-check.mjs) — HDS's visual rules for any consumer repo's
 * HTML, CSS and JS, CSS inside template strings included (hds#664).
 *
 * The fixture table runs the bin at the process boundary: each rule has a
 * failing and a passing .html, .css and .js file in fixtures/hds-check/<rule>/.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkText, RULES } from '../../bin/lib/visual-rules.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = join(ROOT, 'bin', 'hds-check.mjs');
const FIXTURES = 'fixtures/hds-check';

function run(...args) {
  const r = spawnSync(process.execPath, [BIN, ...args], { cwd: ROOT, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

describe('hds-check fixtures: each rule fails and passes in HTML, CSS and JS', () => {
  for (const rule of RULES) {
    for (const ext of ['html', 'css', 'js']) {
      it(`${rule}: fail.${ext} exits 1 with file:line`, () => {
        const file = `${FIXTURES}/${rule}/fail.${ext}`;
        const { code, out } = run(file);
        expect(code).toBe(1);
        expect(out).toMatch(new RegExp(`^${file}:\\d+:\\d+ +\\[${rule}\\]`, 'm'));
      });

      it(`${rule}: pass.${ext} exits 0`, () => {
        const { code, out } = run(`${FIXTURES}/${rule}/pass.${ext}`);
        expect(out).toMatch(/^\[ok\]/m);
        expect(code).toBe(0);
      });
    }
  }
});

describe('hds-check CLI', () => {
  it('walks a directory and emits JSON with --json', () => {
    const { code, out } = run(`${FIXTURES}/fonts`, '--json');
    expect(code).toBe(1);
    const parsed = JSON.parse(out);
    expect(parsed.ok).toBe(false);
    expect(parsed.violations.every((v) => v.file.includes('/fail.'))).toBe(true);
    expect(parsed.violations[0]).toMatchObject({ rule: 'fonts', severity: 'error' });
    expect(parsed.violations[0].line).toBeGreaterThan(0);
  });

  it('runs one rule with --rule', () => {
    const { code } = run(`${FIXTURES}/shadows/fail.css`, '--rule', 'no-uppercase');
    expect(code).toBe(0);
  });

  it('runs through the node_modules/.bin symlink npm and pnpm install', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hds-check-'));
    const link = join(dir, 'hds-check');
    symlinkSync(BIN, link);
    const r = spawnSync(process.execPath, [link, `${FIXTURES}/shadows/fail.css`], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('[shadows]');
  });

  it('exits 2 with usage when given no paths or a missing path', () => {
    expect(run().code).toBe(2);
    expect(run('x.css', '--rule').code).toBe(2);
    expect(run('no/such/path.css').code).toBe(2);
    expect(run('x.css', '--rule', 'nope').code).toBe(2);
  });
});

describe('visual-rules core', () => {
  const rules = (text, file) => checkText(text, file).map((v) => v.rule);

  it('allows HDS faces and their fallbacks, from the shipped tokens', () => {
    expect(rules('a { font-family: "IBM Plex Mono", "Courier New", monospace; }', 'x.css')).toEqual(
      [],
    );
    expect(rules("const s = { fontFamily: 'Georgia' };", 'x.js')).toEqual(['fonts']);
  });

  it('flags the serif generic even as a fallback', () => {
    expect(rules('a { font-family: Sora, serif; }', 'x.css')).toEqual(['fonts']);
  });

  it('honors font-ok, shadow-ok and color-ok with a reason', () => {
    expect(
      rules('a { font-family: Georgia; } /* font-ok: quote block, approved */', 'x.css'),
    ).toEqual([]);
    expect(rules('a { box-shadow: 0 0 1px red; } /* shadow-ok: focus ring */', 'x.css')).toEqual(
      [],
    );
    expect(rules('a { color: #fff; } /* color-ok: logo */', 'x.css')).toEqual([]);
  });

  it('does not read href anchors, URLs or selectors as colors', () => {
    expect(rules('<a href="#fade">x</a>', 'x.html')).toEqual([]);
    expect(rules("el.closest('#bad');", 'x.js')).toEqual([]);
    expect(rules("const u = 'https://x.com/#fff';", 'x.js')).toEqual([]);
  });

  it('leaves template interpolations to the code that fills them', () => {
    expect(rules('const c = `a { font-family: ${f}; box-shadow: ${s}; }`;', 'x.js')).toEqual([]);
  });

  it('catches style assignments, vendor prefixes and any letter case', () => {
    expect(rules("el.style.boxShadow = '0 1px 2px red';", 'x.js')).toEqual(['shadows']);
    expect(rules("el.style.fontFamily = 'Georgia';", 'x.js')).toEqual(['fonts']);
    expect(rules("el.style.color = '#fff';", 'x.js')).toEqual(['raw-colors']);
    expect(rules('a { -webkit-box-shadow: 0 0 1px var(--x); }', 'x.css')).toEqual(['shadows']);
    expect(rules('a { color: RGB(0, 0, 0); }', 'x.css')).toEqual(['raw-colors']);
    expect(rules('a { text-transform: UPPERCASE; }', 'x.css')).toEqual(['no-uppercase']);
  });
});

describe('one rule source', () => {
  it('check-no-uppercase imports its core from the shipped rule module', () => {
    const src = readFileSync(join(ROOT, 'scripts/check-no-uppercase.mjs'), 'utf8');
    expect(src).toMatch(/from '\.\.\/bin\/lib\/visual-rules\.mjs'/);
    expect(src).not.toMatch(/const LINE_PATTERNS/);
  });

  it('ships the bin and its rule module', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.bin['hds-check']).toBe('bin/hds-check.mjs');
    expect(pkg.files).toContain('bin/');
  });
});
