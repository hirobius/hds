/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { ROOT, runFixtureMode } from './helpers/gate-runner.mjs';
import { lockfileViolations } from '../check-lockfile-integrity.mjs';

const SCRIPT = join(ROOT, 'scripts', 'check-lockfile-integrity.mjs');
const FIXTURES = join(ROOT, 'fixtures', 'check-lockfile-integrity');

describe('check-lockfile-integrity (hds#1145)', () => {
  it('passes a lock whose every package has a sha512 integrity from the registry', () => {
    const { code, stdout } = runFixtureMode(SCRIPT, join(FIXTURES, 'passing.example.yaml'));
    expect(code, stdout).toBe(0);
  });

  it('fails a weak hash, a tarball URL, a git source and a missing integrity', () => {
    const { code, stdout } = runFixtureMode(SCRIPT, join(FIXTURES, 'violating.example.yaml'));
    expect(code).toBe(1);
    expect(stdout).toMatch(/WEAK_INTEGRITY left-pad@1\.3\.0/);
    expect(stdout).toMatch(/EXOTIC_SOURCE evil@/);
    expect(stdout).toMatch(/EXOTIC_SOURCE forked@/);
    expect(stdout).toMatch(/NO_INTEGRITY bare@1\.0\.0/);
  });

  it('reads only the packages: section', () => {
    const lock = [
      "lockfileVersion: '9.0'",
      'importers:',
      '  .:',
      '    dependencies:',
      '      a:',
      '        specifier: 1.0.0',
      '        version: 1.0.0',
      'packages:',
      '  a@1.0.0:',
      '    resolution: {integrity: sha512-AAAA}',
      'snapshots:',
      '  a@1.0.0: {}',
    ].join('\n');
    expect(lockfileViolations(lock)).toEqual([]);
  });

  it('fails a lock with no lockfileVersion', () => {
    expect(lockfileViolations('packages:\n').map((v) => v.rule)).toEqual(['NO_LOCKFILE_VERSION']);
  });

  it('passes the committed lockfiles', () => {
    const { code, stdout } = runFixtureMode(SCRIPT, '', []);
    expect(code, stdout).toBe(0);
  });
});
