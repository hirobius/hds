#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * build-readme-counts.mjs
 *
 * Regenerates the count bullets at the top of README.md from source, between
 * <!-- auto:start:front-door-counts --> and <!-- auto:end:front-door-counts -->:
 *   - public component modules: `export * from './app/components/…'` lines in src/index.ts
 *   - DTCG tokens: leaf nodes carrying `$value` in hirobius.tokens.json
 *
 * It also regenerates the "What belongs in the system" block between
 * <!-- auto:start:core-set --> and <!-- auto:end:core-set --> (hds#374): the
 * core components by category and the /patterns modules, rendered by
 * scripts/lib/core-set.mjs from the manifest (`core` flag, deprecations) and
 * src/patterns.ts. scripts/__tests__/core-set.test.mjs compares it byte for byte.
 *
 * `pnpm tokens` runs it, so token PRs refresh the README with the handoff docs.
 * scripts/__tests__/front-door.test.mjs checks the README one way (claim <= source):
 * a PR that adds tokens never fails on a README written before it,
 * and a README that claims more than the source has always fails.
 *
 * Run: pnpm readme:counts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_SET_BLOCK, collectCoreSet, renderCoreSetBlock } from './lib/core-set.mjs';
import { readTokenSource } from './lib/token-source.mjs';

export const COUNTS_BLOCK = 'front-door-counts';

/** Claim phrases as the README states them, keyed by count. */
const PHRASES = {
  components: 'public component modules',
  tokens: 'DTCG tokens',
};

// ── Counting rules ────────────────────────────────────────────────────────────
/** Component modules re-exported by the public barrel (not the .tsx file count). */
export function countBarrelComponentModules(indexSource) {
  return indexSource
    .split('\n')
    .filter((line) => /^export \* from '\.\/app\/components\//.test(line)).length;
}

/** DTCG leaf tokens: objects carrying `$value`; `$`-prefixed keys are metadata. */
export function countTokens(tokenTree) {
  let count = 0;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if ('$value' in node) {
      count++;
      return;
    }
    for (const [key, child] of Object.entries(node)) if (!key.startsWith('$')) walk(child);
  };
  walk(tokenTree);
  return count;
}

/** Reads the repo at `root` and returns every count the README states. */
export function collectCounts(root) {
  return {
    components: countBarrelComponentModules(readFileSync(join(root, 'src', 'index.ts'), 'utf8')),
    tokens: countTokens(readTokenSource(join(root, 'hirobius.tokens.json'))),
  };
}

// ── README block ──────────────────────────────────────────────────────────────
/** The markdown bullets that go inside the generated block. */
export function buildCountsSection({ components, tokens }) {
  return [
    `- **${components}** ${PHRASES.components}, exported from \`src/index.ts\``,
    `- **${tokens}** ${PHRASES.tokens} in \`hirobius.tokens.json\`, compiled to CSS variables and TypeScript constants`,
  ].join('\n');
}

/**
 * Replaces the generated block in `readme`. Blank lines around the bullets keep
 * the output Prettier-stable (without them the end marker joins the list).
 * Throws when the markers are missing, so the README cannot silently stop updating.
 */
export function replaceCountsBlock(readme, section) {
  return replaceAutoBlock(readme, COUNTS_BLOCK, section);
}

/** Replaces the `<!-- auto:start:<block> -->` … `<!-- auto:end:<block> -->` body; throws without markers. */
export function replaceAutoBlock(readme, block, section) {
  const start = `<!-- auto:start:${block} -->`;
  const end = `<!-- auto:end:${block} -->`;
  const from = readme.indexOf(start);
  const to = readme.indexOf(end);
  if (from === -1 || to === -1 || to < from) {
    throw new Error(`README.md is missing the ${start} … ${end} markers.`);
  }
  return `${readme.slice(0, from)}${start}\n\n${section.trim()}\n\n${readme.slice(to)}`;
}

// ── Overclaim check ───────────────────────────────────────────────────────────
/** The number the README states before each claim phrase, or null when absent. */
export function readClaims(readme) {
  const text = readme.replace(/\*\*|__/g, '');
  return Object.fromEntries(
    Object.entries(PHRASES).map(([key, phrase]) => {
      const match = text.match(new RegExp(`(\\d[\\d,]*)\\s+${phrase}`));
      return [key, match ? Number(match[1].replace(/,/g, '')) : null];
    }),
  );
}

/**
 * Claims that are missing, zero, or larger than the source count. A claim below
 * the source is fine: it is still true, and `pnpm tokens` refreshes it.
 */
export function findOverclaims(claims, counts) {
  return Object.keys(PHRASES)
    .filter((key) => !claims[key] || claims[key] > counts[key])
    .map((key) => ({ key, claimed: claims[key], actual: counts[key] }));
}

// ── CLI ───────────────────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
  const readmePath = join(ROOT, 'README.md');
  const before = readFileSync(readmePath, 'utf8');
  const after = replaceAutoBlock(
    replaceCountsBlock(before, buildCountsSection(collectCounts(ROOT))),
    CORE_SET_BLOCK,
    renderCoreSetBlock(collectCoreSet(ROOT)),
  );
  if (after === before) {
    console.log('✓ README.md counts and core set already match the source.');
  } else {
    writeFileSync(readmePath, after);
    console.log('✓ README.md counts and core set regenerated from source.');
  }
}
