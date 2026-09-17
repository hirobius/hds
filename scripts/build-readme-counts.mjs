#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * build-readme-counts.mjs
 *
 * Regenerates the count bullets at the top of README.md from source, between
 * <!-- auto:start:front-door-counts --> and <!-- auto:end:front-door-counts -->:
 *   - public component modules: `export * from './app/components/…'` lines in src/index.ts
 *   - DTCG tokens: leaf nodes carrying `$value` in hirobius.tokens.json
 *   - Storybook stories: named `export const <Capitalized>` lines in src/**\/*.stories.tsx
 *
 * `pnpm tokens` runs it, so token PRs refresh the README with the handoff docs.
 * scripts/__tests__/front-door.test.mjs checks the README one way (claim <= source):
 * a PR that adds tokens or stories never fails on a README written before it,
 * and a README that claims more than the source has always fails.
 *
 * Run: pnpm readme:counts
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const COUNTS_BLOCK = 'front-door-counts';

/** Claim phrases as the README states them, keyed by count. */
const PHRASES = {
  components: 'public component modules',
  tokens: 'DTCG tokens',
  stories: 'Storybook stories',
  storyFiles: 'story files',
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

/** Named CSF story exports in one story file. */
export function countStoryExports(storySource) {
  return storySource.split('\n').filter((line) => /^export const [A-Z]/.test(line)).length;
}

/** Reads the repo at `root` and returns every count the README states. */
export function collectCounts(root) {
  const storyFiles = readdirSync(join(root, 'src'), { recursive: true })
    .map(String)
    .filter((p) => p.endsWith('.stories.tsx'));
  return {
    components: countBarrelComponentModules(readFileSync(join(root, 'src', 'index.ts'), 'utf8')),
    tokens: countTokens(JSON.parse(readFileSync(join(root, 'hirobius.tokens.json'), 'utf8'))),
    stories: storyFiles.reduce(
      (sum, rel) => sum + countStoryExports(readFileSync(join(root, 'src', rel), 'utf8')),
      0,
    ),
    storyFiles: storyFiles.length,
  };
}

// ── README block ──────────────────────────────────────────────────────────────
/** The markdown bullets that go inside the generated block. */
export function buildCountsSection({ components, tokens, stories, storyFiles }) {
  return [
    `- **${components}** ${PHRASES.components}, exported from \`src/index.ts\``,
    `- **${tokens}** ${PHRASES.tokens} in \`hirobius.tokens.json\`, compiled to CSS variables and TypeScript constants`,
    `- **${stories}** ${PHRASES.stories} in **${storyFiles}** ${PHRASES.storyFiles}, reviewed visually in Chromatic`,
  ].join('\n');
}

/**
 * Replaces the generated block in `readme`. Blank lines around the bullets keep
 * the output Prettier-stable (without them the end marker joins the list).
 * Throws when the markers are missing, so the README cannot silently stop updating.
 */
export function replaceCountsBlock(readme, section) {
  const start = `<!-- auto:start:${COUNTS_BLOCK} -->`;
  const end = `<!-- auto:end:${COUNTS_BLOCK} -->`;
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
  const after = replaceCountsBlock(before, buildCountsSection(collectCounts(ROOT)));
  if (after === before) {
    console.log('✓ README.md counts already match the source.');
  } else {
    writeFileSync(readmePath, after);
    console.log('✓ README.md counts regenerated from source.');
  }
}
