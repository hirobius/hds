/**
 * The installed package's deprecation record, shared by
 * hds/no-deprecated-import and hds/no-removed-import.
 *
 * The rules ship inside @hirobius/design-system (as the `./eslint-plugin`
 * subpath), three directories below the package root, where
 * scripts/build-deprecations.mjs writes `deprecations.json`. Reading the
 * installed copy means the rules judge code against the version the
 * consumer actually has: a name deprecated in 0.33 is not flagged for a
 * consumer still on 0.32. A package too old to ship the record (or the
 * standalone plugin without the design system beside it) reads as empty —
 * the rules simply have nothing to say.
 */
import { readFileSync } from 'node:fs';

let cached;
export function deprecationsData() {
  if (cached) return cached;
  try {
    cached = JSON.parse(
      readFileSync(new URL('../../../deprecations.json', import.meta.url), 'utf8'),
    );
  } catch {
    cached = { exports: [], removed: [] };
  }
  return cached;
}

/** True when an import source names this package or one of its subpaths. */
export const isHdsSource = (source) =>
  source === '@hirobius/design-system' || source.startsWith('@hirobius/design-system/');
