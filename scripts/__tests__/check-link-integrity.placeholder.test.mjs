/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * isPlaceholderPath (scripts/check-link-integrity.mjs): CLAUDE.md names
 * `.status/<branch>.md` and `upgrade/pending/<same name>.json` as patterns,
 * and the doc-refs gate reported both as missing files.
 */
import { describe, it, expect } from 'vitest';
import { isPlaceholderPath } from '../check-link-integrity.mjs';

describe('isPlaceholderPath', () => {
  it('treats an angle-bracket placeholder as a pattern, not a file', () => {
    expect(isPlaceholderPath('.status/<branch>.md')).toBe(true);
    expect(isPlaceholderPath('upgrade/pending/<same name>.json')).toBe(true);
  });

  it('still checks a concrete path', () => {
    expect(isPlaceholderPath('docs/ai/FRONT-DOOR.md')).toBe(false);
    expect(isPlaceholderPath('figma/snapshot.json')).toBe(false);
  });
});
