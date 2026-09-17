/**
 * scripts/lib/figma-link.mjs
 *
 * How generate-manifest.mjs fills `componentSpecs[].figmaLink`, and how it
 * reports Figma link coverage.
 *
 * A figmaLink is either a real Figma URL or null. The generator used to write a
 * `TODO:hds-master:<Name>` marker for every spec without a URL, which kept a
 * "figmaLink populated" count at 100% while no spec linked to Figma. Those
 * markers are now discarded on regen, and coverage counts real URLs only.
 *
 * @module figma-link
 */

const FIGMA_URL_RE = /^https?:\/\/(?:[\w-]+\.)*figma\.com\//i;

function isFigmaUrl(value) {
  return typeof value === 'string' && FIGMA_URL_RE.test(value);
}

/**
 * Pick the first candidate that is a real Figma URL (for example the curated
 * figmaLink, then an `@figma` JSDoc tag, then the legacy figmaUrl).
 * Placeholders and other non-URL strings are skipped.
 *
 * @param {...unknown} candidates
 * @returns {string | null}
 */
export function resolveFigmaLink(...candidates) {
  return candidates.find(isFigmaUrl) ?? null;
}

/**
 * Count the specs whose figmaLink is a real Figma URL.
 *
 * @param {Record<string, { figmaLink?: unknown }>} specs
 * @returns {{ linked: number, total: number, percent: number }}
 */
export function figmaLinkCoverage(specs) {
  const all = Object.values(specs);
  const linked = all.filter((spec) => isFigmaUrl(spec?.figmaLink)).length;
  const total = all.length;
  return { linked, total, percent: total === 0 ? 0 : Math.round((linked / total) * 100) };
}
