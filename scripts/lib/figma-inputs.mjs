/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — what every Figma sync command reads from the repo:
 * the Figma model built from hirobius.tokens.json plus the directions
 * figma/brand-modes.json lists (refused when it breaks an invariant), and the
 * renames in TOKEN_MIGRATION.md. The model's Hirobius/Meta values come from
 * readFigmaMeta (package.json, the release ledger, git); a fixture root with
 * no package.json has none.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { buildFigmaModel } from './figma-model.mjs';
import { loadBrandModes } from './figma-brand-modes.mjs';
import { validateFigmaModel } from './figma-model-invariants.mjs';
import { parseMigrationRenames } from '../check-token-renames.mjs';
import { readTokenSource } from './token-source.mjs';
import { readFigmaMeta } from './figma-meta.mjs';

/**
 * @param {string} root  A repo root (or a fixture mini-root) holding hirobius.tokens.json
 *   and, optionally, figma/brand-modes.json with the tenants it lists.
 * @param {{ git?: Function, commit?: string }} [metaOptions]  passed to readFigmaMeta.
 * @returns {{ model: object, renames: Record<string, string> }}
 */
export function loadFigmaInputs(root, metaOptions = {}) {
  const raw = readTokenSource(join(root, 'hirobius.tokens.json'));
  const model = buildFigmaModel(raw, {
    brands: loadBrandModes(root, raw),
    meta: readFigmaMeta(root, metaOptions),
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
