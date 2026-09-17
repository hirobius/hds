/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — what every Figma sync command reads from the repo:
 * the Figma model built from hirobius.tokens.json plus the demo tenants
 * figma/brand-modes.json lists (refused when it breaks an invariant), and the
 * renames in TOKEN_MIGRATION.md.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { buildFigmaModel } from './figma-model.mjs';
import { loadBrandModes } from './figma-brand-modes.mjs';
import { validateFigmaModel } from './figma-model-invariants.mjs';
import { parseMigrationRenames } from '../check-token-renames.mjs';

/**
 * @param {string} root  A repo root (or a fixture mini-root) holding hirobius.tokens.json
 *   and, optionally, figma/brand-modes.json with the tenants it lists.
 * @returns {{ model: object, renames: Record<string, string> }}
 */
export function loadFigmaInputs(root) {
  const raw = JSON.parse(readFileSync(join(root, 'hirobius.tokens.json'), 'utf8'));
  const model = buildFigmaModel(raw, { brands: loadBrandModes(root, raw) });
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
