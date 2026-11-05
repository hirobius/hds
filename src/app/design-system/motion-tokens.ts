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

export const motion = {
  productive: {
    duration: msToSeconds(tokenValues.primitive.duration.short),
    easing: [0, 0, 0.2, 1] as [number, number, number, number],
  },
  expressive: {
    duration: msToSeconds(tokenValues.primitive.duration.medium),
    easing: { type: 'spring', stiffness: 300, damping: 20, mass: 1 } as const,
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
