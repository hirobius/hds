/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — which tenants become modes of the Figma Brand
 * collection (readiness plan A7).
 *
 * The Figma library is shared: anyone it is shown to sees every Brand mode. So
 * a tenant enters only when all of these hold:
 *   1. figma/brand-modes.json lists it by slug (opt-in, never a directory scan);
 *   2. its metadata.json says it is a demo: tier 1, no deployment, no legal
 *      entity (a real client has at least one of those);
 *   3. its tokens.json passes validateTenantOverlay, the same validator
 *      `pnpm tokens` and check-tenant-tokens run.
 * Problems name fields, never their values, so an error message cannot leak
 * client details. buildFigmaModel (scripts/lib/figma-model.mjs) turns the
 * result into the Brand and Density collections.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { validateTenantOverlay } from '../build-tokens.mjs';

export const BRAND_MODES_FILE = 'figma/brand-modes.json';
const SLUG = /^[a-z0-9-]+$/;

/**
 * Why a tenant's metadata does not describe a demo tenant; empty when it does.
 *
 * @param {object|null} metadata  Parsed tenants/<slug>/metadata.json.
 * @returns {string[]}
 */
export function demoTenantProblems(metadata) {
  if (!metadata || typeof metadata !== 'object') return ['it has no metadata.json'];
  const problems = [];
  for (const group of ['deployment', 'legal']) {
    for (const [field, value] of Object.entries(metadata[group] ?? {})) {
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
 * The demo tenants figma/brand-modes.json lists, validated, with their overlays.
 *
 * @param {string} root     Repo root (or a fixture mini-root).
 * @param {object} baseRaw  Parsed hirobius.tokens.json, for the overlay validator.
 * @param {{ validateOverlay?: (overlay: object, baseRaw: object, slug: string) => string[] }} [options]
 * @returns {{ baseMode: string, tenants: Array<{ slug: string, overlay: object }> } | null}
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
  if (!Array.isArray(config.tenants)) refuse(['tenants must be an array of tenant slugs.']);

  const problems = [];
  const tenants = [];
  for (const slug of config.tenants) {
    if (typeof slug !== 'string' || !SLUG.test(slug)) {
      problems.push(`"${slug}" is not a tenant slug ([a-z0-9-]+, no leading underscore).`);
      continue;
    }
    const tokensPath = join(root, 'tenants', slug, 'tokens.json');
    const metadataPath = join(root, 'tenants', slug, 'metadata.json');
    if (!existsSync(tokensPath)) {
      problems.push(`tenants/${slug}/tokens.json does not exist.`);
      continue;
    }
    const metadata = existsSync(metadataPath)
      ? readJson(metadataPath, `tenants/${slug}/metadata.json`)
      : null;
    if (metadata && metadata.slug !== slug) {
      problems.push(`tenants/${slug}/metadata.json has a slug that does not match its directory.`);
      continue;
    }
    const notDemo = demoTenantProblems(metadata);
    if (notDemo.length > 0) {
      problems.push(
        `${slug} does not look like a demo tenant (${notDemo.join('; ')}). The shared Figma library holds demo tenants only: remove ${slug} from ${BRAND_MODES_FILE}.`,
      );
      continue;
    }
    const overlay = readJson(tokensPath, `tenants/${slug}/tokens.json`);
    const errors = validateOverlay(overlay, baseRaw, slug);
    if (errors.length > 0) {
      problems.push(...errors.map((e) => `${e} (node scripts/check-tenant-tokens.mjs)`));
      continue;
    }
    tenants.push({ slug, overlay });
  }
  if (problems.length > 0) refuse(problems);
  return { baseMode: config.baseMode, tenants };
}
