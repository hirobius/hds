/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — what every Figma sync command reads from the repo:
 * the Figma model built from hirobius.tokens.json plus the directions
 * figma/brand-modes.json lists (refused when it breaks an invariant), and the
 * renames in TOKEN_MIGRATION.md. The model's meta/version is package.json's
 * "version" (absent when the root has no package.json, as fixture roots do).
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { buildFigmaModel } from './figma-model.mjs';
import { loadBrandModes } from './figma-brand-modes.mjs';
import { validateFigmaModel } from './figma-model-invariants.mjs';
import { parseMigrationRenames } from '../check-token-renames.mjs';
import { readTokenSource } from './token-source.mjs';

/** package.json's "version" at `root`, or null. */
export function packageVersion(root) {
  const path = join(root, 'package.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')).version ?? null;
}

/**
 * @param {string} root  A repo root (or a fixture mini-root) holding hirobius.tokens.json
 *   and, optionally, figma/brand-modes.json with the tenants it lists.
 * @returns {{ model: object, renames: Record<string, string> }}
 */
export function loadFigmaInputs(root) {
  const raw = readTokenSource(join(root, 'hirobius.tokens.json'));
  const model = buildFigmaModel(raw, {
    brands: loadBrandModes(root, raw),
    version: packageVersion(root),
  });
  const violations = validateFigmaModel(model);
  if (violations.length > 0) {
    throw new Error(
      `The Figma model has ${violations.length} invariant violation(s), so nothing was generated (details: pnpm figma:model):\n  • ${violations.join('\n  • ')}`,
    );
  }
  const migrationPath = join(root, 'TOKEN_MIGRATION.md');
  const renames = existsSync(migrationPath)
    ? parseMigrationRenames(readFileSync(migrationPath, 'utf8'))
    : {};
  return { model, renames };
}
