/** @internal — pure helpers for the design-refs pipeline (eval/refs/README.md). */
/**
 * What a design ref is made of, in one module so the validators, the CLI, the
 * index and the review board cannot disagree about an id, a surface or a
 * viewport.
 *
 * A ref is one image Adrian saved for taste (Drive "Design Refs"), rebuilt with
 * only the current HDS package, scored against the original, and mined for the
 * gaps the rebuild could not close. The image itself never enters the repo
 * (the repo is public): a ref keeps its Drive file id, its rebuild, its gap log
 * and a short text card.
 */

/** `2026-10-14-pricing-cards`: the date the ref was added, then a kebab slug. */
export const REF_ID = /^\d{4}-\d{2}-\d{2}-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * What kind of screen the image shows. HDS is for apps and dashboards first
 * (docs/ai/NORTH_STAR.md); a proposal whose evidence is all `marketing` or
 * `editorial` is flagged as possible drift.
 */
export const SURFACES = ['app', 'dashboard', 'mobile-app', 'marketing', 'editorial', 'other'];
export const CORE_SURFACES = ['app', 'dashboard', 'mobile-app'];

export const THEMES = ['light', 'dark'];

/** A ref renders at one width: a phone capture at 390, anything wider at 1280. */
export const VIEWPORTS = {
  390: { key: '390', width: 390, height: 844 },
  1280: { key: '1280', width: 1280, height: 800 },
};
export const VIEWPORT_WIDTHS = Object.keys(VIEWPORTS).map(Number);

/** The fidelity rubric: each dimension 0 (nothing like it) to 4 (indistinguishable at a glance). */
export const RUBRIC = ['layout', 'spacing', 'type', 'color', 'components'];
export const RUBRIC_MAX = 4;

export const DECISIONS = ['approve', 'reject', 'defer'];
export const RECOMMENDATIONS = ['adopt', 'adopt-modified', 'reject'];
export const RISK_LEVELS = ['low', 'medium', 'high'];

/** A gap recurs when this many distinct refs hit it (eval/refs/config.json may override). */
export const DEFAULT_THRESHOLD = 3;

/** Paths inside the repository. */
export const PATHS = {
  root: 'eval/refs',
  refs: 'eval/refs/refs',
  config: 'eval/refs/config.json',
  vocab: 'eval/refs/gap-ids.json',
  decisions: 'eval/refs/decisions.json',
  proposals: 'eval/refs/proposals',
  index: 'eval/refs/INDEX.md',
  reports: 'reports/refs',
  sources: 'reports/refs/sources',
  renders: 'reports/refs/renders',
};

/** `2026-10-14` from a ref id. */
export const refDate = (id) => String(id).slice(0, 10);
