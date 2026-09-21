/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for isSpecFile (scripts/lib/gate-scope.mjs) and the gates that use it.
 *
 * Three gates independently reported spec-file literals as violations:
 * audit-component-integrity --tokens, check-dimensions, and
 * check-link-integrity --route-links. A spec's job is to pin the exact output
 * its subject produces, so the "violating" pixel, token or href is the thing
 * under test. The helper exists so a fourth gate does not repeat it.
 *
 * The naming test matters more than it looks: a substring match on "test"
 * would silently exclude `latest.ts` and `contest.tsx` from every gate that
 * calls this, which is a much worse failure than the one being fixed — it
 * would stop policing real source without saying so.
 */

import { describe, it, expect } from 'vitest';
import { isSpecFile } from '../lib/gate-scope.mjs';

describe('isSpecFile', () => {
  it('recognises the spec suffixes this repo uses', () => {
    for (const path of [
      'box-sx.test.ts',
      'src/app/components/top-nav.test.tsx',
      'src/stories/story-render.spec.tsx',
      'scripts/__tests__/figma-links.test.mjs',
      'a.spec.js',
      'b.test.cjs',
    ]) {
      expect(isSpecFile(path), path).toBe(true);
    }
  });

  it('does not match source whose name merely contains "test" or "spec"', () => {
    for (const path of [
      'latest.ts',
      'contest.tsx',
      'src/app/components/card.tsx',
      'inspector.ts',
      'respec.tsx',
      'src/stories/badge.stories.tsx',
    ]) {
      expect(isSpecFile(path), path).toBe(false);
    }
  });

  it('works on a bare filename as well as a full path', () => {
    expect(isSpecFile('card.test.tsx')).toBe(true);
    expect(isSpecFile('/abs/path/card.test.tsx')).toBe(true);
  });

  it('does not throw on non-string input', () => {
    expect(() => isSpecFile(undefined)).not.toThrow();
    expect(isSpecFile(undefined)).toBe(false);
  });
});
