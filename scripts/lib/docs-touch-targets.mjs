/** @internal — pure helpers for scripts/check-docs-touch-targets.mjs (docs-site touch-target gate, hds#750). */

/** Fallback when the page does not expose --semantic-size-touchTarget. */
export const DEFAULT_MIN = 44;
/** Rounding slack: a 43.99px box from subpixel layout still passes. */
const EPSILON = 0.5;

/**
 * @param {{route:string, name:string, min:number, boxes:{label:string,width:number,height:number}[]}[]} scans
 * @returns {{route:string, name:string, detail:string}[]}
 */
export function evaluateTargets(scans) {
  const problems = [];
  for (const s of scans) {
    if (!s.boxes.length) {
      problems.push({ route: s.route, name: s.name, detail: 'selector matched nothing' });
      continue;
    }
    for (const b of s.boxes) {
      const short = [];
      if (b.height + EPSILON < s.min) short.push(`height ${b.height}`);
      if (b.width + EPSILON < s.min) short.push(`width ${b.width}`);
      if (short.length) {
        problems.push({
          route: s.route,
          name: s.name,
          detail: `"${b.label}" ${short.join(', ')} < ${s.min}px`,
        });
      }
    }
  }
  return problems;
}

/** A targets file is a non-empty list of {route, name, selector}. */
export function validateTargets(targets) {
  if (!Array.isArray(targets) || !targets.length) return ['targets must be a non-empty array'];
  const errors = [];
  targets.forEach((t, i) => {
    for (const k of ['route', 'name', 'selector'])
      if (typeof t?.[k] !== 'string' || !t[k]) errors.push(`targets[${i}].${k} must be a string`);
  });
  return errors;
}
