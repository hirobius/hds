/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * core-set.mjs — the ratified core set (hds#254) projected onto the surfaces
 * consumers read (hds#374, ADR-031).
 *
 * The names come from scripts/lib/core-components.mjs and nowhere else. This
 * module turns them into the manifest `core` flag; the README block, the
 * llms.txt section and the consumer SKILL.md section are rendered from that
 * flag, so each surface is a projection that a test compares byte for byte.
 *
 * `core` is not the manifest `tier` (ADR-006): five core components are
 * `tier: pattern`, and most `tier: primitive` components are not core.
 */

import { CORE_COMPONENTS } from './core-components.mjs';

/**
 * Writes `core: true` on each spec named in `names` and removes `core` from
 * every other spec. The flag is always re-added as the last key so a regen
 * never reorders a spec. Mutates `specs`.
 *
 * A core name with no spec is returned rather than thrown, so the generator
 * still runs on a partial tree (the figma-link test's mini-root); on the real
 * tree scripts/__tests__/core-set.test.mjs and `check-contract-coverage
 * --enforce` (pre-commit) fail on it.
 *
 * @param {Record<string, Record<string, unknown>>} specs manifest.componentSpecs
 * @param {readonly string[]} [names]
 * @returns {string[]} core names that have no spec
 */
export function applyCoreFlag(specs, names = CORE_COMPONENTS) {
  const core = new Set(names);
  for (const [name, spec] of Object.entries(specs)) {
    delete spec.core;
    if (core.has(name)) spec.core = true;
  }
  return names.filter((name) => !specs[name]);
}
