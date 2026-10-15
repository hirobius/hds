/**
 * useMotionRecipe — a named motion recipe, already switched to its
 * reduced-motion version when the user asks for less motion (hds#751).
 * Spread the result on a `motion.*` element.
 */
import {
  motionRecipe,
  type MotionRecipe,
  type MotionRecipeName,
} from '../design-system/motion-recipes';
import { useReducedMotion } from './useReducedMotion';

export function useMotionRecipe(name: MotionRecipeName): MotionRecipe {
  return motionRecipe(name, { reduced: useReducedMotion() });
}
