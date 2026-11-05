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
import { appendFileSync, cpSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findClientTerms,
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
