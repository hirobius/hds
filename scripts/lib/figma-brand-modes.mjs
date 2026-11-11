/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — which directions become modes of the Figma Brand
 * collection (readiness plan A7; ADR-035).
 *
 * The Figma library is shared: anyone it is shown to sees every Brand mode. A
 * direction is a shared art direction and never a client (ADR-035), so the
 * directions/ folder is the statement that a slug may be shown. One enters
 * only when all of these hold:
 *   1. figma/brand-modes.json lists it by slug (opt-in, never a directory scan);
 *   2. it lives under directions/<slug>/ and its metadata.json is tier 1 with
 *      the deployment and legal groups present and empty. A client's brand
 *      has a deployment or a legal entity, so a client filed under directions/
 *      by mistake still fails here;
 *   3. its tokens.json passes validateTenantOverlay, the same validator
 *      `pnpm tokens` and check-tenant-tokens run.
 * Problems name fields, never their values, so an error message cannot leak a
 * client's details. buildFigmaModel (scripts/lib/figma-model.mjs) turns the
 * result into the Brand and Density collections.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { validateTenantOverlay } from './token-emit/tenant.mjs';
import { EDGE_COMPUTED_TOKENS, computeEdges, layered } from './raised-edge.mjs';

export const BRAND_MODES_FILE = 'figma/brand-modes.json';
const SLUG = /^[a-z0-9-]+$/;

/**
 * Why a direction's metadata does not describe a direction; empty when it does.
 * The retired `demo` marker is ignored either way: the folder is the statement.
 *
 * @param {object|null} metadata  Parsed directions/<slug>/metadata.json.
 * @returns {string[]}
 */
export function directionProblems(metadata) {
  if (!metadata || typeof metadata !== 'object') return ['it has no metadata.json'];
  const problems = [];
  for (const group of ['deployment', 'legal']) {
    if (!metadata[group] || typeof metadata[group] !== 'object') {
      problems.push(`${group} is missing`);
      continue;
    }
    for (const [field, value] of Object.entries(metadata[group])) {
      if (value != null) problems.push(`${group}.${field} is set`);
    }
  }
  if (metadata.tier !== 1) problems.push('tier is not 1');
  return problems;
}

const readJson = (path, label) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
};

/**
 * The directions figma/brand-modes.json lists, validated, with their overlays.
 *
 * @param {string} root     Repo root (or a fixture mini-root).
 * @param {object} baseRaw  Parsed hirobius.tokens.json, for the overlay validator.
 * @param {{ validateOverlay?: (overlay: object, baseRaw: object, slug: string) => string[] }} [options]
 * @returns {{ baseMode: string, directions: Array<{ slug: string, overlay: object }> } | null}
 *   null when the root has no figma/brand-modes.json.
 */
export function loadBrandModes(root, baseRaw, { validateOverlay = validateTenantOverlay } = {}) {
  const configPath = join(root, BRAND_MODES_FILE);
  if (!existsSync(configPath)) return null;
  const config = readJson(configPath, BRAND_MODES_FILE);
  const refuse = (problems) => {
    throw new Error(
      `${BRAND_MODES_FILE}: the Figma Brand collection cannot use it:\n  • ${problems.join('\n  • ')}`,
    );
  };
  if (typeof config.baseMode !== 'string' || config.baseMode.trim() === '') {
    refuse(['baseMode must name the base brand mode (for example "Hirobius").']);
  }
  if (!Array.isArray(config.directions))
    refuse(['directions must be an array of direction slugs.']);

  const problems = [];
  const directions = [];
  for (const slug of config.directions) {
    if (typeof slug !== 'string' || !SLUG.test(slug)) {
      problems.push(`"${slug}" is not a direction slug ([a-z0-9-]+, no leading underscore).`);
      continue;
    }
    const tokensPath = join(root, 'directions', slug, 'tokens.json');
    const metadataPath = join(root, 'directions', slug, 'metadata.json');
    if (!existsSync(tokensPath)) {
      problems.push(`directions/${slug}/tokens.json does not exist.`);
      continue;
    }
    const metadata = existsSync(metadataPath)
      ? readJson(metadataPath, `directions/${slug}/metadata.json`)
      : null;
    if (metadata && metadata.slug !== slug) {
      problems.push(
        `directions/${slug}/metadata.json has a slug that does not match its directory.`,
      );
      continue;
    }
    const notDirection = directionProblems(metadata);
    if (notDirection.length > 0) {
      problems.push(
        `${slug} does not look like a direction (${notDirection.join('; ')}). The shared Figma library holds directions only, never a client's brand: remove ${slug} from ${BRAND_MODES_FILE}.`,
      );
      continue;
    }
    const overlay = readJson(tokensPath, `directions/${slug}/tokens.json`);
    const errors = validateOverlay(overlay, baseRaw, slug);
    if (errors.length > 0) {
      problems.push(...errors.map((e) => `${e} (node scripts/check-tenant-tokens.mjs)`));
      continue;
    }
    directions.push({ slug, overlay });
  }
  // Accents (data-accent, accents/<name>/tokens.json): first-party, the same overlays
  // accents.css is built from, so no direction metadata. Each is the Brand mode
  // "accent-<name>", so Figma shows every accent the code ships (Adrian, 2026-11-11).
  if (config.accents !== undefined && !Array.isArray(config.accents))
    refuse(['accents must be an array of accent names.']);
  for (const name of config.accents ?? []) {
    if (typeof name !== 'string' || !SLUG.test(name)) {
      problems.push(`"${name}" is not an accent name ([a-z0-9-]+).`);
      continue;
    }
    const tokensPath = join(root, 'accents', name, 'tokens.json');
    if (!existsSync(tokensPath)) {
      problems.push(`accents/${name}/tokens.json does not exist.`);
      continue;
    }
    const overlay = readJson(tokensPath, `accents/${name}/tokens.json`);
    const errors = validateOverlay(overlay, baseRaw, name);
    if (errors.length > 0) {
      problems.push(...errors.map((e) => `${e} (accents/${name}/tokens.json)`));
      continue;
    }
    directions.push({ slug: `accent-${name}`, overlay: withoutNoops(overlay, baseRaw) });
  }
  if (problems.length > 0) refuse(problems);
  return {
    baseMode: config.baseMode,
    directions: directions.map((d) => ({ ...d, overlay: withComputedEdges(baseRaw, d.overlay) })),
  };
}

const at = (tree, path) => path.split('.').reduce((n, k) => n?.[k], tree);

const modesOf = (leaf) => leaf?.$extensions?.['com.figma.variables']?.modes ?? null;

/**
 * The overlay without leaves that restate the base value (same $value, same modes). An accent
 * restates some (component.tag.active*) for its CSS cascade; as a Brand override each would
 * only add an alias every mode shares, into a later collection the native import cannot keep.
 */
function withoutNoops(overlay, base) {
  if (!overlay || typeof overlay !== 'object') return overlay;
  if ('$value' in overlay) {
    const same =
      base &&
      JSON.stringify(base.$value) === JSON.stringify(overlay.$value) &&
      JSON.stringify(modesOf(base)) === JSON.stringify(modesOf(overlay));
    return same ? undefined : overlay;
  }
  const out = {};
  for (const [k, v] of Object.entries(overlay)) {
    const kept = k.startsWith('$') ? v : withoutNoops(v, base?.[k]);
    if (kept !== undefined && !(typeof kept === 'object' && Object.keys(kept).length === 0))
      out[k] = kept;
  }
  return out;
}

/**
 * The overlay plus each computed edge token (semantic.color.edge.primary) it moves. Code
 * computes the edge from the fill (raised-edge.mjs), so an overlay that changes the fill never
 * carries it; without this, a Brand mode would draw its Button on the base edge. Unchanged
 * edges and token trees without edge tokens (unit fixtures) leave the overlay as it is.
 */
function withComputedEdges(baseRaw, overlay) {
  const paths = Object.entries(EDGE_COMPUTED_TOKENS).filter(([, path]) => at(baseRaw, path));
  if (paths.length === 0) return overlay;
  const base = computeEdges(baseRaw);
  const mine = computeEdges(layered(baseRaw, overlay));
  let out = overlay;
  for (const [key, path] of paths) {
    if (mine.Light[key] === base.Light[key] && mine.Dark[key] === base.Dark[key]) continue;
    const leaf = {
      $type: 'color',
      $value: mine.Light[key],
      $description: `Computed by raised-edge.mjs from this mode's fill (the same value its CSS ships).`,
      $extensions: {
        'com.figma.variables': { modes: { Light: mine.Light[key], Dark: mine.Dark[key] } },
      },
    };
    out = layered(
      out,
      path.split('.').reduceRight((child, k) => ({ [k]: child }), leaf),
    );
  }
  return out;
}
