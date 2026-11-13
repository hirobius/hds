/** @internal — motion records behind `hds.motion.*`; not a public subpath. */
/**
 * Motion token records (`hds.motion.*`), in their own module so that a
 * component that only needs motion — Button through useHdsMotion — does not
 * pull the full token bridge (tokens.ts + generated-token-refs.ts, ~41 kB
 * minified) into a consumer's bundle (hds#1145). tokens.ts re-exposes these
 * as `hds.motion`, so the public API does not change. It imports only the
 * duration group: the whole primitive tree cost Button about 2 kB gzip.
 */
import { primitiveDuration } from './generated-token-values';

const msToSeconds = (value: string) => parseFloat(value) / 1000;

export const motion = {
  productive: {
    duration: msToSeconds(primitiveDuration.short),
    easing: [0, 0, 0.2, 1] as [number, number, number, number],
  },
  expressive: {
    duration: msToSeconds(primitiveDuration.medium),
    // primitive.easing.elastic; motion-springs.test.ts keeps it equal to hds.motion.springs.elastic.
    easing: { type: 'spring', stiffness: 300, damping: 20, mass: 1 } as const,
  },
  spatial: {
    duration: msToSeconds(primitiveDuration.long),
    easing: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
  exit: {
    duration: msToSeconds(primitiveDuration.instant),
    easing: [0.4, 0, 1, 1] as [number, number, number, number],
  },
} as const;
