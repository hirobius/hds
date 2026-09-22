/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for gitIgnoredPaths (scripts/check-link-integrity.mjs), the #251 fix.
 *
 * `check-link-integrity --doc-refs-only` reported nine missing local
 * references that were two different problems wearing one label:
 *
 *   figma/model.json    gitignored build output. Absent from every clean
 *                       checkout BY DESIGN, so the docs naming it are correct
 *                       and the gate was wrong. A permanently-red check says
 *                       nothing about the thing it guards.
 *   figma/snapshot.json genuinely expected to be committed, genuinely absent,
 *                       blocked on #236. A real finding.
 *
 * #251's DoD asks for exactly this pair to be proven: "a test proves a
 * gitignored path is skipped and a genuinely-missing tracked path still
 * fails." The second half is the one that matters — the cheap way to make
 * this gate green would have been to swallow both classes, which would have
 * hidden the snapshot refs the gate exists to report.
 */

import { describe, it, expect } from 'vitest';
import { gitIgnoredPaths } from '../check-link-integrity.mjs';

describe('gitIgnoredPaths', () => {
  it('reports a gitignored build output as ignored, so the gate can skip it', () => {
    expect(gitIgnoredPaths(['figma/model.json']).has('figma/model.json')).toBe(true);
  });

  it('does NOT report a genuinely-missing tracked path, so it still fails the gate', () => {
    // figma/snapshot.json is the live case: absent today, blocked on #236,
    // and expected to be committed — so it must never be silenced as if it
    // were the gitignored class above.
    const ignored = gitIgnoredPaths(['figma/snapshot.json', 'docs/no-such-file.md']);
    expect(ignored.has('figma/snapshot.json')).toBe(false);
    expect(ignored.has('docs/no-such-file.md')).toBe(false);
  });

  it('separates the two classes in one call, which is how the gate uses it', () => {
    const ignored = gitIgnoredPaths(['figma/model.json', 'figma/snapshot.json']);
    expect([...ignored]).toEqual(['figma/model.json']);
  });

  it('claims nothing for an empty list', () => {
    expect(gitIgnoredPaths([])).toEqual(new Set());
  });

  it('de-duplicates its input rather than asking git twice', () => {
    const ignored = gitIgnoredPaths(['figma/model.json', 'figma/model.json']);
    expect([...ignored]).toEqual(['figma/model.json']);
  });
});
