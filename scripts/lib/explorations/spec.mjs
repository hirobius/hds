/** @internal — pure helpers for the design-explorations spec set (hds#628). */
/**
 * What the explorations spec set is made of: the six screens, the three
 * directions, the states every brief requires and the viewport matrix. One
 * module so the briefs, the gap-log validator, the run loader and the gates
 * cannot disagree about a screen id or a direction letter.
 */

/**
 * The six screens, in the priority order of the table in hds#628. `id` is the
 * folder name under eval/explorations/screens/ and the prefix of a direction's
 * app id (`standing-A`).
 */
export const SCREENS = [
  {
    id: 'standing',
    title: 'Standing bands, desktop and phone',
    feature: ['hirobius/ops#585'],
  },
  {
    id: 'ops-home',
    title: 'Ops home: capture box and recent drops',
    feature: ['hirobius/ops#591', 'hirobius/ops#593'],
  },
  {
    id: 'drops-inbox',
    title: 'Drops inbox and item detail',
    feature: ['hirobius/ops#594'],
  },
  {
    id: 'pitch',
    title: "Pitch, the partner's phone view",
    feature: ['hirobius/ops#482', 'hirobius/ops#489', 'hirobius/ops#488'],
  },
  {
    id: 'leads',
    title: 'Leads page with the 8-stage lead chain',
    feature: ['Leads visual pass (moved here by hirobius/ops#585)'],
  },
  {
    id: 'client-dashboard',
    title: 'Client dashboard',
    feature: ['hirobius/hds#622'],
  },
];

export const SCREEN_IDS = SCREENS.map((s) => s.id);

/** A: faithful, B: ceiling, C: wildcard (hds#628). */
export const DIRECTIONS = {
  A: { name: 'Faithful', question: 'Is HDS enough as it is?' },
  B: { name: 'Ceiling', question: 'How far do tokens alone go?' },
  C: { name: 'Wildcard', question: 'What should HDS add?' },
};

export const DIRECTION_LETTERS = Object.keys(DIRECTIONS);

/** The states every brief requires, in the order a direction renders them under its `States` region. */
export const REQUIRED_STATES = ['empty', 'loading', 'error', 'long content', 'token failure'];

/**
 * Every direction is captured in each of these: 1280 and 390 wide, light and
 * dark (the consistency harness's own matrix has no 390 dark). Height only sets
 * the viewport; PNGs are full page.
 */
export const EXPLORATION_VIEWPORTS = [
  { key: '1280-light', width: 1280, height: 800, theme: 'light' },
  { key: '1280-dark', width: 1280, height: 800, theme: 'dark' },
  { key: '390-light', width: 390, height: 844, theme: 'light' },
  { key: '390-dark', width: 390, height: 844, theme: 'dark' },
];

/** `standing-A` -> { screen: 'standing', letter: 'A' }; null when it is not a direction id. */
export function parseDirectionId(id) {
  const m = /^(.+)-([ABC])$/.exec(String(id));
  if (!m || !SCREEN_IDS.includes(m[1])) return null;
  return { screen: m[1], letter: m[2] };
}

export const directionId = (screen, letter) => `${screen}-${letter}`;

/** Position of a screen in the hds#628 table, for stable ordering. Unknown screens sort last. */
export function screenOrder(screen) {
  const i = SCREEN_IDS.indexOf(screen);
  return i === -1 ? SCREEN_IDS.length : i;
}
