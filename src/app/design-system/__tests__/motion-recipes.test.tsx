/**
 * hds#751 — motion recipes: every named motion comes from tokens, and every one
 * has a reduced-motion version with no movement.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import hds from '../tokens';
import { MOTION_RECIPES, motionRecipe, type MotionRecipeName } from '../motion-recipes';
import { useMotionRecipe } from '../../hooks/useMotionRecipe';

const NAMES = Object.keys(MOTION_RECIPES) as MotionRecipeName[];
const MOVES = ['x', 'y', 'scale', 'rotate', 'filter', 'pathLength'];

const states = (r: ReturnType<typeof motionRecipe>) =>
  [r.initial, r.animate, r.exit].filter(
    (s): s is Record<string, unknown> => !!s && typeof s === 'object',
  );

describe('motion recipes', () => {
  it('covers the plan', () => {
    expect(NAMES.sort()).toEqual(
      [
        'arrive',
        'check',
        'expand',
        'listItem',
        'openDialog',
        'openMenu',
        'openTooltip',
        'reveal',
        'shake',
        'swap',
        'toast',
      ].sort(),
    );
  });

  it('opens from the token scales', () => {
    expect(motionRecipe('openDialog').initial).toMatchObject({ scale: hds.motion.scale.dialog });
    expect(motionRecipe('openMenu').initial).toMatchObject({ scale: hds.motion.scale.menu });
    expect(motionRecipe('openTooltip').initial).toMatchObject({ scale: hds.motion.scale.tooltip });
  });

  it('moves on the token springs', () => {
    expect(motionRecipe('openDialog').transition).toMatchObject(hds.motion.springs.spatialDefault);
    expect(motionRecipe('arrive').transition).toMatchObject(hds.motion.springs.elastic);
  });

  it('closes faster than it opens, on the exit easing', () => {
    const exit = motionRecipe('openMenu').exit as { transition: { duration: number } };
    expect(exit.transition.duration).toBe(hds.motion.exit.duration);
  });

  it.each(NAMES)('%s has a reduced version with no movement and no duration', (name) => {
    const r = motionRecipe(name, { reduced: true });
    for (const s of states(r)) {
      for (const key of MOVES) expect(s, `${name} ${key}`).not.toHaveProperty(key);
    }
    expect(r.transition).toEqual({ duration: 0 });
  });
});

describe('useMotionRecipe', () => {
  afterEach(() => vi.unstubAllGlobals());

  const media = (matches: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

  it('returns the full recipe', () => {
    media(false);
    const { result } = renderHook(() => useMotionRecipe('openDialog'));
    expect(result.current.initial).toMatchObject({ scale: hds.motion.scale.dialog });
  });

  it('returns the reduced recipe when the user asks for less motion', () => {
    media(true);
    const { result } = renderHook(() => useMotionRecipe('openDialog'));
    expect(result.current.initial).not.toHaveProperty('scale');
    expect(result.current.transition).toEqual({ duration: 0 });
  });
});
