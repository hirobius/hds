/**
 * A CSS-only consumer (folio-shaped: one stylesheet that imports
 * variables.css, nothing else) upgrading from 0.16.0 to this checkout's
 * version (hds#934). A step whose frozen note has no detector gets one from
 * upgrade/detects.json; an additive step with none is never Do by hand. So
 * nothing reaches such a consumer that its code does not use.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PKG,
  REPO,
  fakeManagers,
  makeProject,
  npmLock,
  pkgJson,
  runCli,
} from './helpers/upgrade-fixtures.mjs';
import { loadRecord, readDetects } from '../../codemods/lib/record.mjs';
import { Detect } from '../upgrade/schema.mjs';

const VERSION = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).version;
const ids = (list) => list.map((item) => item.id);

const folio = (extra = {}) =>
  makeProject({
    'package.json': pkgJson('folio', { [PKG]: '^0.16.0' }),
    'package-lock.json': npmLock('0.16.0'),
    'src/index.css': `@import '${PKG}/variables.css';\nbody { margin: 0; }\n`,
    ...extra,
  });

const check = (root) => {
  const res = runCli(['upgrade', '--root', root, '--check', '--json', '--no-typecheck']);
  return { ...res, report: JSON.parse(res.stdout) };
};

const posix = process.platform === 'win32' ? it.skip : it;

describe('folio-shaped CSS-only consumer, 0.16.0 to current', () => {
  posix('has nothing to do by hand and exits 0', () => {
    const root = folio();
    const fake = fakeManagers({
      installs: { npm: { 'package-lock.json': `${JSON.stringify(npmLock(VERSION))}\n` } },
    });
    const res = runCli(['upgrade', '--root', root, '--json', '--no-typecheck'], {
      env: fake.env,
    });
    const report = JSON.parse(res.stdout);
    expect(report.target).toBe(VERSION);
    expect(report.importers[0]).toMatchObject({ from: '0.16.0' });
    expect(ids(report.doByHand)).toEqual([]);
    expect(res.code).toBe(0);
  });

  it('still lists a detected step when the code uses it', () => {
    const { report } = check(
      folio({
        'index.html': '<html data-accent="cobalt"><body></body></html>\n',
        'eslint.config.mjs': `import hds from '${PKG}/eslint-plugin';\nexport default [hds.configs.recommended];\n`,
      }),
    );
    expect(ids(report.doByHand)).toEqual(
      expect.arrayContaining([
        '0.27.0/tenant/data-accent-cobalt',
        '0.27.0/behavior/meta-line-max-two',
      ]),
    );
  });
});

describe('upgrade/detects.json', () => {
  const detects = readDetects(REPO);
  const steps = new Map(
    loadRecord(REPO, { detects: new Map() }).ledgers.flatMap((l) => l.steps.map((s) => [s.id, s])),
  );

  it('names only released steps that ship with no detector of their own', () => {
    expect(detects.size).toBeGreaterThan(0);
    for (const [id, detect] of detects) {
      expect(steps.has(id), id).toBe(true);
      expect(steps.get(id).detect, id).toBeUndefined();
      expect(() => Detect.parse(detect), id).not.toThrow();
    }
  });

  it('gives those steps their detector when the record loads', () => {
    const loaded = new Map(loadRecord(REPO).ledgers.flatMap((l) => l.steps.map((s) => [s.id, s])));
    for (const [id, detect] of detects) expect(loaded.get(id).detect).toEqual(detect);
  });
});
