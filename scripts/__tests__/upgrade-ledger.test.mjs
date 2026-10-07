/**
 * scripts/upgrade/ledger.mjs (hds#447): what every ledger generator shares:
 * the bump between two versions, CHANGELOG citations that survive later
 * releases, and the facts no step accounts for.
 */
import { describe, it, expect } from 'vitest';
import {
  assembleRelease,
  bumpBetween,
  changelogSource,
  uncoveredFacts,
} from '../upgrade/ledger.mjs';

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
