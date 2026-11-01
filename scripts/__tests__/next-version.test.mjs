/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#469: check-deprecations compares against the version the pending
 * changesets will release, so the PR whose changeset makes a @removeIn past
 * due fails on that PR, not later on the Version PR.
 */
import { describe, it, expect } from 'vitest';
import { bumpOf, nextVersion } from '../lib/next-version.mjs';

const PKG = '@hirobius/design-system';
const cs = (bump, name = PKG) => `---\n'${name}': ${bump}\n---\n\nNote.\n`;

describe('bumpOf', () => {
  it('reads the bump a changeset gives the package', () => {
    expect(bumpOf(cs('minor'), PKG)).toBe('minor');
    expect(bumpOf(cs('patch').replaceAll("'", '"'), PKG)).toBe('patch');
  });
  it('ignores a changeset for another package, and text with no front matter', () => {
    expect(bumpOf(cs('major', '@other/pkg'), PKG)).toBeNull();
    expect(bumpOf('# README', PKG)).toBeNull();
  });
});

describe('nextVersion', () => {
  it('stays at the current version with no pending changesets', () => {
    expect(nextVersion('0.32.0', [])).toBe('0.32.0');
  });
  it('takes the largest pending bump', () => {
    expect(nextVersion('0.32.0', ['patch'])).toBe('0.32.1');
    expect(nextVersion('0.32.4', ['patch', 'minor'])).toBe('0.33.0');
    expect(nextVersion('0.32.4', ['minor', 'major'])).toBe('1.0.0');
    expect(nextVersion('1.2.3', ['major', 'patch'])).toBe('2.0.0');
  });
  it('leaves a pre-release version alone (pre mode owns its own numbering)', () => {
    expect(nextVersion('1.0.0-rc.1', ['minor'])).toBe('1.0.0-rc.1');
  });
});
