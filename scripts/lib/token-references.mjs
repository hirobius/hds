/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * token-references — which design tokens a component source actually names.
 *
 * HDS names a token THREE ways, and component-api.json's `observedTokens`
 * only ever detected the first:
 *
 *   1. hds.typeStyles.ui                  the JS token object
 *   2. text-[color:var(--semantic-…)]     a Tailwind arbitrary value
 *   3. bg-primary                         a named utility, mapped in
 *                                         tailwind.config.tokens.cjs to a var()
 *
 * The consequence was not a small undercount. 78 of 128 components recorded
 * ZERO tokens while plainly being tokenized, and Button — the most-used
 * component in the system — recorded nothing at all but a mention inside a
 * comment, because it colours itself entirely with named utilities.
 *
 * This module is the single definition of that rule, shared by the
 * component-api generator and the reference site, so the two cannot drift.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** A token named in a comment is documentation, not a binding. */
export const COMMENT_LINE = /^\s*(\/\/|\*|\/\*)/;

/** Tailwind utilities that can carry a colour token. */
export const UTILITY_PREFIX =
  /\b(?:bg|text|border|ring|fill|stroke|divide|outline|decoration|shadow|from|via|to|accent|caret|placeholder)-([a-z][\w-]*)/g;

/** `--semantic-color-content-primary` -> `semantic.color.content.primary` */
export const varToTokenPath = (cssVar) => cssVar.replace(/^--/, '').replace(/-/g, '.');

/**
 * Flatten a Tailwind colour map into `utility name -> css var`.
 * `{ card: { DEFAULT: 'var(--role-card)', foreground: 'var(--x)' } }`
 * becomes `card -> --role-card` and `card-foreground -> --x`.
 */
export function flattenColorMap(colors, trail = [], map = new Map()) {
  for (const [key, value] of Object.entries(colors ?? {})) {
    const next = key === 'DEFAULT' ? trail : [...trail, key];
    if (typeof value === 'string') {
      const m = /var\(\s*(--[\w-]+)\s*\)/.exec(value);
      if (m && next.length) map.set(next.join('-'), m[1]);
    } else if (value && typeof value === 'object') {
      flattenColorMap(value, next, map);
    }
  }
  return map;
}

/** Every `var(--token)` written directly in the source. */
export function varReferences(source) {
  const out = [];
  String(source)
    .split('\n')
    .forEach((line, i) => {
      if (COMMENT_LINE.test(line)) return;
      for (const m of line.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
        out.push({
          raw: `var(${m[1]})`,
          tokenPath: varToTokenPath(m[1]),
          sourceLine: i + 1,
          sourceSnippet: line.trim().slice(0, 120),
        });
      }
    });
  return out;
}

/** Named utilities whose colour the Tailwind config maps to a var(). */
export function utilityReferences(source, utilityMap) {
  if (!utilityMap || utilityMap.size === 0) return [];
  const out = [];
  String(source)
    .split('\n')
    .forEach((line, i) => {
      if (COMMENT_LINE.test(line)) return;
      for (const m of line.matchAll(UTILITY_PREFIX)) {
        const cssVar = utilityMap.get(m[1]);
        if (!cssVar) continue;
        out.push({
          raw: m[0],
          tokenPath: varToTokenPath(cssVar),
          sourceLine: i + 1,
          sourceSnippet: line.trim().slice(0, 120),
        });
      }
    });
  return out;
}

/**
 * Merge references from every detector, dedupe by resolved token path, and
 * drop anything that only appeared in a comment. Sorted so the output is
 * stable across runs — an unstable generated artifact produces phantom drift.
 */
export function mergeReferences(groups) {
  const seen = new Set();
  const tokens = [];
  for (const t of groups.flat()) {
    const key = t.tokenPath ?? t.raw;
    if (!key || seen.has(key)) continue;
    if (COMMENT_LINE.test(t.sourceSnippet ?? '')) continue;
    seen.add(key);
    tokens.push(t);
  }
  return tokens.sort((a, b) =>
    String(a.tokenPath ?? a.raw).localeCompare(String(b.tokenPath ?? b.raw)),
  );
}

/**
 * Read and flatten the repo's Tailwind colour maps into the utility lookup.
 * `requireFn` is passed in because this module is ESM and the tokens config
 * is CommonJS.
 */
export function buildUtilityMap(root, requireFn) {
  const map = new Map();
  try {
    const tokens = requireFn(path.join(root, 'tailwind.config.tokens.cjs'));
    flattenColorMap(tokens?.theme?.extend?.colors, [], map);
  } catch {
    /* absent — the other detectors still run */
  }
  // The feedback family is declared in tailwind.config.ts, which cannot be
  // require()d from here, so it is read as text.
  const tsConfig = path.join(root, 'tailwind.config.ts');
  if (existsSync(tsConfig)) {
    let group = null;
    for (const line of readFileSync(tsConfig, 'utf8').split('\n')) {
      const g = /^\s*'?([\w-]+)'?:\s*\{\s*$/.exec(line);
      if (g) {
        group = g[1];
        continue;
      }
      const e = /^\s*'?([\w-]+)'?:\s*'var\(\s*(--[\w-]+)\s*\)'/.exec(line);
      if (e && group && group !== 'colors') map.set(`${group}-${e[1]}`, e[2]);
    }
  }
  return map;
}
