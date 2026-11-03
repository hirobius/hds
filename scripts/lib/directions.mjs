/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The directions shipped in this repo (ADR-035): every directory under
 * directions/ except the `_template` starter, in name order. One reader for
 * build-tokens, check-tenant-tokens and the tests, so adding a direction is
 * adding a folder and nothing else.
 */
import { existsSync, readdirSync } from 'node:fs';

/**
 * @param {string} directionsDir  Absolute path of the directions/ folder.
 * @returns {string[]}            Slugs, sorted; empty when the folder is missing.
 */
export function listDirectionSlugs(directionsDir) {
  if (!existsSync(directionsDir)) return [];
  return readdirSync(directionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .sort();
}
