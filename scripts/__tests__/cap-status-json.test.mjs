import { describe, it, expect } from 'vitest';
import { capStatus } from '../cap-status-json.mjs';

const range = (n) => Array.from({ length: n }, (_, i) => `entry ${i}`);

describe('capStatus', () => {
  it('keeps the 10 newest entries of every array field (status.json lists newest first)', () => {
    const out = capStatus({ next: range(30), resolvedThisSession: range(12) });
    expect(out.next).toEqual(range(10));
    expect(out.resolvedThisSession).toEqual(range(10));
  });

  it('leaves short arrays and top-level scalar fields untouched', () => {
    const input = { updatedAt: '2026-01-01T00:00:00.000Z', phase: 'active', blocked: range(3) };
    expect(capStatus(input)).toEqual(input);
  });

  it('honours a custom cap and does not mutate its input', () => {
    const input = { next: range(5) };
    expect(capStatus(input, 2).next).toEqual(['entry 0', 'entry 1']);
    expect(input.next).toHaveLength(5);
  });
});
