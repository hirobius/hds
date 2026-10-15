/**
 * Motion recipes (hds#751, ADR-064): the named motions components and apps use
 * instead of hand-written timings. Each recipe is a set of props to spread on a
 * `motion.*` element (`initial`, `animate`, `exit`, `transition`), built only
 * from `hds.motion` tokens. Every recipe has a reduced-motion version with no
 * movement and no duration; `useMotionRecipe` picks it for the user.
 *
 *   <AnimatePresence>
 *     {open && <motion.div {...useMotionRecipe('openMenu')} />}
 *   </AnimatePresence>
 */
import type { TargetAndTransition, Transition } from 'motion/react';
import hds from './tokens';

const m = hds.motion;

type Target = TargetAndTransition;

/** Props to spread on a `motion.*` element. */
export interface MotionRecipe {
  initial: Target | false;
  animate: Target;
  exit?: Target;
  transition: Transition;
  layout?: boolean;
}

const exitTransition: Transition = { duration: m.exit.duration, ease: m.exit.easing };

/** Open from slightly smaller, toward where it came from; close faster than it opened. */
const open = (scale: number, y = 0): MotionRecipe => ({
  initial: { opacity: 0, scale, y },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale, y, transition: exitTransition },
  transition: m.springs.spatialDefault,
});

export const MOTION_RECIPES = {
  /** Dialogs and alert dialogs. */
  openDialog: open(m.scale.dialog),
  /** Menus, popovers, selects and comboboxes: a slight drop from the trigger. */
  openMenu: open(m.scale.menu, -m.distance.nudge),
  /** Tooltips. */
  openTooltip: { ...open(m.scale.tooltip), transition: m.springs.spatialFast },
  /** A toast slides up into the stack and fades out. */
  toast: {
    initial: { opacity: 0, y: m.distance.slide, scale: m.scale.menu },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: m.scale.menu, transition: exitTransition },
    transition: m.springs.spatialDefault,
  },
  /** Content arriving: skeleton to content, sections, empty states. Stagger with `staggerDelay`. */
  reveal: {
    initial: { opacity: 0, y: m.distance.slide, filter: `blur(${m.blur.reveal}px)` },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: m.springs.effectsDefault,
  },
  /** One value replacing another in place: a label, an icon, copy then a tick. Key the element on the value. */
  swap: {
    initial: { opacity: 0, y: m.distance.nudge, filter: `blur(${m.blur.swap}px)` },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: {
      opacity: 0,
      y: -m.distance.nudge,
      filter: `blur(${m.blur.swap}px)`,
      transition: exitTransition,
    },
    transition: m.springs.effectsFast,
  },
  /** A confirmation landing: saved, sent, done. The one place a visible overshoot belongs. */
  arrive: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: m.springs.elastic,
  },
  /** A tick drawing itself (an SVG path). */
  check: {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    exit: { pathLength: 0, opacity: 0, transition: exitTransition },
    transition: m.springs.spatialFast,
  },
  /** A short horizontal shake on an error. Key the element on the error so it replays. */
  shake: {
    initial: false,
    animate: { x: [0, -6, 6, -4, 4, 0] },
    transition: { duration: m.spatial.duration, ease: 'easeOut' },
  },
  /** Height grows and shrinks smoothly: disclosures, sidebars. */
  expand: {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: { height: 0, opacity: 0, transition: exitTransition },
    transition: m.springs.spatialDefault,
  },
  /** A list item entering, leaving and moving to its new place. */
  listItem: {
    initial: { opacity: 0, y: m.distance.slide },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: m.scale.menu, transition: exitTransition },
    transition: m.springs.spatialDefault,
    layout: true,
  },
} satisfies Record<string, MotionRecipe>;

export type MotionRecipeName = keyof typeof MOTION_RECIPES;

const MOVEMENT = new Set(['x', 'y', 'scale', 'rotate', 'filter', 'pathLength']);

function still(target: Target | false | undefined): Target | false | undefined {
  if (!target) return target;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(target)) {
    if (!MOVEMENT.has(key) && key !== 'transition') out[key] = value;
  }
  return out as Target;
}

/**
 * A recipe by name. With `reduced`, the same recipe without movement or blur
 * and with no duration: things still appear and disappear, instantly.
 */
export function motionRecipe(name: MotionRecipeName, { reduced = false } = {}): MotionRecipe {
  const recipe: MotionRecipe = MOTION_RECIPES[name];
  if (!reduced) return recipe;
  const out: MotionRecipe = {
    initial: still(recipe.initial) as Target | false,
    animate: still(recipe.animate) as Target,
    transition: { duration: 0 },
  };
  if (recipe.exit) out.exit = still(recipe.exit) as Target;
  return out;
}

/** Delay for the item at `index` in a list that arrives one after another. */
export const staggerDelay = (index: number) => index * m.stagger;
