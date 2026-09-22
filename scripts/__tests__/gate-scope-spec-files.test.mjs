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
import { isSpecFile, exemptionContext } from '../lib/gate-scope.mjs';

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

describe('exemptionContext', () => {
  const ctx = (lines, i) => exemptionContext(lines, i);

  it('includes the line itself', () => {
    expect(ctx(['a', 'target', 'c'], 1)).toBe('target');
  });

  it('walks a multi-line comment block above the line', () => {
    // card.tsx's shape: the marker is on the first of three comment lines, so
    // checking only lines[i - 1] misses it.
    const lines = [
      '<div',
      '  // inline-ok: token-driven progress fill transform is dynamic.',
      '  // transform: scaleX (not width) so the fill animates on the compositor',
      '  // instead of triggering layout on every frame.',
      '  style={{',
    ];
    expect(ctx(lines, 4)).toContain('inline-ok:');
  });

  it('stops at a blank line rather than reaching an unrelated comment', () => {
    const lines = ['// tier-ok: something else entirely', '', 'const x = 1;'];
    expect(ctx(lines, 2)).not.toContain('tier-ok');
  });

  it('stops at a statement rather than reaching past it', () => {
    const lines = ['// inline-ok: for the line below', 'const a = 1;', 'const b = 2;'];
    expect(ctx(lines, 2)).not.toContain('inline-ok');
  });

  it('handles a block comment ending above the line', () => {
    const lines = ['/* css-ok: mirrors the neutral overlay */', 'background: rgb(0 0 0 / 0.04);'];
    expect(ctx(lines, 1)).toContain('css-ok');
  });

  it('handles a JSX block comment, braces and all', () => {
    // box.stories.tsx marks two tier-ok exemptions as `{/* ... */}`. Missing
    // this form turned two suppressed lines back into violations — caught only
    // by diffing the gate's output before and after the change.
    const lines = ['{/* tier-ok: story caption, not a live styling call */}', 'p: 2 → var(--x)'];
    expect(ctx(lines, 1)).toContain('tier-ok');
  });

  it('does not run off the start of the file', () => {
    expect(() => ctx(['// inline-ok: x'], 0)).not.toThrow();
  });
});
