/** @internal — motion records behind `hds.motion.*`; not a public subpath. */
/**
 * Motion token records (`hds.motion.*`), in their own module so that a
 * component that only needs motion — Button through useHdsMotion — does not
 * pull the full token bridge (tokens.ts + generated-token-refs.ts, ~41 kB
 * minified) into a consumer's bundle (hds#1145). tokens.ts re-exposes these
 * as `hds.motion`, so the public API does not change.
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

export const motion = {
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
  productive: {
    duration: msToSeconds(tokenValues.primitive.duration.short),
    easing: [0, 0, 0.2, 1] as [number, number, number, number],
  },
  expressive: {
    duration: msToSeconds(tokenValues.primitive.duration.medium),
    easing: springs.elastic,
  },
  spatial: {
    duration: msToSeconds(tokenValues.primitive.duration.long),
    easing: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
  exit: {
    duration: msToSeconds(tokenValues.primitive.duration.instant),
    easing: [0.4, 0, 1, 1] as [number, number, number, number],
  },
} as const;
