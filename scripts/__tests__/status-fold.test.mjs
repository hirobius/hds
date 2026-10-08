/** @internal — not part of @hirobius/design-system public API surface. */
import { describe, it, expect } from 'vitest';
import { foldStatus } from '../status-fold.mjs';

const text = JSON.stringify({ updatedAt: '2026-01-01T00:00:00Z', phase: 'active' }, null, 2) + '\n';

describe('foldStatus', () => {
  it('bumps updatedAt, leaves other fields, and returns the note bodies', () => {
    const out = foldStatus(
      text,
      [{ name: 'a.md', body: 'Did a.\n' }],
      new Date('2026-10-07T01:02:03.456Z'),
    );
    expect(JSON.parse(out.text)).toEqual({ updatedAt: '2026-10-07T01:02:03Z', phase: 'active' });
    expect(out.notes).toEqual(['Did a.']);
  });

  it('is a no-op (text unchanged) with no notes', () => {
    expect(foldStatus(text, [], new Date()).text).toBe(text);
  });

  // scripts/upgrade/compile.mjs writes a `release` object that its --check
  // (pretest) compares; a fold that rewrote or dropped it would fail every PR.
  it('keeps the release object compile.mjs writes, byte for byte', () => {
    const release = {
      version: '0.21.0',
      date: '2026-10-07',
      bump: 'minor',
      summary: 'StatusDot is removed.',
      breaking: 2,
      doByHand: 12,
      floor: '0.16.0',
      upgrade: 'pnpm add @hirobius/design-system@0.21.0',
    };
    const withRelease =
      JSON.stringify({ updatedAt: '2026-01-01T00:00:00Z', phase: 'active', release }, null, 2) +
      '\n';
    const out = foldStatus(
      withRelease,
      [{ name: 'a.md', body: 'Did a.\n' }],
      new Date('2026-10-07T01:02:03Z'),
    );
    expect(out.text).toBe(withRelease.replace('2026-01-01T00:00:00Z', '2026-10-07T01:02:03Z'));
    expect(JSON.parse(out.text).release).toEqual(release);
  });
});
