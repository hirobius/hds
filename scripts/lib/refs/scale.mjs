/** @internal — pure helpers for the design-refs pipeline (eval/refs/README.md). */
/**
 * Consistency facts for a proposed token value: where it would sit on its
 * scale and whether it extends the scale or fragments it. The proposal's
 * "consistency risk" starts from these facts; the agent writes the judgement.
 *
 * Guardrail (eval/refs/README.md): prefer extending an existing scale over a
 * one-off value. So a value past the end of the scale that continues its
 * progression on the 4px grid is low risk; a value squeezed between two steps,
 * a near-duplicate of a step or an off-grid value is not.
 */

const isPx = (v) => v && typeof v === 'object' && v.unit === 'px' && typeof v.value === 'number';

/**
 * The px steps of one scale in the token file (`primitive.space`,
 * `primitive.size`, `primitive.radius`, `primitive.typography.size`).
 * @returns {{ key:string, px:number }[]} sorted by px; empty when the path is not a px scale
 */
export function readScale(tokens, scalePath) {
  let node = tokens;
  for (const part of scalePath.split('.')) {
    if (!node || typeof node !== 'object') return [];
    node = node[part];
  }
  if (!node || typeof node !== 'object') return [];
  const steps = [];
  for (const [key, entry] of Object.entries(node)) {
    if (key.startsWith('$') || !entry || typeof entry !== 'object') continue;
    if (isPx(entry.$value)) steps.push({ key, px: entry.$value.value });
  }
  return steps.sort((a, b) => a.px - b.px || a.key.localeCompare(b.key));
}

/** px per key unit when every numeric key names its value (space.10 = 40px -> 4), else null. */
export function keyConvention(steps) {
  const numeric = steps.filter((s) => /^\d+$/.test(s.key) && Number(s.key) > 0);
  if (numeric.length < 3) return null;
  const k = numeric[0].px / Number(numeric[0].key);
  return numeric.every((s) => s.px === Number(s.key) * k) ? k : null;
}

const GRID = 4;
const round2 = (v) => Math.round(v * 100) / 100;

/**
 * Where `px` would sit on `steps`, and how risky adding it is.
 * @param {{key:string,px:number}[]} steps from readScale
 * @param {number} px the wanted value (a median across refs)
 */
export function assessValue(steps, px) {
  if (steps.length === 0) {
    return { position: 'no-scale', risk: 'high', notes: ['the scale has no px steps to extend'] };
  }
  const grid = GRID;
  const snapped = Math.round(px / grid) * grid;
  const notes = [];
  const exact = steps.find((s) => s.px === snapped);
  const convention = keyConvention(steps);
  const suggestedKey = convention ? String(snapped / convention) : null;
  if (exact) {
    return {
      position: 'exists',
      px: snapped,
      key: exact.key,
      risk: 'low',
      notes: [
        `${snapped}px is already ${exact.key}: the gap is usage or a missing semantic alias, not a missing step`,
      ],
    };
  }
  const below = [...steps].reverse().find((s) => s.px < snapped) ?? null;
  const above = steps.find((s) => s.px > snapped) ?? null;
  const max = steps[steps.length - 1];
  const prev = steps.length > 1 ? steps[steps.length - 2] : null;

  let position;
  let risk = 'low';
  if (!above) {
    position = 'beyond-max';
    const ratio = round2(snapped / max.px);
    const lastRatio = prev ? round2(max.px / prev.px) : null;
    notes.push(`extends the scale past its largest step, ${max.key} = ${max.px}px (x${ratio})`);
    if (lastRatio)
      notes.push(`the scale's last step grows x${lastRatio} (${prev.px} -> ${max.px})`);
    if (ratio > 2) {
      risk = 'medium';
      notes.push('more than double the largest step: consider an intermediate step too');
    }
  } else if (!below) {
    position = 'below-min';
    risk = 'medium';
    notes.push(`below the smallest step, ${steps[0].key} = ${steps[0].px}px`);
  } else {
    position = 'between';
    risk = 'medium';
    notes.push(
      `sits between ${below.key} = ${below.px}px and ${above.key} = ${above.px}px: a new step inside the scale makes every choice near it harder`,
    );
  }
  const nearest = [below, above]
    .filter(Boolean)
    .sort((a, b) => Math.abs(a.px - snapped) - Math.abs(b.px - snapped))[0];
  if (nearest && Math.abs(nearest.px - snapped) / nearest.px <= 0.1) {
    risk = 'high';
    notes.push(
      `within 10% of ${nearest.key} = ${nearest.px}px: likely a near-duplicate, try the existing step`,
    );
  }
  if (px % grid !== 0)
    notes.push(`${px}px is off the ${grid}px grid; the proposal uses ${snapped}px`);
  return {
    position,
    px: snapped,
    below: below ? { ...below } : null,
    above: above ? { ...above } : null,
    suggestedKey,
    risk,
    notes,
  };
}
