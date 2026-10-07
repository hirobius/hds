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
});
