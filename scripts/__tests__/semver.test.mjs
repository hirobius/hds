/**
 * Tests for codemods/lib/semver.mjs (hds#642): the one place the upgrade
 * tooling orders versions. The ledger, compile, check-upgrade-ledger, the
 * deprecation gate and the shipped `upgrade` codemod all read releases through
 * it, so a pre-release has to sort the same way everywhere: semver.org
 * precedence (§11), not a string compare of whatever follows the first hyphen.
 *
 * Expected values come from the spec's own worked example and from plain
 * arithmetic on the numbers, never from re-running the comparison.
 */
import { describe, expect, it } from 'vitest';
import { readLockfile } from '../../codemods/lib/installed-version.mjs';
import { compareVersions, gt, gte, isVersion, parseVersion } from '../../codemods/lib/semver.mjs';
import { compareVersions as compareFromSchema } from '../upgrade/schema.mjs';

/** semver.org §11, lowest to highest: the order the spec itself gives. */
const SPEC_ORDER = [
  '1.0.0-alpha',
  '1.0.0-alpha.1',
  '1.0.0-alpha.beta',
  '1.0.0-beta',
  '1.0.0-beta.2',
  '1.0.0-beta.11',
  '1.0.0-rc.1',
  '1.0.0',
];

describe('compareVersions', () => {
  it.each([
    // equal
    ['a release against itself', '0.21.0', '0.21.0', 0],
    ['a pre-release against itself', '0.21.0-next.3', '0.21.0-next.3', 0],
    // the core numbers, compared as numbers
    ['patch', '0.21.1', '0.21.0', 1],
    ['minor, as a number and not as text', '0.9.0', '0.10.0', -1],
    ['major', '1.0.0', '0.99.99', 1],
    // a pre-release sorts before its own release, after the release below it
    ['a pre-release before its release', '0.21.0-next.1', '0.21.0', -1],
    ['a release after its pre-release', '0.21.0', '0.21.0-next.1', 1],
    ['a pre-release of a later core above an earlier release', '0.21.0-next.1', '0.20.9', 1],
    // hyphenated pre-release: one alphanumeric identifier, compared as text (hds#642)
    ['next-1 before next-2', '0.21.0-next-1', '0.21.0-next-2', -1],
    ['next-2 after next-1', '0.21.0-next-2', '0.21.0-next-1', 1],
    [
      'next-10 before next-2 (text, the hyphen makes it one identifier)',
      '0.21.0-next-10',
      '0.21.0-next-2',
      -1,
    ],
    [
      'a dotted pre-release before the hyphenated one that extends its first identifier',
      '0.21.0-next.2',
      '0.21.0-next-1',
      -1,
    ],
    // dotted pre-release: numeric identifiers compare as numbers (hds#642)
    ['next.2 before next.10', '0.21.0-next.2', '0.21.0-next.10', -1],
    ['next.10 after next.2', '0.21.0-next.10', '0.21.0-next.2', 1],
    // §11: a numeric identifier is lower than an alphanumeric one
    ['numeric before alphanumeric', '1.0.0-1', '1.0.0-a', -1],
    ['alphanumeric after numeric', '1.0.0-a', '1.0.0-1', 1],
    // §11: alphanumeric identifiers compare in ASCII order, so upper case is lower
    ['ASCII order', '1.0.0-Beta', '1.0.0-alpha', -1],
    // §11: with every earlier identifier equal, the longer set is higher
    ['a longer pre-release set', '1.0.0-alpha.1', '1.0.0-alpha', 1],
  ])('%s', (_what, a, b, expected) => {
    expect(compareVersions(a, b)).toBe(expected);
  });

  it('puts the spec example in the order the spec gives', () => {
    const shuffled = [3, 7, 0, 5, 2, 6, 1, 4].map((i) => SPEC_ORDER[i]);
    expect([...shuffled].sort(compareVersions)).toEqual(SPEC_ORDER);
  });

  it('orders every neighbouring pair of the spec example, both ways round', () => {
    for (let i = 0; i < SPEC_ORDER.length - 1; i += 1) {
      expect(compareVersions(SPEC_ORDER[i], SPEC_ORDER[i + 1])).toBe(-1);
      expect(compareVersions(SPEC_ORDER[i + 1], SPEC_ORDER[i])).toBe(1);
    }
  });

  it('refuses a string that is not a version rather than guessing an order', () => {
    expect(() => compareVersions('latest', '1.0.0')).toThrow(TypeError);
    expect(() => compareVersions('1.0.0', '1.0')).toThrow(/1\.0/);
    expect(() => compareVersions(undefined, '1.0.0')).toThrow(TypeError);
  });
});

describe('gt and gte', () => {
  it('gt is strictly after', () => {
    expect(gt('0.21.0', '0.21.0-next.1')).toBe(true);
    expect(gt('0.21.0-next.10', '0.21.0-next.2')).toBe(true);
    expect(gt('0.21.0', '0.21.0')).toBe(false);
    expect(gt('0.21.0-next.1', '0.21.0')).toBe(false);
  });

  it('gte is after or equal', () => {
    expect(gte('0.21.0', '0.21.0')).toBe(true);
    expect(gte('0.21.0', '0.21.0-next.1')).toBe(true);
    expect(gte('0.21.0-next.1', '0.21.0')).toBe(false);
  });
});

describe('parseVersion and isVersion', () => {
  it('reads the core numbers and the pre-release identifiers', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, prerelease: [] });
    expect(parseVersion('0.21.0-next.2')).toEqual({
      major: 0,
      minor: 21,
      patch: 0,
      prerelease: ['next', 2],
    });
    expect(parseVersion('0.21.0-next-2')).toMatchObject({ prerelease: ['next-2'] });
  });

  it.each([
    '',
    'latest',
    'v1.2.3',
    '1.2',
    '1.2.3.4',
    ' 1.2.3',
    '1.2.3-',
    '^1.2.3',
    null,
    undefined,
    12,
  ])('reads %j as no version', (text) => {
    expect(parseVersion(text)).toBeNull();
    expect(isVersion(text)).toBe(false);
  });

  it('isVersion accepts what parseVersion reads', () => {
    for (const v of SPEC_ORDER) expect(isVersion(v)).toBe(true);
  });
});

describe('one home for the ordering', () => {
  it('the upgrade schema exports the same compareVersions', () => {
    expect(compareFromSchema).toBe(compareVersions);
  });

  it('a lockfile lists its copies of HDS in semver order, pre-releases included', () => {
    const lock = JSON.stringify({
      lockfileVersion: 3,
      packages: {
        'node_modules/@hirobius/design-system': { version: '0.21.0' },
        'a/node_modules/@hirobius/design-system': { version: '0.21.0-next.10' },
        'b/node_modules/@hirobius/design-system': { version: '0.21.0-next.2' },
        'c/node_modules/@hirobius/design-system': { version: '0.22.0-next-2' },
        'd/node_modules/@hirobius/design-system': { version: '0.22.0-next-1' },
        'e/node_modules/@hirobius/design-system': { version: '0.9.0' },
      },
    });
    expect(readLockfile('package-lock.json', lock).versions).toEqual([
      '0.9.0',
      '0.21.0-next.2',
      '0.21.0-next.10',
      '0.21.0',
      '0.22.0-next-1',
      '0.22.0-next-2',
    ]);
  });
});
