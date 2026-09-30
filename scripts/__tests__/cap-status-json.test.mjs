import { describe, it, expect } from 'vitest';
import { capStatus, HISTORY_KEYS } from '../cap-status-json.mjs';

const range = (n) => Array.from({ length: n }, (_, i) => `entry ${i}`);

describe('capStatus', () => {
  it('keeps the 10 newest entries of each history array (status.json lists newest first)', () => {
    const out = capStatus({ resolvedThisSession: range(12) });
    expect(out.resolvedThisSession).toEqual(range(10));
  });

  it('never cuts the live queues: next and blocked keep every entry', () => {
    const input = { next: range(30), blocked: range(12), resolvedThisSession: range(12) };
    const out = capStatus(input);
    expect(out.next).toEqual(range(30));
    expect(out.blocked).toEqual(range(12));
    expect(out.resolvedThisSession).toHaveLength(10);
    expect(HISTORY_KEYS).not.toContain('next');
    expect(HISTORY_KEYS).not.toContain('blocked');
  });

  it('leaves short arrays and top-level scalar fields untouched', () => {
    const input = {
      updatedAt: '2026-01-01T00:00:00.000Z',
      phase: 'active',
      resolvedThisSession: range(3),
    };
    expect(capStatus(input)).toEqual(input);
  });

  it('honours a custom cap and does not mutate its input', () => {
    const input = { resolvedThisSession: range(5) };
    expect(capStatus(input, 2).resolvedThisSession).toEqual(['entry 0', 'entry 1']);
    expect(input.resolvedThisSession).toHaveLength(5);
  });
});
