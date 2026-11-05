/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Tests for scripts/check-pack-scan.mjs, the pre-release tarball scan (ops#27).
 * fixtures/pack-scan/pass is a clean package; fixtures/pack-scan/fail ships a
 * .status file, a test under lib/ and a fake GitHub token. PII that must FAIL
 * is written to temp copies here, never committed; lines holding fake PII
 * carry `pii-allow` so pushing this file passes the pre-push scan.
 */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findClientTerms,
  findGitleaks,
  report,
  scanFileText,
  scanPackage,
  strayFiles,
} from '../check-pack-scan.mjs';
import { runSteps } from '../release-local.mjs';
import { useTempDirs } from './helpers/temp-dirs.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIX = path.join(ROOT, 'fixtures', 'pack-scan');
const CONFIG = path.join(ROOT, '.gitleaks.toml');
const makeTmp = useTempDirs('pack-scan-');
const hasGitleaks = spawnSync('gitleaks', ['version'], { stdio: 'ignore' }).status === 0;
const sha = (s) => createHash('sha256').update(s).digest('hex');

describe('strayFiles', () => {
  const files = ['dist', 'docs/CONSUMING.md', 'public/llms/'];
  it('passes files under "files" entries and the files npm always adds', () => {
    expect(
      strayFiles(
        [
          'package.json',
          'README.md',
          'LICENSE',
          'dist/index.js',
          'docs/CONSUMING.md',
          'public/llms/a.txt',
        ],
        files,
      ),
    ).toEqual([]);
  });
  it('fails a file outside the allowlist', () => {
    expect(strayFiles(['docs/client-notes.md', 'distx/a.js'], files).map((s) => s.file)).toEqual([
      'docs/client-notes.md',
      'distx/a.js',
    ]);
  });
  it.each([
    'dist/.status',
    '.status/board.md',
    'dist/fixtures/tenant.json',
    'dist/__tests__/a.js',
    'dist/tests/a.js',
    'dist/a.test.js',
    'dist/.env.local',
  ])('fails %s even inside an allowed directory', (f) => {
    expect(strayFiles([f], files)).toHaveLength(1);
  });
});

describe('PII rules', () => {
  it('flags emails, phones and SSNs with the pre-push rules, never the value', () => {
    const text = 'jane.doe@acme-corp.io\n(312) 867-5309\n123-45-6789'; // pii-allow
    const found = scanFileText(text, 'dist/a.js', { hashes: [] });
    expect(found.map((f) => f.rule)).toEqual(['email', 'phone', 'ssn']);
    expect(JSON.stringify(found)).not.toContain('acme');
  });
  it('passes the reserved fictional values', () => {
    expect(scanFileText('a@example.com (312) 555-0142', 'x', { hashes: [] })).toEqual([]);
  });
  it('matches hashed client ids whole, inside longer slugs and in any case', () => {
    const hashes = [sha('blue-heron-co')];
    expect(findClientTerms('ws: Blue-Heron-Co', { hashes })).toHaveLength(1);
    expect(findClientTerms('path/blue-heron-co-q3/data', { hashes })).toHaveLength(1);
    expect(findClientTerms('blue_heron_co', { hashes })).toHaveLength(1);
    expect(findClientTerms('blue-heron', { hashes })).toEqual([]);
  });
  it('matches denylist terms from a private file', () => {
    expect(findClientTerms('Owner: Pat Quill.', { hashes: [], terms: ['pat quill'] })).toEqual([
      { rule: 'denylist', length: 9 },
    ]);
  });
  it('ships the ops#27 needles only as hashes', () => {
    const src = readFileSync(path.join(ROOT, 'scripts', 'check-pack-scan.mjs'), 'utf8');
    for (const h of src.match(/'[0-9a-f]{64}'/g)) expect(h).toHaveLength(66);
  });
});

describe.skipIf(!hasGitleaks)('scanPackage: real pnpm pack + gitleaks', () => {
  it('passes the clean fixture', () => {
    const r = scanPackage(path.join(FIX, 'pass'), { config: CONFIG });
    expect(report(r).ok).toBe(true);
    expect(r.files).toBeGreaterThan(0);
  });
  it('fails the violating fixture on every count', () => {
    const r = scanPackage(path.join(FIX, 'fail'), { config: CONFIG });
    expect(r.stray.map((s) => s.file).sort()).toEqual(['.status', 'lib/__tests__/x.test.js']);
    expect(r.secrets.list).toEqual(['github-pat in lib/index.js']);
    expect(report(r).ok).toBe(false);
  });
  it('fails PII and client ids written into a shipped file', () => {
    const dir = makeTmp();
    cpSync(path.join(FIX, 'pass'), dir, { recursive: true });
    appendFileSync(path.join(dir, 'lib', 'index.js'), '// jane.doe@acme-corp.io blue-heron-co\n'); // pii-allow
    const r = scanPackage(dir, { config: CONFIG, hashes: [sha('blue-heron-co')] });
    expect(r.pii.map((p) => `${p.rule} ${p.file}`)).toEqual([
      'email lib/index.js',
      'client-id lib/index.js',
    ]);
    expect(report(r).ok).toBe(false);
  });
});

/**
 * Real-shape violations, each packed with `pnpm pack` and scanned. The values
 * are built at runtime (random where gitleaks checks entropy), so no
 * credential-shaped or PII-shaped string is committed.
 */
const rand = (n, chars) => Array.from(randomBytes(n), (b) => chars[b % chars.length]).join('');
const UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const LOWNUM = 'abcdefghijklmnopqrstuvwxyz0123456789';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const privateKey = () =>
  [
    `-----BEGIN ${'RSA PRIVATE'} KEY-----`,
    ...Array.from({ length: 8 }, () => rand(64, B64)),
    `-----END ${'RSA PRIVATE'} KEY-----`,
  ].join('\n');

/** A temp package: files ["lib"] plus extra `files` entries, with the given files written. */
function makePackage(files, extraEntries = []) {
  const dir = makeTmp();
  writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'pack-scan-case', version: '1.0.0', files: ['lib', ...extraEntries] }),
  );
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

describe.skipIf(!hasGitleaks)('real-shape tarballs that MUST fail', () => {
  const secretCases = [
    ['an AWS access key', () => `const k = "AKIA${rand(16, UP)}";\n`, 'aws-access-token'],
    [
      'an npm token',
      () => `//registry.npmjs.org/:_authToken=npm_${rand(36, LOWNUM)}\n`,
      'npm-access-token',
    ],
    ['a private key', () => `${privateKey()}\n`, 'private-key'],
  ];
  it.each(secretCases)('%s', (_, body, rule) => {
    const r = scanPackage(makePackage({ 'lib/index.js': body() }), { config: CONFIG });
    expect(r.secrets.list).toEqual([`${rule} in lib/index.js`]);
    expect(report(r).ok).toBe(false);
  });

  it('a .env inside an allowed directory', () => {
    const r = scanPackage(makePackage({ 'lib/index.js': '', 'lib/.env': 'A=1\n' }), {
      config: CONFIG,
    });
    expect(r.stray).toEqual([{ file: 'lib/.env', reason: 'forbidden path segment ".env"' }]);
    expect(report(r).ok).toBe(false);
  });

  it.each([
    ['a client-style email', `const owner = "${'dana.reyes'}@${'harborline'}.com";`, 'email'], // pii-allow
    ['a client-style phone number', `// call ${'(415)'} ${'867-2231'}`, 'phone'], // pii-allow
    [
      'a docs.google link',
      `// https://${'docs.google'}.com/document/d/${rand(44, LOWNUM)}/edit`,
      'google-doc',
    ],
  ])('%s', (_, body, rule) => {
    const r = scanPackage(makePackage({ 'lib/index.js': `${body}\n` }), { config: CONFIG });
    expect(r.pii).toEqual([expect.objectContaining({ rule, file: 'lib/index.js' })]);
    expect(report(r).lines.join('\n')).not.toContain('harborline');
    expect(report(r).ok).toBe(false);
  });

  it('a file outside the allowlist', () => {
    const dir = makePackage({ 'lib/index.js': '', 'notes/client.md': '# notes\n' }, ['notes']);
    // "files" lets it into the tarball; the repo allowlist (this package's
    // "files" minus "notes") is what refuses it.
    const r = scanPackage(dir, { config: CONFIG, allowed: ['lib'] });
    expect(r.stray).toEqual([{ file: 'notes/client.md', reason: 'not in package.json "files"' }]);
    expect(report(r).ok).toBe(false);
  });

  it('a clean real-shape tarball MUST pass', () => {
    const dir = makePackage({
      'lib/index.js': 'export const c = "ops@example.com, (312) 555-0142";\n',
      'README.md': '# ok\n',
      LICENSE: 'MIT\n',
    });
    const r = scanPackage(dir, { config: CONFIG });
    expect(r).toMatchObject({ stray: [], pii: [], secrets: { ok: true } });
    expect(report(r).ok).toBe(true);
  });
});

describe('release wiring', () => {
  it('release-local runs the pack scan after the build and before publishing', () => {
    for (const publish of [false, true]) {
      const steps = runSteps(publish).map(([c, a]) => `${c} ${a.join(' ')}`);
      const scan = steps.indexOf('node scripts/check-pack-scan.mjs');
      expect(scan).toBeGreaterThan(steps.indexOf('pnpm build:lib'));
      expect(scan).toBe(steps.length - 2);
    }
  });
  it('pnpm release runs it before changeset publish', () => {
    const { release } = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts;
    expect(release).toMatch(/node scripts\/check-pack-scan\.mjs && changeset publish$/);
  });
});

describe('findGitleaks', () => {
  it('fails closed off CI when no binary runs', () => {
    expect(findGitleaks({ env: { GITLEAKS_BIN: '/nonexistent/gitleaks' } })).toBeNull();
  });
  it('fetches a pinned, checksum-verified binary in CI (release.yml has no gitleaks step)', () => {
    const src = readFileSync(path.join(ROOT, 'scripts', 'install-gitleaks.sh'), 'utf8');
    expect(src).toMatch(/sha256sum -c/);
    expect(src).toMatch(/GITLEAKS_VERSION:-\d+\.\d+\.\d+/);
  });
});
