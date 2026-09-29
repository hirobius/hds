// hirobius.tokens.json is strict DTCG on disk; spring, motion and elevation
// sit under $extensions["com.hirobius.hds"]. The docs token browser must still
// list them in their HDS form (scripts/lib/token-dialect.mjs).
import { describe, it, expect } from 'vitest';
import { allTokens } from './tokenUtils';

const byPath = (path: string) => allTokens.find((t) => t.path === path);

describe('allTokens', () => {
  it('lists the elastic easing as a spring', () => {
    expect(byPath('primitive.easing.elastic')).toMatchObject({
      type: 'spring',
      rawValue: { type: 'spring', stiffness: 300, damping: 20, mass: 1 },
    });
  });

  it('lists motion tokens as duration + easing composites', () => {
    expect(byPath('semantic.motion.exit')).toMatchObject({
      type: 'motion',
      composite: {
        duration: '{primitive.duration.instant}',
        easing: '{primitive.easing.accelerate}',
      },
    });
  });

  it('lists every elevation level', () => {
    expect(allTokens.filter((t) => t.type === 'elevation').map((t) => t.path)).toEqual([
      'semantic.elevation.flat',
      'semantic.elevation.raised',
      'semantic.elevation.floating',
      'semantic.elevation.overlay',
    ]);
  });
});
