/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * A spring as CSS. CSS has no spring() function, so a spring token is turned
 * into a `linear()` easing: the spring is simulated from rest at 0 toward 1,
 * sampled at even steps until it settles, and the samples become the curve's
 * points. The shape is the spring's; the duration of the transition that uses
 * it is the token's. `settleMs` is how long the spring itself takes to settle,
 * for a transition that wants to match it. Motion (JS) reads the same
 * stiffness, damping and mass directly, so both paths share one spring.
 *
 * Pure: no fs. hds#751.
 */

const DT = 1 / 2000; // integration step, seconds
const SETTLE = 0.001; // within 0.1% of the target ...
const REST = 0.01; // ... and nearly still
const MAX_SECONDS = 5;

/**
 * Integrate x'' = (-k (x - 1) - c x') / m from x = 0, x' = 0.
 * @param {{ stiffness:number, damping:number, mass?:number }} spring
 * @returns {{ samples:number[], settleMs:number, peak:number }} samples every 1 ms
 */
export function simulateSpring({ stiffness, damping, mass = 1 }) {
  if (!(stiffness > 0)) throw new Error(`spring stiffness must be above 0, got ${stiffness}`);
  if (!(damping > 0))
    throw new Error(
      `spring damping must be above 0, got ${damping}; the spring would never settle`,
    );
  if (!(mass > 0)) throw new Error(`spring mass must be above 0, got ${mass}`);
  let x = 0;
  let v = 0;
  let peak = 0;
  const samples = [0];
  const perMs = Math.round(0.001 / DT);
  for (let step = 1; step <= MAX_SECONDS / DT; step += 1) {
    // semi-implicit Euler: stable for these stiffnesses at this step
    v += ((-stiffness * (x - 1) - damping * v) / mass) * DT;
    x += v * DT;
    peak = Math.max(peak, x);
    if (step % perMs === 0) {
      samples.push(x);
      if (Math.abs(x - 1) < SETTLE && Math.abs(v) < REST) {
        return { samples, settleMs: samples.length - 1, peak };
      }
    }
  }
  throw new Error(
    `spring (${stiffness}, ${damping}, ${mass}) did not settle within ${MAX_SECONDS}s`,
  );
}

const round = (v) => Math.round(v * 10000) / 10000;

/**
 * @param {{ stiffness:number, damping:number, mass?:number }} spring
 * @param {{ points?:number }} [opts] how many points the curve has (default 40 steps)
 * @returns {{ easing:string, settleMs:number }}
 */
export function springToLinear(spring, { points = 40 } = {}) {
  const { samples, settleMs } = simulateSpring(spring);
  const last = samples.length - 1;
  const out = [];
  for (let i = 0; i <= points; i += 1) {
    out.push(i === 0 ? 0 : i === points ? 1 : round(samples[Math.round((i / points) * last)]));
  }
  return { easing: `linear(${out.join(', ')})`, settleMs: Math.ceil(settleMs / 10) * 10 };
}
