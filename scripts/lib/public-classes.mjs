/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * public-classes.mjs — the classes HDS promises consumers (hds#449).
 *
 * Two sets: every hds-* class src/styles/static.css styles (the CSS-only static
 * primitives, `@hirobius/design-system/static.css`, whose whole point is that
 * consumers write the class names), and the classes theme.css ships for
 * consumers to put on their own elements, listed by hand in
 * DECLARED_PUBLIC_CLASSES (`hds-focus`: ops uses it on its own controls).
 *
 * scripts/generate-manifest.mjs writes the list to public/hds-manifest.json
 * as `publicClasses`; scripts/build-css-contract.mjs copies it into
 * dist/css-contract.json, and scripts/upgrade/diff.mjs reports a removed one
 * (like any hds-* class) as class-removed, which needs a breaking step.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cssBundleContract } from './css-contract.mjs';

/** Classes in src/styles/theme.css that consumers apply themselves. */
export const DECLARED_PUBLIC_CLASSES = ['hds-focus'];

/**
 * The public classes of the tree at `root`, sorted.
 * @param {string} root
 * @returns {string[]}
 */
export function publicClasses(root) {
  const file = join(root, 'src/styles/static.css');
  // Its hds-* classes: `.dark` appears there only as the theme hook it scopes under.
  const fromStatic = existsSync(file)
    ? cssBundleContract(readFileSync(file, 'utf8')).classes.filter((c) => c.startsWith('hds-'))
    : [];
  return [...new Set([...DECLARED_PUBLIC_CLASSES, ...fromStatic])].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
}
