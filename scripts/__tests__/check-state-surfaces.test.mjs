/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
//
// check-state-surfaces (hds#612). Seams under test, each observed from outside:
//   1. checkStateSurfaces({ root, today }) -> { violations, ok }   (the rules)
//   2. the CLI in fixture mode (FIXTURE_DIR), the way
//      validate-fixture-proof-of-firing runs it
//   3. the committed docs/state-surfaces.json against this repo
// Every rule is driven through a throwaway repo built on disk, so the tests
// name the behaviour (what the gate reports), never the gate's internals.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkStateSurfaces } from '../check-state-surfaces.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts/check-state-surfaces.mjs');
const TODAY = '2026-10-12';
/** A generator stub that, like the real ones, handles --check. */
const GEN = "if (process.argv.includes('--check')) process.exit(0);\n";

const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
});

/** A repo on disk: `files` maps path -> text; `surfaces` is the registry. */
function repo(files, surfaces, extra = {}) {
  const root = mkdtempSync(join(tmpdir(), 'state-surfaces-'));
  temps.push(root);
  const put = (rel, text) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  for (const [rel, text] of Object.entries(files)) put(rel, text);
  put('docs/state-surfaces.json', JSON.stringify({ surfaces, ...extra }, null, 2));
  return root;
}
const rules = (root, today = TODAY) =>
  checkStateSurfaces({ root, today }).violations.map((v) => v.rule);

const generated = (path, by = 'scripts/gen.mjs', check = 'node scripts/gen.mjs --check') => ({
  path,
  describes: 'x',
  kind: 'generated',
  by,
  check,
});
const editorial = (path, reviewedAt, maxAgeDays = 90) => ({
  path,
  describes: 'x',
  kind: 'editorial',
  owner: 'Adrian',
  reviewedAt,
  maxAgeDays,
});

describe('registered paths exist', () => {
  it('passes when every registered path exists', () => {
    const root = repo({ 'a.json': '{}', 'scripts/gen.mjs': GEN }, [generated('a.json')]);
    expect(rules(root)).toEqual([]);
  });

  it('fails a registered file that is gone, naming it', () => {
    const root = repo({ 'scripts/gen.mjs': GEN }, [generated('gone.json')]);
    const { violations, ok } = checkStateSurfaces({ root, today: TODAY });
    expect(ok).toBe(false);
    expect(violations.map((v) => [v.rule, v.file])).toEqual([['SURFACE_MISSING', 'gone.json']]);
  });

  it('accepts a directory as a surface', () => {
    const root = repo({ 'docs/agents/a.md': '# a\n', 'scripts/gen.mjs': GEN }, [
      editorial('docs/agents', '2026-10-01'),
    ]);
    expect(rules(root)).toEqual([]);
  });
});

describe('registry shape', () => {
  it('fails an unknown kind', () => {
    const root = repo({ 'a.md': '' }, [{ path: 'a.md', describes: 'x', kind: 'vibes' }]);
    expect(rules(root)).toContain('REGISTRY_INVALID');
  });

  it('requires generated and checked entries to name their generator or check', () => {
    const root = repo({ 'a.json': '{}' }, [{ path: 'a.json', describes: 'x', kind: 'generated' }]);
    expect(rules(root)).toContain('REGISTRY_INVALID');
    const checked = repo({ 'a.json': '{}' }, [{ path: 'a.json', describes: 'x', kind: 'checked' }]);
    expect(rules(checked)).toContain('REGISTRY_INVALID');
  });

  it('requires editorial entries to carry owner, reviewedAt and maxAgeDays', () => {
    const root = repo({ 'a.md': '' }, [{ path: 'a.md', describes: 'x', kind: 'editorial' }]);
    expect(rules(root)).toContain('REGISTRY_INVALID');
  });

  it('rejects a reviewedAt that is not a calendar day', () => {
    const root = repo({ 'a.md': '' }, [editorial('a.md', '2026-02-30')]);
    expect(rules(root)).toContain('REGISTRY_INVALID');
  });

  it('fails a registry file that is not there, with the fix', () => {
    const root = mkdtempSync(join(tmpdir(), 'state-surfaces-'));
    temps.push(root);
    const { violations } = checkStateSurfaces({ root, today: TODAY });
    expect(violations.map((v) => v.rule)).toEqual(['REGISTRY_MISSING']);
  });
});

describe('the generator or check a surface names', () => {
  it('fails a generator script that does not exist', () => {
    const root = repo({ 'a.json': '{}', 'scripts/gen.mjs': GEN }, [
      generated('a.json', 'scripts/nope.mjs'),
    ]);
    expect(rules(root)).toEqual(['BY_MISSING']);
  });

  it('accepts a `by` that is a command rather than a path', () => {
    const root = repo({ 'a.json': '{}', 'scripts/gen.mjs': GEN }, [
      generated('a.json', 'changesets (pnpm changeset:version)'),
    ]);
    expect(rules(root)).toEqual([]);
  });
});

describe('editorial review age', () => {
  it('passes a surface reviewed inside its max age', () => {
    const root = repo({ 'a.md': '' }, [editorial('a.md', '2026-09-01', 90)]);
    expect(rules(root)).toEqual([]);
  });

  it('passes on the last day of the window', () => {
    // 2026-07-14 + 90 days = 2026-10-12
    const root = repo({ 'a.md': '' }, [editorial('a.md', '2026-07-14', 90)]);
    expect(rules(root)).toEqual([]);
  });

  it('warns the day after, naming the owner, and still passes (exit 0)', () => {
    const root = repo({ 'a.md': '' }, [editorial('a.md', '2026-07-13', 90)]);
    const { violations, ok } = checkStateSurfaces({ root, today: TODAY });
    expect(violations.map((v) => [v.rule, v.severity])).toEqual([['REVIEW_DUE', 'warn']]);
    expect(violations[0].message).toContain('review due');
    expect(violations[0].message).toContain('Adrian');
    expect(ok).toBe(true);
  });

  it('fails the same surface under strictReview', () => {
    const root = repo({ 'a.md': '' }, [editorial('a.md', '2026-07-13', 90)]);
    const { violations, ok } = checkStateSurfaces({ root, today: TODAY, strictReview: true });
    expect(violations.map((v) => [v.rule, v.severity])).toEqual([['REVIEW_DUE', 'error']]);
    expect(ok).toBe(false);
  });

  it('rejects a reviewedAt in the future, so a bump cannot dodge the review', () => {
    const root = repo({ 'a.md': '' }, [editorial('a.md', '2026-10-13', 90)]);
    const { violations, ok } = checkStateSurfaces({ root, today: TODAY });
    expect(violations.map((v) => v.rule)).toEqual(['REGISTRY_INVALID']);
    expect(violations[0].message).toContain('future');
    expect(ok).toBe(false);
  });

  it('accepts a reviewedAt of today', () => {
    const root = repo({ 'a.md': '' }, [editorial('a.md', TODAY, 90)]);
    expect(rules(root)).toEqual([]);
  });

  it('does not age generated or checked surfaces', () => {
    const root = repo({ 'a.json': '{}', 'scripts/gen.mjs': GEN }, [
      { ...generated('a.json'), reviewedAt: '2020-01-01', maxAgeDays: 1 },
    ]);
    expect(rules(root)).toEqual([]);
  });
});

describe('a generated surface proves it is fresh', () => {
  const files = { 'a.json': '{}', 'scripts/gen.mjs': GEN };
  const entry = (extra) => ({
    path: 'a.json',
    describes: 'x',
    kind: 'generated',
    by: 'scripts/gen.mjs',
    ...extra,
  });
  const invalid = (surface, fs = files) => {
    const { violations } = checkStateSurfaces({ root: repo(fs, [surface]), today: TODAY });
    return violations.filter((v) => v.rule === 'REGISTRY_INVALID');
  };

  it('needs a `check` command, or an honest "freshness": "unchecked"', () => {
    const [v] = invalid(entry({}));
    expect(v.message).toContain('check');
    expect(v.message).toContain('unchecked');
    expect(invalid(entry({ freshness: 'unchecked' }))).toEqual([]);
  });

  it('accepts a node command whose script exists and handles --check', () => {
    expect(invalid(entry({ check: 'node scripts/gen.mjs --check' }))).toEqual([]);
  });

  it('fails a check whose script does not exist', () => {
    const [v] = invalid(entry({ check: 'node scripts/nope.mjs --check' }));
    expect(v.message).toContain('scripts/nope.mjs');
  });

  it('fails a --check command whose script source does not handle --check', () => {
    const [v] = invalid(entry({ check: 'node scripts/gen.mjs --check' }), {
      ...files,
      'scripts/gen.mjs': '// writes the file, never compares\n',
    });
    expect(v.message).toContain('--check');
  });

  it('accepts a dedicated checker run without --check, so long as it exists', () => {
    const fs = { ...files, 'scripts/check-it.mjs': '// compares\n' };
    expect(invalid(entry({ check: 'node scripts/check-it.mjs' }), fs)).toEqual([]);
  });

  it('rejects a check that is not a node command it can verify', () => {
    expect(invalid(entry({ check: 'pnpm check:it' }))).toHaveLength(1);
  });

  it('rejects "unchecked" together with a check, and any other freshness value', () => {
    expect(
      invalid(entry({ freshness: 'unchecked', check: 'node scripts/gen.mjs --check' })),
    ).toHaveLength(1);
    expect(invalid(entry({ freshness: 'trust-me' }))).toHaveLength(1);
  });

  it('counts the unchecked ones in the summary', () => {
    const root = repo(files, [entry({ freshness: 'unchecked' })]);
    expect(checkStateSurfaces({ root, today: TODAY }).summary.unchecked).toBe(1);
  });
});

describe('dead path references in registered markdown', () => {
  const doc = (body) =>
    repo({ 'README.md': body, 'real/file.md': '', 'scripts/gen.mjs': GEN }, [
      editorial('README.md', '2026-10-01'),
    ]);

  it('passes backticked paths and link targets that resolve', () => {
    expect(rules(doc('See `real/file.md` and [it](real/file.md#top).\n'))).toEqual([]);
  });

  it('fails a backticked repo path that does not exist, with file and line', () => {
    const { violations } = checkStateSurfaces({
      root: doc('Intro.\n\nSee `real/gone.md`.\n'),
      today: TODAY,
    });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ rule: 'DEAD_REFERENCE', file: 'README.md', line: 3 });
    expect(violations[0].message).toContain('real/gone.md');
  });

  it('fails a link target that does not exist', () => {
    expect(rules(doc('[x](real/gone.md)\n'))).toEqual(['DEAD_REFERENCE']);
  });

  it('resolves a link relative to the file that holds it', () => {
    const root = repo(
      { 'docs/a.md': '[b](b.md) and [c](../real/file.md)\n', 'docs/b.md': '', 'real/file.md': '' },
      [editorial('docs/a.md', '2026-10-01')],
    );
    expect(rules(root)).toEqual([]);
  });

  it('resolves a markdown link against the file that holds it, never the repo root', () => {
    const root = repo({ 'docs/a.md': '[x](real/file.md)\n', 'real/file.md': '' }, [
      editorial('docs/a.md', '2026-10-01'),
    ]);
    expect(rules(root)).toEqual(['DEAD_REFERENCE']);
  });

  it('still lets a backticked path name a repo-root file from a nested doc', () => {
    const root = repo({ 'docs/a.md': 'See `real/file.md`.\n', 'real/file.md': '' }, [
      editorial('docs/a.md', '2026-10-01'),
    ]);
    expect(rules(root)).toEqual([]);
  });

  it('resolves a root-absolute link from the repo root', () => {
    const ok = repo({ 'docs/a.md': '[x](/real/file.md#top)\n', 'real/file.md': '' }, [
      editorial('docs/a.md', '2026-10-01'),
    ]);
    expect(rules(ok)).toEqual([]);
    const bad = repo({ 'docs/a.md': '[x](/real/gone.md)\n', 'real/file.md': '' }, [
      editorial('docs/a.md', '2026-10-01'),
    ]);
    const { violations } = checkStateSurfaces({ root: bad, today: TODAY });
    expect(violations.map((v) => v.rule)).toEqual(['DEAD_REFERENCE']);
    expect(violations[0].message).toContain('/real/gone.md');
  });

  it('does not take a site route like /ops/standing for a repo path', () => {
    expect(rules(doc('[live](/ops/standing) and [api](/api/projects?x=1)\n'))).toEqual([]);
  });

  it('reads `path §n` as the path, in backticks or in prose', () => {
    expect(rules(doc('See `real/file.md §3` and real/file.md §4.2 here.\n'))).toEqual([]);
    const { violations } = checkStateSurfaces({
      root: doc('See `real/gone.md §3`.\n\nAlso real/also-gone.md §2.\n'),
      today: TODAY,
    });
    expect(violations.map((v) => [v.rule, v.line])).toEqual([
      ['DEAD_REFERENCE', 1],
      ['DEAD_REFERENCE', 3],
    ]);
  });

  it('skips HTML comments, one line or many, and keeps later line numbers right', () => {
    const body = [
      '<!-- see `real/gone.md` -->',
      '<!--',
      'multi `real/gone2.md` and [x](real/gone3.md)',
      '-->',
      'After: `real/gone4.md`.',
    ].join('\n');
    const { violations } = checkStateSurfaces({ root: doc(body), today: TODAY });
    expect(violations.map((v) => [v.rule, v.line])).toEqual([['DEAD_REFERENCE', 5]]);
    expect(violations[0].message).toContain('real/gone4.md');
  });

  it('ignores URLs, anchors, mailto, globs, placeholders, and absolute or home paths', () => {
    const body = [
      '[a](https://example.com/x.md) [b](#top) [c](mailto:a@b.co)',
      '`docs/*.md` `fixtures/<id>/x.json` `${HOME}/x/y.json` `~/x/y.json` `/etc/x/y.json`',
      '`@hirobius/design-system/tokens.json` `https://example.com/a/b.json`',
    ].join('\n');
    expect(rules(doc(body))).toEqual([]);
  });

  it('ignores fenced code blocks', () => {
    expect(rules(doc('```\ncat real/gone.md\n```\n'))).toEqual([]);
  });

  it('keeps a fence open until a fence at least as long closes it', () => {
    const body = [
      '````md',
      '```',
      'inner `real/gone.md`',
      '```',
      'still inside the outer fence `real/gone2.md`',
      '````',
      'outside `real/gone3.md`',
      '~~~',
      '```',
      'tilde fence `real/gone4.md`',
      '~~~',
    ].join('\n');
    const { violations } = checkStateSurfaces({ root: doc(body), today: TODAY });
    expect(violations.map((v) => v.line)).toEqual([7]);
  });

  it('ignores a path under an ignoreReferences prefix the registry declares', () => {
    const root = repo(
      { 'README.md': 'Build writes `dist/index.js`.\n' },
      [editorial('README.md', '2026-10-01')],
      { ignoreReferences: ['dist/'] },
    );
    expect(rules(root)).toEqual([]);
  });

  it('treats a path the repo gitignores as present (build output a clean checkout lacks)', () => {
    const root = repo(
      {
        'README.md':
          'Build writes `out/model.json` and `out/deep/x.js`; `other/gone.md` is dead.\n',
        '.gitignore': 'out/\n',
      },
      [editorial('README.md', '2026-10-01')],
    );
    execFileSync('git', ['init', '-q'], { cwd: root });
    const { violations } = checkStateSurfaces({ root, today: TODAY });
    expect(violations.map((v) => v.message).join('\n')).not.toContain('out/');
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('other/gone.md');
  });

  it('checks gitignored paths one by one when git rejects one of them', () => {
    // A path beyond a symlink makes `git check-ignore` abort a whole batch.
    const root = repo(
      {
        'README.md': 'Writes `out/model.json`; also `link/x.md` and `other/gone.md`.\n',
        '.gitignore': 'out/\n',
        'real/keep.md': '',
      },
      [editorial('README.md', '2026-10-01')],
    );
    symlinkSync(join(root, 'real'), join(root, 'link'));
    execFileSync('git', ['init', '-q'], { cwd: root });
    const { violations } = checkStateSurfaces({ root, today: TODAY });
    const text = violations.map((v) => v.message).join('\n');
    expect(text).not.toContain('out/model.json');
    expect(text).toContain('other/gone.md');
    expect(text).toContain('link/x.md');
  });

  it('strips a :line or #anchor suffix before resolving', () => {
    expect(rules(doc('`real/file.md:12` and `real/file.md#sec`\n'))).toEqual([]);
  });

  it('scans README, CLAUDE, CONTRIBUTING and AGENTS even when unregistered', () => {
    const root = repo(
      { 'CLAUDE.md': 'See `docs/gone.md`.\n', 'a.json': '{}', 'scripts/gen.mjs': GEN },
      [generated('a.json')],
    );
    expect(rules(root)).toEqual(['DEAD_REFERENCE']);
  });

  it('scans the markdown inside a registered directory', () => {
    const root = repo({ 'docs/agents/a.md': 'See `docs/gone.md`.\n' }, [
      editorial('docs/agents', '2026-10-01'),
    ]);
    expect(rules(root)).toEqual(['DEAD_REFERENCE']);
  });

  it('does not scan generated markdown (its generator owns the text)', () => {
    const root = repo({ 'llms-full.md': 'See `docs/gone.md`.\n', 'scripts/gen.mjs': GEN }, [
      generated('llms-full.md'),
    ]);
    expect(rules(root)).toEqual([]);
  });
});

describe('derived facts in always-on agent files', () => {
  const always = (body, extra = {}) =>
    repo({ 'CLAUDE.md': body, 'scripts/gen.mjs': GEN }, [editorial('CLAUDE.md', '2026-10-01')], {
      alwaysOn: ['CLAUDE.md'],
      ...extra,
    });
  const found = (body) => checkStateSurfaces({ root: always(body), today: TODAY }).violations;

  it('passes rules, read order and pointers', () => {
    expect(
      found('# Rules\n\nRead the north star first. Never push to main (see ADR-025, #612).\n'),
    ).toEqual([]);
  });

  it('flags a version string, naming file and line', () => {
    const [v] = found('Rules.\n\nHDS is at 0.24.1 today.\n');
    expect(v).toMatchObject({ rule: 'DERIVED_FACT', file: 'CLAUDE.md', line: 3 });
    expect(v.message).toContain('0.24.1');
  });

  it('flags a hand-kept count', () => {
    expect(found('There are 97 components and 81 gates.\n').map((v) => v.rule)).toEqual([
      'DERIVED_FACT',
      'DERIVED_FACT',
    ]);
  });

  it('does not flag a threshold a rule sets ("more than 50 files")', () => {
    expect(found('STOP if a fix touches more than 50 files, or at most 3 retries.\n')).toEqual([]);
  });

  it('flags a list of three or more issue or PR numbers', () => {
    expect(found('Open: #592, #593 and hds#601.\n').map((v) => v.rule)).toEqual(['DERIVED_FACT']);
  });

  it('does not flag provenance: one citation, or a pair like "(ops#292; hds#612)"', () => {
    expect(found('Gate added in hds#249.\n')).toEqual([]);
    expect(found('Budget ported from ops (ops#292; hds#612).\n')).toEqual([]);
  });

  it('still flags a count phrase about issues or PRs', () => {
    expect(found('There are 12 issues and 3 PRs.\n').map((v) => v.rule)).toEqual([
      'DERIVED_FACT',
      'DERIVED_FACT',
    ]);
  });

  it('flags "as of <date>" state, but not a provenance date in a heading', () => {
    expect(found('Roadmap as of 2026-10-12: all green.\n').map((v) => v.rule)).toEqual([
      'DERIVED_FACT',
    ]);
    expect(found('## Skill protocol (2026-07-11)\n')).toEqual([]);
  });

  it('skips fenced code and files that are not always-on', () => {
    expect(found('```\nversion 1.2.3, 40 components\n```\n')).toEqual([]);
    expect(found('````\n```\n```\n40 components inside the outer fence\n````\n')).toEqual([]);
    expect(found('<!-- 40 components -->\n')).toEqual([]);
    const root = repo(
      { 'README.md': 'v 1.2.3 and 40 components\n', 'CLAUDE.md': 'Rules only.\n' },
      [editorial('README.md', '2026-10-01')],
      {
        alwaysOn: ['CLAUDE.md'],
      },
    );
    expect(checkStateSurfaces({ root, today: TODAY }).violations).toEqual([]);
  });

  it('fails an alwaysOn file that does not exist', () => {
    const root = repo({}, [], { alwaysOn: ['CLAUDE.md'] });
    expect(rules(root)).toEqual(['SURFACE_MISSING']);
  });
});

describe('registerAll (opt-in): every doc in a listed directory is classified', () => {
  const files = {
    'docs/a.md': '',
    'docs/b.md': '',
    'docs/sub/c.md': '',
    'docs/archive/old.md': '',
  };
  const surfaces = [editorial('docs/a.md', '2026-10-01')];

  it('is off by default', () => {
    expect(rules(repo(files, surfaces))).toEqual([]);
  });

  it('flags a markdown file directly in a listed directory that no entry covers', () => {
    const root = repo(files, surfaces, { registerAll: ['docs'] });
    const { violations } = checkStateSurfaces({ root, today: TODAY });
    expect(violations.map((v) => [v.rule, v.file])).toEqual([['UNREGISTERED_DOC', 'docs/b.md']]);
  });

  it('counts a registered directory as covering what is inside it', () => {
    const root = repo({ ...files }, [...surfaces, editorial('docs/b.md', '2026-10-01')], {
      registerAll: ['docs'],
    });
    expect(rules(root)).toEqual([]);
  });
});

describe('--run-checks', () => {
  const exits = (code) => `process.exit(${code});\n`;
  const entry = { ...generated('a.json'), check: 'node scripts/check-it.mjs' };

  it('runs a declared check command and fails the surface when it exits non-zero', () => {
    const bad = repo({ 'a.json': '{}', 'scripts/gen.mjs': GEN, 'scripts/check-it.mjs': exits(3) }, [
      entry,
    ]);
    const ran = checkStateSurfaces({ root: bad, today: TODAY, runChecks: true });
    expect(ran.violations.map((v) => v.rule)).toEqual(['GENERATED_STALE']);
    const good = repo(
      { 'a.json': '{}', 'scripts/gen.mjs': GEN, 'scripts/check-it.mjs': exits(0) },
      [entry],
    );
    expect(checkStateSurfaces({ root: good, today: TODAY, runChecks: true }).ok).toBe(true);
  });

  it('does not run declared checks by default (pretest already runs them)', () => {
    const root = repo(
      { 'a.json': '{}', 'scripts/gen.mjs': GEN, 'scripts/check-it.mjs': exits(3) },
      [entry],
    );
    expect(rules(root)).toEqual([]);
  });
});

describe('CLI', () => {
  const run = (root, args = [], env = {}) => {
    const res = spawnSync('node', [SCRIPT, ...args], {
      env: { ...process.env, ...env },
      encoding: 'utf8',
    });
    return { status: res.status, stdout: res.stdout, stderr: res.stderr };
  };

  const NOW = ['--today', TODAY];

  it('exits 0 on a clean tree and 1 on a violating one, reading FIXTURE_DIR as the root', () => {
    const clean = repo({ 'a.md': '' }, [editorial('a.md', '2026-10-01')]);
    expect(run(clean, ['--fixture-mode', ...NOW], { FIXTURE_DIR: clean }).status).toBe(0);
    const bad = repo({ 'a.md': '' }, [editorial('gone.md', '2026-10-01')]);
    expect(run(bad, ['--fixture-mode', ...NOW], { FIXTURE_DIR: bad }).status).toBe(1);
  });

  it('prints a review-due warning and exits 0; --strict-review makes it exit 1', () => {
    const stale = repo({ 'a.md': '' }, [editorial('a.md', '2026-01-01', 30)]);
    const lax = run(stale, ['--root', stale, ...NOW]);
    expect(lax.status).toBe(0);
    expect(lax.stderr).toContain('review due');
    const strict = run(stale, ['--root', stale, '--strict-review', ...NOW]);
    expect(strict.status).toBe(1);
    expect(strict.stderr).toContain('review due');
  });

  it('takes --root and --registry, so another repo can vendor it', () => {
    const root = repo({ 'a.md': '' }, [editorial('a.md', '2026-10-01')]);
    mkdirSync(join(root, 'meta'));
    writeFileSync(
      join(root, 'meta/surfaces.json'),
      JSON.stringify({ surfaces: [editorial('a.md', '2026-10-01')] }),
    );
    expect(run(root, ['--root', root, '--registry', 'meta/surfaces.json', ...NOW]).status).toBe(0);
    expect(run(root, ['--root', root, '--registry', 'meta/nope.json', ...NOW]).status).toBe(1);
  });

  it('emits { violations, ok } with --json', () => {
    const bad = repo({}, [editorial('gone.md', '2026-10-01')]);
    const res = run(bad, ['--root', bad, '--json', ...NOW]);
    const out = JSON.parse(res.stdout);
    expect(out.ok).toBe(false);
    expect(out.violations[0].rule).toBe('SURFACE_MISSING');
  });
});

describe('this repo', () => {
  it('registers a state surface per kind and the committed tree passes the gate', () => {
    // Pinned: the review ages are measured against a fixed day, so this test
    // does not start failing when the calendar moves past a maxAgeDays.
    const result = checkStateSurfaces({ root: ROOT, today: TODAY, strictReview: true });
    expect(result.violations).toEqual([]);
    expect(Object.keys(result.summary.byKind).sort()).toEqual([
      'checked',
      'editorial',
      'generated',
    ]);
  });
});

describe('this repo: no generated file claims freshness it does not check', () => {
  it('every generated surface names a verified check or says "unchecked"', () => {
    const reg = JSON.parse(readFileSync(join(ROOT, 'docs/state-surfaces.json'), 'utf8'));
    for (const g of reg.surfaces.filter((x) => x.kind === 'generated')) {
      expect(Boolean(g.check) !== (g.freshness === 'unchecked'), g.path).toBe(true);
    }
  });
});

describe("this repo: a generated surface's check actually runs somewhere", () => {
  it('is in the pretest chain, or is a script registered as a gate', () => {
    const reg = JSON.parse(readFileSync(join(ROOT, 'docs/state-surfaces.json'), 'utf8'));
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const gates = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
    const gateScripts = new Set(gates.gates.map((g) => g.gateScript));
    for (const s of reg.surfaces.filter((x) => x.check)) {
      const script = s.check.split(/\s+/)[1];
      const runs = pkg.scripts.pretest.includes(s.check) || gateScripts.has(script);
      expect(runs, `${s.path}: ${s.check}`).toBe(true);
    }
  });
});
