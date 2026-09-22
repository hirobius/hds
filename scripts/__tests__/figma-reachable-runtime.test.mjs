/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Tests for reachableRuntime (scripts/lib/figma-scripts.mjs).
 *
 * A `use_figma` carrier ships runtime source and then checks it against a
 * checksum before it reads or writes a Figma file. `reachableRuntime` narrows
 * what a carrier carries to the transitive closure of its entry points, so the
 * read-only snapshot no longer ships `hdsApply` — the code that creates,
 * rewrites and deletes variables.
 *
 * That exclusion IS the security property, and nothing else pins it. The
 * end-to-end CLI tests would still pass if the closure silently widened back
 * to the whole push engine: a carrier with too MUCH runtime runs fine, it is
 * only a carrier with too LITTLE that throws ReferenceError. So a regression
 * here is invisible without these assertions.
 */

import { describe, it, expect } from 'vitest';
import { reachableRuntime, runtimeFunctions } from '../lib/figma-scripts.mjs';

const names = (entries) => reachableRuntime(entries).map((fn) => fn.name);

describe('reachableRuntime', () => {
  it('gives the snapshot carrier exactly the ten functions it reaches', () => {
    expect(names(['hdsRunSnapshot'])).toEqual([
      'hdsNamespace',
      'hdsChecksum',
      'hdsVerifyRuntime',
      'hdsRound',
      'hdsByName',
      'hdsGetKey',
      'hdsNormalizeValue',
      'hdsNormalizeEffect',
      'hdsReadState',
      'hdsRunSnapshot',
    ]);
  });

  it('keeps hdsApply out of the read-only snapshot carrier', () => {
    // The point of the whole exercise: a snapshot cannot carry the code that
    // creates, rewrites or deletes variables, so reading a snapshot script
    // before running it does not mean auditing the push engine.
    const reached = names(['hdsRunSnapshot']);
    for (const write of ['hdsApply', 'hdsPlan', 'hdsRunPush', 'hdsMatch', 'hdsSetKey']) {
      expect(reached).not.toContain(write);
    }
  });

  it('still gives the push carrier hdsApply, which it does reach', () => {
    const reached = names(['hdsRunPush']);
    expect(reached).toContain('hdsApply');
    expect(reached).toContain('hdsPlan');
    expect(reached).toContain('hdsSetKey');
    expect(reached).not.toContain('hdsRunSnapshot');
  });

  it('always carries hdsVerifyRuntime, which every carrier calls', () => {
    expect(names(['hdsRunSnapshot'])).toContain('hdsVerifyRuntime');
    expect(names(['hdsRunPush'])).toContain('hdsVerifyRuntime');
    // Even for an entry point that does not reference it at all.
    expect(names(['hdsRound'])).toContain('hdsVerifyRuntime');
  });

  it('returns source order, not traversal order, so the checksum is stable', () => {
    // hdsVerifyRuntime inside Figma joins String(fn) in the order of the array
    // it is handed. If that order were traversal-dependent the checksum would
    // differ between two identical runs.
    const order = runtimeFunctions().map((fn) => fn.name);
    const reached = names(['hdsRunPush']);
    expect(reached).toEqual(order.filter((n) => reached.includes(n)));
    expect(names(['hdsRunPush'])).toEqual(reached);
  });

  it('ignores an entry point that is not a runtime function', () => {
    // Only the always-included guard survives — and hdsChecksum with it,
    // because hdsVerifyRuntime calls it to recompute the checksum. A carrier
    // that shipped the guard without it would throw ReferenceError before
    // reading anything.
    expect(names(['noSuchFunction'])).toEqual(['hdsChecksum', 'hdsVerifyRuntime']);
  });
});
