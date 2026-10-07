/**
 * scripts/upgrade/ledger.mjs (hds#447): what every ledger generator shares:
 * the bump between two versions, CHANGELOG citations that survive later
 * releases, and the facts no step accounts for.
 */
import { describe, it, expect } from 'vitest';
import {
  assembleRelease,
  breakingBump,
  bumpBetween,
  changelogSource,
  factImpact,
  uncoveredFacts,
} from '../upgrade/ledger.mjs';
import { narrows } from '../upgrade/ranges.mjs';

describe('bumpBetween', () => {
  it('names the semver bump from one release to the next', () => {
    expect(bumpBetween('0.19.1', '0.20.0')).toBe('minor');
    expect(bumpBetween('0.20.0', '0.20.1')).toBe('patch');
    expect(bumpBetween('0.20.3', '1.0.0')).toBe('major');
  });

  it('refuses a pair that is not a step forward', () => {
    expect(() => bumpBetween('0.20.0', '0.20.0')).toThrow(/0\.20\.0/);
    expect(() => bumpBetween('0.20.0', '0.19.1')).toThrow(/0\.19\.1/);
  });
});

describe('changelogSource', () => {
  // As the file read when 0.2.0 shipped: its section opens on line 3.
  const atRelease = [
    '# Changelog',
    '',
    '## 0.2.0',
    '',
    '### Minor Changes',
    '',
    '- abc1234: Button presses tint the fill.',
    '- def5678: Card toggles on Space.',
    '',
    '## 0.1.0',
    '',
    '- 1111111: Card toggles on Space.',
    '',
  ].join('\n');
  // Two releases later, the 0.2.0 section sits lower in the file.
  const later = atRelease.replace(
    '# Changelog\n\n',
    '# Changelog\n\n## 0.3.0\n\n- 2222222: Something else.\n\n',
  );

  it('cites the line as of the release, however far later releases push it down', () => {
    expect(changelogSource(atRelease, '0.2.0', 'Card toggles on Space')).toBe('CHANGELOG.md:8');
    expect(changelogSource(later, '0.2.0', 'Card toggles on Space')).toBe('CHANGELOG.md:8');
    expect(changelogSource(later, '0.2.0', 'abc1234:')).toBe('CHANGELOG.md:7');
  });

  it('looks only inside the release section, and needs exactly one match there', () => {
    expect(() => changelogSource(later, '0.2.0', 'Something else')).toThrow(/0\.2\.0/);
    expect(() => changelogSource(later, '0.2.0', '- ')).toThrow(/more than one/);
    expect(() => changelogSource(later, '0.9.0', 'Card')).toThrow(/## 0\.9\.0/);
  });
});

describe('uncoveredFacts', () => {
  const facts = [
    { id: 'removed:.:A', kind: 'removed' },
    { id: 'added:.:B', kind: 'added' },
    { id: 'dependency-removed:x', kind: 'dependency-removed' },
  ];

  it('returns the facts that need a step and that no step lists; additions need none', () => {
    const steps = [{ id: '1.0.0/removed/A', facts: ['removed:.:A'] }, { id: '1.0.0/look/C' }];
    expect(uncoveredFacts(facts, steps).map((f) => f.id)).toEqual(['dependency-removed:x']);
  });
});

describe('assembleRelease', () => {
  const step = (kind, subject, extra = {}) => ({
    id: `1.1.0/${kind}/${subject}`,
    kind,
    impact: 'breaking',
    plain: `${subject} changed.`,
    source: 'test',
    ...extra,
  });

  it('orders steps by kind, then id, and validates the result', () => {
    const release = assembleRelease({
      version: '1.1.0',
      previous: '1.0.0',
      date: '2026-10-01',
      summary: 'Test release.',
      backfilled: false,
      steps: [step('look', 'B', { impact: 'look' }), step('removed', 'Z'), step('removed', 'A')],
    });
    expect(release.bump).toBe('minor');
    expect(release.steps.map((s) => s.id)).toEqual([
      '1.1.0/removed/A',
      '1.1.0/removed/Z',
      '1.1.0/look/B',
    ]);
  });

  it('throws, naming the field, when a step does not fit the schema', () => {
    expect(() =>
      assembleRelease({
        version: '1.1.0',
        previous: '1.0.0',
        date: '2026-10-01',
        summary: 'Test release.',
        backfilled: false,
        steps: [step('removed', 'A', { plain: 'no full stop' })],
      }),
    ).toThrow(/steps\.0\.plain/);
  });
});

describe('factImpact', () => {
  const peer = (from, to) => ({ kind: 'peer-changed', name: 'zod', from, to });
  const engine = (from, to) => ({ kind: 'engines-changed', name: 'node', from, to });
  const req = (range) => ({ range, optional: false });
  const opt = (range) => ({ range, optional: true });

  it('reads anything removed or moved as breaking, and anything added as additive', () => {
    for (const kind of [
      'removed',
      'moved',
      'exports-key-removed',
      'dependency-removed',
      'bin-removed',
    ]) {
      expect(factImpact({ kind }), kind).toBe('breaking');
    }
    for (const kind of ['added', 'exports-key-added', 'dependency-added', 'bin-added']) {
      expect(factImpact({ kind }), kind).toBe('additive');
    }
  });

  it('reads a peer as breaking when its range narrows, it becomes required, or a required one comes or goes', () => {
    expect(factImpact(peer(req('^3.23.0 || ^4.0.0'), req('^4.0.0')))).toBe('breaking');
    expect(factImpact(peer(opt('^4.0.0'), req('^4.0.0')))).toBe('breaking');
    expect(factImpact(peer(null, req('^4.0.0')))).toBe('breaking');
    expect(factImpact(peer(req('^4.0.0'), null))).toBe('breaking');
  });

  it('reads a widened or loosened peer as additive, and an optional one leaving as none', () => {
    expect(factImpact(peer(req('^4.0.0'), req('^4.0.0 || ^5.0.0')))).toBe('additive');
    expect(factImpact(peer(req('^4.0.0'), opt('^4.0.0')))).toBe('additive');
    expect(factImpact(peer(null, opt('^4.0.0')))).toBe('additive');
    expect(factImpact(peer(opt('^4.0.0'), null))).toBe('none');
  });

  it('reads raised or new engines as breaking, and lowered or dropped ones as additive', () => {
    expect(factImpact(engine('>=20', '>=22'))).toBe('breaking');
    expect(factImpact(engine(null, '>=22'))).toBe('breaking');
    expect(factImpact(engine('>=22', '>=20'))).toBe('additive');
    expect(factImpact(engine('>=20', null))).toBe('additive');
  });
});

describe('breakingBump', () => {
  it('is minor below 1.0 and major from 1.0', () => {
    expect(breakingBump('0.20.0')).toBe('minor');
    expect(breakingBump('1.0.0')).toBe('major');
    expect(breakingBump('2.3.1')).toBe('major');
  });
});

describe('narrows', () => {
  it('is false when every version the old range accepts, the new one accepts too', () => {
    expect(narrows('^18.3.0 || ^19.0.0', '^18.3.0 || ^19.0.0 || ^20.0.0')).toBe(false);
    expect(narrows('>=22', '>=20')).toBe(false);
    expect(narrows('^1.3.0', '>=1.0.0')).toBe(false);
    expect(narrows('~1.2.3', '^1.2.0')).toBe(false);
    expect(narrows('1.2.3', '^1.2.0')).toBe(false);
    expect(narrows('^0.7.1', '^0.7.0')).toBe(false);
    expect(narrows('^4.0.0', '^4.0.0')).toBe(false);
  });

  it('is true when the new range drops a version the old one accepted', () => {
    expect(narrows('^3.23.0 || ^4.0.0', '^4.0.0')).toBe(true);
    expect(narrows('>=20', '>=22')).toBe(true);
    expect(narrows('^1.3.0', '^1.4.0')).toBe(true);
    expect(narrows('^0.7.1', '^0.8.0')).toBe(true);
    expect(narrows('>=8', '^9.0.0')).toBe(true);
  });

  it('is true when it cannot read a range, so a person decides', () => {
    expect(narrows('^18 <19', '^18.0.0')).toBe(true);
    expect(narrows('^18.3.0', 'latest')).toBe(true);
  });
});
