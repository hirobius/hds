/** @internal — pure helpers for the design-explorations spec set (hds#628). */
/**
 * The lint plugin half of the explorations lint gate. hds#628 says A and B must
 * pass "the lint plugin": the ESLint plugin consumers install
 * (`@hirobius/design-system/eslint-plugin`, source in scripts/eslint-plugin-hds/).
 * The harness's own violation scan (scripts/lib/consistency/violations.mjs) misses
 * some of what the plugin fails, such as a raw `<form>` or a bare number on a
 * spacing prop in `style`, so the gate runs both and treats one violation seen
 * by both as one hit.
 *
 * Runs the plugin's `recommended` config with ESLint's synchronous Linter and the
 * TypeScript parser, over source text in memory. Only the config's error rules
 * gate (PLUGIN_KINDS); its warnings do not, as `eslint --max-warnings` is not part
 * of "passing" the recommended config. Inline `eslint-disable` comments are
 * ignored, so a direction cannot switch the gate off. A file the parser cannot
 * read is a `parse-error` hit: the gate fails closed rather than reading it as clean.
 *
 * Pure: takes { relativePath: sourceText } and returns hit objects shaped like
 * scanApp's: { kind, file, line, match }, `kind` being the rule id.
 */
import { createRequire } from 'node:module';
import hds from '../../eslint-plugin-hds/index.mjs';
import { PLUGIN_KINDS } from './direction.mjs';

const CODE_EXT = /\.(?:[cm]?[jt]sx?)$/i;

/**
 * ESLint and the TypeScript parser take ~0.5 s to load, and eval-consistency.mjs
 * imports this module for every mode (--help and the plain consistency run too),
 * so both are required on the first lint, not at import. Both ship CommonJS, so a
 * synchronous require keeps lintWithPlugin (and judgeStatic) synchronous.
 */
let loaded = null;
function load() {
  if (loaded) return loaded;
  const require = createRequire(import.meta.url);
  const { Linter } = require('eslint');
  const tsParser = require('@typescript-eslint/parser');
  loaded = {
    linter: new Linter({ configType: 'flat' }),
    config: [
      {
        files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
        languageOptions: {
          parser: tsParser,
          ecmaVersion: 'latest',
          sourceType: 'module',
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
      },
      ...hds.configs.recommended,
    ],
  };
  return loaded;
}

/** The source text a message points at: its range on one line, else the rest of its first line. */
function textAt(lines, m) {
  const line = lines[m.line - 1] ?? '';
  if (m.endLine === m.line && m.endColumn > m.column) {
    return line.slice(m.column - 1, m.endColumn - 1);
  }
  return line.slice(Math.max(0, m.column - 1)).trim() || line.trim();
}

/**
 * @param {Record<string,string>} files relative path -> source text for one direction
 * @returns {{kind:string,file:string,line:number,match:string}[]}
 */
export function lintWithPlugin(files) {
  const hits = [];
  let lint = null;
  for (const file of Object.keys(files).sort()) {
    if (!CODE_EXT.test(file)) continue;
    const src = files[file];
    const lines = src.split('\n');
    lint ??= load();
    const messages = lint.linter.verify(src, lint.config, {
      filename: file,
      allowInlineConfig: false,
    });
    for (const m of messages) {
      if (m.fatal || !m.ruleId) {
        hits.push({ kind: 'parse-error', file, line: m.line ?? 1, match: m.message });
        continue;
      }
      if (m.severity !== 2 || !PLUGIN_KINDS.includes(m.ruleId)) continue;
      hits.push({ kind: m.ruleId, file, line: m.line, match: textAt(lines, m) });
    }
  }
  return hits;
}

const sameViolation = (scan, plugin) =>
  scan.file === plugin.file &&
  scan.line === plugin.line &&
  (scan.match.includes(plugin.match) || plugin.match.includes(scan.match));

/**
 * One list of violations from the scan and the plugin. A plugin hit on the same
 * file and line as a scan hit, where one's text contains the other's (the
 * plugin's `'#7c3aed'` and the scan's `#7c3aed`; its `button` and the scan's
 * `<button`), is the same violation and is folded into the scan hit, so a C bend
 * names it once. Everything else is kept, in file and line order.
 */
export function mergeLintHits(scanHits, pluginHits) {
  const extra = pluginHits.filter(
    (p) => p.kind === 'parse-error' || !scanHits.some((s) => sameViolation(s, p)),
  );
  const all = [...scanHits.map((h, i) => ({ h, i })), ...extra.map((h, i) => ({ h, i: 1e6 + i }))];
  all.sort((a, b) => a.h.file.localeCompare(b.h.file) || a.h.line - b.h.line || a.i - b.i);
  return all.map(({ h }) => h);
}
