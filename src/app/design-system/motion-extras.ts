/** @internal — the motion constants beyond the four roles, behind `hds.motion.*`; not a public subpath. */
/**
 * Springs, stagger, extended duration and enter scales for `hds.motion`
 * (hds#751). They live apart from motion-tokens.ts so that a component that
 * only needs the four motion roles (Button through useHdsMotion) does not
 * bundle them (hds#1145). tokens.ts merges both into `hds.motion`.
 */
import { tokenValues } from './generated-token-values';

const msToSeconds = (value: string) => parseFloat(value) / 1000;

/**
 * Springs for Motion (JS). The same stiffness, damping and mass become CSS
 * `linear()` curves in tokens.css; motion-springs.test.ts fails if these drift
 * from hirobius.tokens.json (hds#751). Stiffness and damping ratios of the
 * spatial and effects springs follow Material 3's spring tokens (Apache-2.0).
 */
const spring = (stiffness: number, damping: number) =>
  ({ type: 'spring', stiffness, damping, mass: 1 }) as const;

const springs = {
  /** Lively arrival: one ~11% overshoot. Confirmations, things landing. */
  elastic: spring(300, 20),
  /** Small moves: indicators, thumbs, chips. */
  spatialFast: spring(1400, 67.35),
  /** Panels, menus and cards moving into place. */
  spatialDefault: spring(700, 47.62),
  /** Large travel: sheets, page-level moves. */
  spatialSlow: spring(300, 31.18),
  /** Quick fades and colour changes; never overshoots. */
  effectsFast: spring(3800, 123.29),
  /** Opacity and blur changes; never overshoots. */
  effectsDefault: spring(1600, 80),
  /** Slow reveals; never overshoots. */
  effectsSlow: spring(800, 56.57),
} as const;

const { scale } = tokenValues.primitive;

export const motionExtras = {
  springs,
  /** Seconds between items that arrive one after another. */
  stagger: msToSeconds(tokenValues.primitive.duration.stagger),
  /** Seconds for long reveals (skeleton to content, page entrances). */
  extended: msToSeconds(tokenValues.primitive.duration.extended),
  /** Scale an element opens from and closes to. */
  scale: {
    dialog: Number(scale['96']),
    menu: Number(scale['97']),
    tooltip: Number(scale['98']),
  },
} as const;
