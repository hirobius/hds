import { describe, it, expect } from 'vitest';
import { touchStatusText } from '../status-touch.mjs';

const NOW = new Date('2026-10-06T12:34:56.789Z');

describe('touchStatusText', () => {
  it('sets updatedAt to an ISO Z instant without milliseconds', () => {
    const out = touchStatusText('{\n  "updatedAt": "2026-01-01T00:00:00Z"\n}\n', NOW);
    expect(JSON.parse(out).updatedAt).toBe('2026-10-06T12:34:56Z');
  });
  it('preserves formatting, unicode and the trailing newline', () => {
    const input =
      '{\n  "updatedAt": "x",\n  "headline": "café — “quoted” \\u00e9",\n  "next": [\n    "a"\n  ]\n}\n';
    const out = touchStatusText(input, NOW);
    expect(out).toBe(input.replace('"x"', '"2026-10-06T12:34:56Z"'));
  });
  it('throws when there is no updatedAt', () => {
    expect(() => touchStatusText('{}\n', NOW)).toThrow(/updatedAt/);
  });
});
