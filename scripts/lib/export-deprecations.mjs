/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The exported declarations a JSDoc `@deprecated` block sits on (hds#469), so
 * consumers see a deprecation as a lint warning, not only editor strikethrough.
 * Read by scripts/build-deprecations.mjs, which writes
 * scripts/eslint-plugin-hds/rules/deprecated-exports.json for
 * hds/no-deprecated-import.
 *
 * Pure: no fs, no process.
 */
import { parseDeprecation } from './jsdoc-contract.mjs';

const JSDOC_RE = /\/\*\*[\s\S]*?\*\//g;
const DECL_RE =
  /^\s*export\s+(?:declare\s+)?(?:default\s+)?(?:async\s+)?(const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/;

/**
 * @param {string} content source text
 * @param {string} file path recorded on each entry
 * @returns {{ name: string, file: string, note: string, removeIn: string|null, useInstead: string|null, typeOnly?: true }[]}
 */
export function collectExportDeprecations(content, file) {
  const out = [];
  for (const m of content.matchAll(JSDOC_RE)) {
    const deprecation = parseDeprecation(m[0]);
    if (!deprecation) continue;
    const decl = DECL_RE.exec(content.slice(m.index + m[0].length));
    if (!decl) continue;
    const entry = {
      name: decl[2],
      file,
      note: deprecation.deprecated,
      removeIn: deprecation.removeIn ?? null,
      useInstead: deprecation.useInstead ?? null,
    };
    if (decl[1] === 'interface' || decl[1] === 'type') entry.typeOnly = true;
    out.push(entry);
  }
  return out;
}
