/**
 * How wide a page title's longest word runs at the display role (Sora 700, tight tracking),
 * in em. globals.css sizes the H1 so that word fits the column, because a title never breaks
 * inside a word ("DataTableSe / ction" at 390px). Advance widths per character were measured
 * in the browser from the shipped Sora 700 face at the display letter-spacing (2026-10-22);
 * the sum runs a hair over the real kerned width, so a word sized by it always fits.
 */
const ADVANCE_EM: Record<string, number> = {
  0: 0.753,
  1: 0.418,
  2: 0.622,
  3: 0.622,
  4: 0.662,
  5: 0.634,
  6: 0.677,
  7: 0.597,
  8: 0.657,
  9: 0.677,
  A: 0.783,
  B: 0.682,
  C: 0.79,
  D: 0.771,
  E: 0.584,
  F: 0.55,
  G: 0.821,
  H: 0.79,
  I: 0.322,
  J: 0.633,
  K: 0.742,
  L: 0.548,
  M: 0.961,
  N: 0.866,
  O: 0.854,
  P: 0.657,
  Q: 0.854,
  R: 0.72,
  S: 0.657,
  T: 0.614,
  U: 0.766,
  V: 0.73,
  W: 1.064,
  X: 0.712,
  Y: 0.647,
  Z: 0.637,
  a: 0.584,
  b: 0.693,
  c: 0.601,
  d: 0.693,
  e: 0.614,
  f: 0.348,
  g: 0.676,
  h: 0.642,
  i: 0.324,
  j: 0.329,
  k: 0.629,
  l: 0.305,
  m: 0.973,
  n: 0.642,
  o: 0.671,
  p: 0.693,
  q: 0.693,
  r: 0.411,
  s: 0.546,
  t: 0.424,
  u: 0.635,
  v: 0.587,
  w: 0.912,
  x: 0.591,
  y: 0.56,
  z: 0.492,
  '-': 0.499,
};
/** Any other character (punctuation, accents) counts as wide, so it errs toward fitting. */
const UNKNOWN_EM = 1;

/** The em width of the title's widest word, rounded up to 0.01em. */
export function titleWordEm(title: string): number {
  const words = title.split(/\s+/).filter(Boolean);
  const em = (word: string) => [...word].reduce((sum, c) => sum + (ADVANCE_EM[c] ?? UNKNOWN_EM), 0);
  return Math.ceil(Math.max(1, ...words.map(em)) * 100) / 100;
}
