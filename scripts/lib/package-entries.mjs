/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * package-entries.mjs — the JavaScript entry points of package.json#exports,
 * each mapped back to its source file. Shared by check-public-api (the API
 * surface guard) and check-deprecations (the deprecation-lifecycle gate), so
 * both read the published entries from package.json instead of keeping a list.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Each JS entry of package.json#exports, mapped from its `types` path
 * (`./dist/types/<path>.d.ts`, emitted by build:types from source) back to
 * the source file. Stylesheets and `./package.json` are strings, not
 * condition objects, and are skipped.
 *
 * @param {string} root package root
 * @returns {Array<{ key: string, file: string }>}
 */
export function readJsExportEntries(root) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const entries = [];
  for (const [key, value] of Object.entries(pkg.exports ?? {})) {
    if (!value || typeof value !== 'object') continue;
    const types = value.types;
    if (typeof types !== 'string' || !/^\.\/dist\/types\/.+\.d\.ts$/.test(types)) {
      throw new Error(
        `package.json#exports["${key}"].types must be ./dist/types/<source path>.d.ts, got ${JSON.stringify(types)}`,
      );
    }
    const stem = types.replace(/^\.\/dist\/types\//, '').replace(/\.d\.ts$/, '');
    const file = ['.ts', '.tsx'].map((ext) => join(root, stem + ext)).find((f) => existsSync(f));
    if (!file) {
      throw new Error(`package.json#exports["${key}"]: no source file ${stem}.ts or ${stem}.tsx`);
    }
    entries.push({ key, file });
  }
  return entries;
}
