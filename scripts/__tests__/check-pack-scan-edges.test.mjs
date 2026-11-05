/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Edge cases for scripts/check-pack-scan.mjs (ops#27), written to kill the
 * mutants Stryker found surviving the behaviour tests in check-pack-scan.test.mjs.
 * Fake gitleaks binaries are tiny shell scripts in temp dirs.
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CLIENT_NEEDLE_HASHES,
  findClientTerms,
  findGitleaks,
  findGoogleDocs,
  gitleaksDir,
  main,
  packAndUnpack,
  parseDenylist,
  report,
  scanFileText,
  scanPackage,
  strayFiles,
} from '../check-pack-scan.mjs';
import { useTempDirs } from './helpers/temp-dirs.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG = path.join(ROOT, '.gitleaks.toml');
const makeTmp = useTempDirs('pack-scan-edges-');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const h = (s) => [sha(s)];
const NOT_IN = 'not in package.json "files"';

function makePackage(files, pkg = { name: 'edge', version: '1.0.0', files: ['lib'] }) {
  const dir = makeTmp();
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

function fakeBin(script) {
  const f = path.join(makeTmp(), 'fake-gitleaks');
  writeFileSync(f, `#!/bin/sh\n${script}\n`);
  chmodSync(f, 0o755);
  return f;
}

describe('strayFiles edges', () => {
  it.each(['package.json', 'README.md', 'readme', 'LICENCE.txt', 'LICENSE', 'NOTICE.md'])(
    'always ships %s',
    (f) => {
      expect(strayFiles([f], ['lib'])).toEqual([]);
    },
  );
  it.each(['lib2/package.json', 'docs/README.md', 'xpackage.json', 'package.jsonx', 'lib2/a'])(
    'anchors the always-ship names: %s is stray',
    (f) => {
      expect(strayFiles([f], ['lib'])).toEqual([{ file: f, reason: NOT_IN }]);
    },
  );
  it('normalises "./lib/" and "lib//" entries', () => {
    expect(strayFiles(['lib/a.js', 'lib'], ['./lib/'])).toEqual([]);
    expect(strayFiles(['lib/a.js'], ['lib//'])).toEqual([]);
  });
  it.each([
    ['lib/fixture/a.json', 'fixture'],
    ['lib/Fixtures/a.json', 'Fixtures'],
    ['lib/test/a.js', 'test'],
    ['lib/__mocks__/a.js', '__mocks__'],
    ['lib/__fixtures__/a.js', '__fixtures__'],
    ['lib/.git/config', '.git'],
    ['lib/.env', '.env'],
    ['lib/.status', '.status'],
  ])('names the forbidden segment of %s', (f, seg) => {
    expect(strayFiles([f], ['lib'])).toEqual([
      { file: f, reason: `forbidden path segment "${seg}"` },
    ]);
  });
  it.each([
    'lib/myfixtures/a.js',
    'lib/fixtures2/a.js',
    'lib/testing/a.js',
    'lib/x.status/a.js',
    'lib/a.status',
    'lib/a.git/b',
    'lib/contest/a.js',
    'lib/my.env',
  ])('anchors segments: %s ships', (f) => {
    expect(strayFiles([f], ['lib'])).toEqual([]);
  });
  it.each(['lib/a.test.mjs', 'lib/a.spec.cts', 'lib/a.test.tsx', 'lib/a.test.js', 'lib/a.test.ts'])(
    'flags test file %s',
    (f) => {
      expect(strayFiles([f], ['lib'])).toEqual([{ file: f, reason: 'test file' }]);
    },
  );
  it.each(['lib/a.test.js.map', 'lib/a.test.xjs', 'lib/a-test.js', 'lib/a.testy.js'])(
    '%s is not a test file',
    (f) => {
      expect(strayFiles([f], ['lib'])).toEqual([]);
    },
  );
});

describe('client ids, denylist and Google Docs edges', () => {
  it('ships exactly the three ops#27 hashes, well formed and distinct', () => {
    expect(CLIENT_NEEDLE_HASHES).toHaveLength(3);
    for (const x of CLIENT_NEEDLE_HASHES) expect(x).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set(CLIENT_NEEDLE_HASHES).size).toBe(3);
  });
  it('reports the matched length for each separator', () => {
    expect(findClientTerms('a b-blue heron co', { hashes: h('blue heron co') })).toEqual([
      { rule: 'client-id', length: 13 },
    ]);
    expect(findClientTerms('x_blue_heron_co', { hashes: h('blue_heron_co') })).toEqual([
      { rule: 'client-id', length: 13 },
    ]);
  });
  it('matches 2- to 4-part needles at any offset, not 1 or 5 parts', () => {
    expect(findClientTerms('q-w-e-r-t', { hashes: h('e-r-t') })).toHaveLength(1);
    expect(findClientTerms('q-w-e-r-t', { hashes: h('r-t') })).toHaveLength(1);
    expect(findClientTerms('q-w-e-r-t', { hashes: h('q-w') })).toHaveLength(1);
    expect(findClientTerms('q-w-e-r-t', { hashes: h('w-e-r-t') })).toHaveLength(1);
    expect(findClientTerms('q-w-e-r-t', { hashes: h('q-w-e-r-t') })).toEqual([]);
    expect(findClientTerms('q-w-e-r-t', { hashes: h('t') })).toEqual([]);
    expect(findClientTerms('q-w', { hashes: h('q-w') })).toHaveLength(1);
  });
  it('defaults to the ops#27 hashes and finds nothing in ordinary text', () => {
    expect(findClientTerms('nothing-here-at all')).toEqual([]);
    expect(findClientTerms('blue-heron-co', { hashes: [] })).toEqual([]);
  });
  it('denylist terms: trimmed, lowercased, >= 3 chars, escaped, word-bounded, every hit', () => {
    const t = (text, terms) => findClientTerms(text, { hashes: [], terms });
    expect(t('Pat Quill and pat quill', ['  Pat Quill  '])).toEqual([
      { rule: 'denylist', length: 9 },
      { rule: 'denylist', length: 9 },
    ]);
    expect(t('abc', ['abc'])).toHaveLength(1);
    expect(t('ab', ['ab'])).toEqual([]);
    expect(t('a.c', ['a.c'])).toHaveLength(1);
    expect(t('abc', ['a.c'])).toEqual([]);
    expect(t('xabc abcx', ['abc'])).toEqual([]);
  });
  it('parseDenylist skips blanks and comments, trims terms', () => {
    expect(parseDenylist('# c\n Pat Quill \n\n  # x\nAcme\n')).toEqual(['Pat Quill', 'Acme']);
  });
  it('flags http and https Google Docs links with their full length', () => {
    const u = 'http://drive.google.com/file/d/abc';
    expect(findGoogleDocs(`see ${u} now`)).toEqual([{ rule: 'google-doc', length: u.length }]);
    expect(findGoogleDocs('"https://sheets.google.com/x"')).toEqual([
      { rule: 'google-doc', length: 27 },
    ]);
    expect(findGoogleDocs('HTTPS://SLIDES.GOOGLE.COM/p/1')).toHaveLength(1);
    expect(findGoogleDocs('https://docs.google.com/')).toEqual([]);
    expect(findGoogleDocs('https://www.google.com/x')).toEqual([]);
  });
  it('scanFileText labels every rule with the file', () => {
    const found = scanFileText('https://docs.google.com/d/1 x-blue-heron-co', 'lib/a.js', {
      hashes: h('blue-heron-co'),
    });
    expect(found).toEqual([
      { rule: 'google-doc', length: 27, file: 'lib/a.js' },
      { rule: 'client-id', length: 13, file: 'lib/a.js' },
    ]);
  });
});

describe('findGitleaks', () => {
  const runs = (ok) => (b) => ok.includes(b);
  const install = () => ({ status: 0, stdout: 'log line\n/t/gitleaks\n' });
  it('prefers GITLEAKS_BIN, and fails closed when it does not run', () => {
    expect(findGitleaks({ env: { GITLEAKS_BIN: '/x' }, runs: runs(['/x']) })).toBe('/x');
    expect(findGitleaks({ env: { GITLEAKS_BIN: '/x' }, runs: runs(['gitleaks']) })).toBeNull();
  });
  it('then gitleaks on PATH', () => {
    expect(findGitleaks({ env: {}, runs: runs(['gitleaks']) })).toBe('gitleaks');
  });
  it('installs only in CI, and only trusts a binary that runs', () => {
    expect(findGitleaks({ env: {}, runs: runs(['/t/gitleaks']), install })).toBeNull();
    expect(findGitleaks({ env: { CI: '1' }, runs: runs(['/t/gitleaks']), install })).toBe(
      '/t/gitleaks',
    );
    const failed = () => ({ status: 1, stdout: '/t/gitleaks\n' });
    expect(
      findGitleaks({ env: { CI: '1' }, runs: runs(['/t/gitleaks']), install: failed }),
    ).toBeNull();
    expect(findGitleaks({ env: { CI: '1' }, runs: runs([]), install })).toBeNull();
  });
  it('the default probe runs a real binary and rejects a missing one', () => {
    expect(findGitleaks({ env: { GITLEAKS_BIN: fakeBin('exit 0') } })).toMatch(/fake-gitleaks$/);
    expect(findGitleaks({ env: { GITLEAKS_BIN: fakeBin('exit 1') } })).toBeNull();
  });
});

describe('gitleaksDir', () => {
  const pkgRoot = () => {
    const root = path.join(makeTmp(), 'package');
    mkdirSync(root);
    return root;
  };
  it('no binary fails closed', () => {
    expect(gitleaksDir(pkgRoot(), CONFIG, null)).toEqual({
      ok: false,
      error: 'gitleaks is not installed (brew install gitleaks)',
    });
  });
  it('a crash, or a findings exit with no report, is an error, never clean', () => {
    expect(gitleaksDir(pkgRoot(), CONFIG, fakeBin('echo boom >&2; exit 2'))).toEqual({
      ok: false,
      error: 'gitleaks exited 2: boom',
    });
    expect(gitleaksDir(pkgRoot(), CONFIG, fakeBin('echo a >&2; echo b >&2; exit 1'))).toEqual({
      ok: false,
      error: 'gitleaks exited 1: b',
    });
  });
  it('an empty report on exit 1 is an error too', () => {
    const bin = fakeBin(
      'while [ "$1" ]; do [ "$1" = --report-path ] && echo "[]" > "$2"; shift; done; exit 1',
    );
    expect(gitleaksDir(pkgRoot(), CONFIG, bin)).toEqual({
      ok: false,
      error: 'gitleaks exited 1: ',
    });
  });
  it('runs in the package dir with the exact arguments, and reads the report', () => {
    const root = pkgRoot();
    const bin = fakeBin(
      [
        `[ "$PWD" = "${root}" ] || exit 3`,
        'echo "$@" > ../args.txt',
        `while [ "$1" ]; do [ "$1" = --report-path ] && echo '[{"RuleID":"r","File":"f"}]' > "$2"; shift; done`,
        'exit 1',
      ].join('\n'),
    );
    expect(gitleaksDir(root, '/cfg.toml', bin)).toEqual({ ok: false, list: ['r in f'] });
    const report = path.join(path.dirname(root), 'gitleaks.json');
    expect(readFileSync(path.join(root, '..', 'args.txt'), 'utf8').trim()).toBe(
      `dir . --redact --no-banner --exit-code 1 --report-format json --report-path ${report} --config /cfg.toml`,
    );
    expect(gitleaksDir(root, '/cfg.toml', fakeBin('exit 0'))).toEqual({ ok: true });
  });
});

describe('scanPackage and packAndUnpack', () => {
  it("uses the repo's .gitleaks.toml when no config is given", () => {
    const dir = makePackage({ 'lib/index.js': '' });
    const want = `--config ${CONFIG}`;
    const bin = fakeBin(`echo "$@" | grep -q -- "${want}" && exit 0; exit 2`);
    expect(scanPackage(dir, { bin }).secrets).toEqual({ ok: true });
  });
  it('falls back to an empty allowlist when "files" is missing', () => {
    const dir = makePackage({ 'a.js': '' }, { name: 'nofiles', version: '1.0.0' });
    const r = scanPackage(dir, { bin: fakeBin('exit 0') });
    expect(r).toEqual({
      tarball: 'nofiles-1.0.0.tgz',
      files: 2,
      stray: [{ file: 'a.js', reason: NOT_IN }],
      secrets: { ok: true },
      pii: [],
    });
  });
  it('an explicit allowlist overrides package.json "files"', () => {
    const dir = makePackage({ 'lib/a.js': '' });
    expect(scanPackage(dir, { bin: fakeBin('exit 0'), allowed: [] }).stray).toEqual([
      { file: 'lib/a.js', reason: NOT_IN },
    ]);
  });
  it('lists nested files in sorted order', () => {
    const dir = makePackage({ 'lib/b.test.js': '', 'lib/a.test.js': '', 'lib/c/x.test.js': '' });
    expect(scanPackage(dir, { bin: fakeBin('exit 0') }).stray.map((s) => s.file)).toEqual([
      'lib/a.test.js',
      'lib/b.test.js',
      'lib/c/x.test.js',
    ]);
  });
  it('passes denylist terms and hashes through to every file', () => {
    const dir = makePackage({ 'lib/a.js': 'Pat Quill blue-heron-co\n' });
    const r = scanPackage(dir, {
      bin: fakeBin('exit 0'),
      terms: ['pat quill'],
      hashes: h('blue-heron-co'),
    });
    expect(r.pii).toEqual([
      { rule: 'client-id', length: 13, file: 'lib/a.js' },
      { rule: 'denylist', length: 9, file: 'lib/a.js' },
    ]);
  });
  it('a failed pack throws with the reason', () => {
    expect(() => packAndUnpack(makeTmp(), makeTmp())).toThrow(/^pnpm pack failed: \S/);
  });
});

describe('report and main', () => {
  const clean = { tarball: 't.tgz', files: 3, stray: [], secrets: { ok: true }, pii: [] };
  it('report: clean', () => {
    expect(report(clean)).toEqual({
      ok: true,
      lines: ['check-pack-scan: t.tgz clean (3 files: allowlist, gitleaks, PII)'],
    });
  });
  it('report: every kind of problem, in order', () => {
    const r = {
      ...clean,
      stray: [{ file: 'a', reason: 'why' }],
      secrets: { ok: false, error: 'e', list: ['r in f'] },
      pii: [{ rule: 'email', file: 'b', length: 5 }],
    };
    expect(report(r)).toEqual({
      ok: false,
      lines: [
        'FAIL stray file a (why)',
        'FAIL secret scan did not run: e',
        'FAIL secret r in f',
        'FAIL email in b (5 chars)',
        'check-pack-scan: t.tgz BLOCKED, 4 problem(s). Nothing may be published.',
      ],
    });
  });
  it('main: scans --cwd (or the repo root) with the denylist, logs, exits 0/1', () => {
    const deny = path.join(makeTmp(), 'deny.txt');
    writeFileSync(deny, '# x\nPat Quill\n');
    const out = [];
    const err = [];
    const io = { log: (l) => out.push(l), error: (l) => err.push(l) };
    let seen;
    const scan = (cwd, opts) => {
      seen = { cwd, opts };
      return clean;
    };
    expect(
      main(['--x', '--cwd', 'fixtures'], { env: { HDS_PII_DENYLIST: deny }, scan, ...io }),
    ).toBe(0);
    expect(seen).toEqual({ cwd: path.resolve('fixtures'), opts: { terms: ['Pat Quill'] } });
    expect(main([], { env: {}, scan, ...io })).toBe(0);
    expect(seen).toEqual({ cwd: ROOT, opts: { terms: [] } });
    expect(out).toEqual([report(clean).lines[0], report(clean).lines[0]]);
    expect(err).toEqual([]);
    const bad = () => ({ ...clean, pii: [{ rule: 'ssn', file: 'f', length: 11 }] });
    expect(main([], { env: {}, scan: bad, ...io })).toBe(1);
    expect(err).toEqual(report(bad()).lines);
    expect(out).toHaveLength(2);
    const boom = () => {
      throw new Error('no dist');
    };
    expect(main([], { env: {}, scan: boom, ...io })).toBe(1);
    expect(err.at(-1)).toBe('check-pack-scan: no dist');
  });
});

describe('more mutation kills', () => {
  it('default denylist is empty and a text with no slug runs has no client id', () => {
    expect(findClientTerms('stryker was here', { hashes: [] })).toEqual([]);
    expect(findClientTerms('x', { hashes: h('stryker was here') })).toEqual([]);
  });
  it('the default probe calls `gitleaks version`', () => {
    const bin = fakeBin('[ "$1" = version ] && [ -z "$2" ] && exit 0; exit 1');
    expect(findGitleaks({ env: { GITLEAKS_BIN: bin } })).toBe(bin);
  });
  it('a report with any exit but 1 is still an error', () => {
    const root = path.join(makeTmp(), 'package');
    mkdirSync(root);
    const bin = fakeBin(
      `while [ "$1" ]; do [ "$1" = --report-path ] && echo '[{"RuleID":"r","File":"f"}]' > "$2"; shift; done; exit 2`,
    );
    expect(gitleaksDir(root, CONFIG, bin)).toEqual({ ok: false, error: 'gitleaks exited 2: ' });
  });
  it('with no "files", every packed file is checked against an empty allowlist', () => {
    const dir = makePackage({ 'Stryker was here': '' }, { name: 'nofiles2', version: '1.0.0' });
    expect(scanPackage(dir, { bin: fakeBin('exit 0') }).stray).toEqual([
      { file: 'Stryker was here', reason: NOT_IN },
    ]);
  });
  it('removes its temp dir', () => {
    const before = readdirSync(os.tmpdir()).filter((d) => d.startsWith('hds-pack-scan-')).length;
    scanPackage(makePackage({ 'lib/a.js': '' }), { bin: fakeBin('exit 0') });
    const after = readdirSync(os.tmpdir()).filter((d) => d.startsWith('hds-pack-scan-')).length;
    expect(after).toBeLessThanOrEqual(before);
  });
});
