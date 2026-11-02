/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * gate-tier.mjs — picks how much of the pre-push gate a diff needs (ops#1057).
 *
 *   docs  only docs/images changed: no test suite.
 *   fast  small, low-risk diff: eslint on changed files + typecheck + `vitest related`.
 *   full  check:fast + the whole suite + smoke:consumer. Fires on any FULL_GATE_PATTERNS
 *         match, more than FULL_GATE_FILE_LIMIT files, HDS_FULL_GATE=1, or an unknown diff.
 *
 * @module gate-tier
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FULL_GATE_FILE_LIMIT = 25;

/**
 * Published paths from package.json "files" (dist excluded: it is build output, not a source).
 * An entry ending in "/" covers its subtree; any other entry also covers a directory of that name.
 */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function publishedPatterns(files = []) {
  return files
    .filter((f) => f.replace(/\/$/, '') !== 'dist')
    .map((f) =>
      f.endsWith('/') ? new RegExp(`^${escapeRe(f)}`) : new RegExp(`^${escapeRe(f)}(\\/|$)`),
    );
}
const PKG_FILES = JSON.parse(
  readFileSync(
    join(import.meta.dirname ?? dirname(fileURLToPath(import.meta.url)), '../../package.json'),
    'utf8',
  ),
).files;

const DOCS_PATTERNS = [/\.mdx?$/i, /^docs\//, /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i];

/** Paths whose change can break anything: deps, build/test config, tokens/theme, gate scripts. */
export const FULL_GATE_PATTERNS = [
  /^package\.json$/,
  /^pnpm-(lock|workspace)\.yaml$/,
  /^(vite|vitest|playwright|postcss|tailwind)\.config\.[^/]+$/,
  /^vite\.config\.lib\.ts$/,
  /^tailwind\.config\.tokens\.cjs$/,
  /^tsconfig[^/]*\.json$/,
  /^eslint\.config\.[^/]+$/,
  /^api-extractor\.json$/,
  /^hirobius\.tokens\.json$/,
  /^tokens\.lock\.json$/,
  /^src\/(styles|tokens|theme)\//,
  /^scripts\/(?!__tests__\/).+/,
  /^\.husky\//,
  // Published code and token sources outside src/ (bins, codemods, upgrade data, accents/tenants).
  /^(bin|codemods|upgrade|accents|tenants)\//,
  // Shipped Markdown with drift checks (DESIGN.md is generated from DESIGN.source.md).
  /^(DESIGN(\.source)?|CONSUMING|UPGRADING|MIGRATIONS)\.md$/,
  /^docs\/CONSUMING\.md$/,
  // Remaining tool config.
  /^knip\.config\.[^/]+$/,
  /^\.size-limit\.c?js$/,
  /^\.(npmrc|nvmrc)$/,
  /^docs-site\/package\.json$/,
  // Everything the package ships (package.json files): baselines, component-api, manifests, llms*, mcp/.
  ...publishedPatterns(PKG_FILES),
];

const CODE_EXT = /\.(js|mjs|cjs|ts|tsx|jsx)$/;
const LINT_DIRS = /^(src|scripts|validators|tests|mcp|docs-site)\//;

const isDocs = (f) => DOCS_PATTERNS.some((re) => re.test(f));

/**
 * @param {string[] | null} files changed paths, or null when the diff is unknown
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ tier: 'docs' | 'fast' | 'full', reason: string }}
 */
export function classifyGateTier(files, env = {}) {
  if (env.HDS_FULL_GATE === '1') return { tier: 'full', reason: 'HDS_FULL_GATE=1' };
  if (files == null) return { tier: 'full', reason: 'diff unknown (no merge-base)' };
  const risky = files.find((f) => FULL_GATE_PATTERNS.some((re) => re.test(f)));
  if (risky) return { tier: 'full', reason: `risky path: ${risky}` };
  if (files.length > FULL_GATE_FILE_LIMIT)
    return { tier: 'full', reason: `${files.length} files > ${FULL_GATE_FILE_LIMIT}` };
  if (files.every(isDocs)) return { tier: 'docs', reason: `${files.length} docs/image file(s)` };
  return { tier: 'fast', reason: `${files.length} file(s), none risky` };
}

/** Commands for a tier, in run order. */
export function planGate(tier, files) {
  if (tier === 'full') return ['pnpm check:fast', 'pnpm test', 'pnpm smoke:consumer'];
  if (tier === 'docs') return [];
  const code = files.filter((f) => CODE_EXT.test(f) && LINT_DIRS.test(f));
  const cmds = [];
  if (code.length) cmds.push(`pnpm exec eslint --max-warnings=0 ${code.join(' ')}`);
  cmds.push('pnpm typecheck');
  if (code.length) cmds.push(`pnpm exec vitest related --run --passWithNoTests ${code.join(' ')}`);
  return cmds;
}

/** The hook line that hands off to the tiered gate. */
export const TIERED_GATE_SCRIPT = 'scripts/pre-push-gate.mjs';

/**
 * The commands a pre-push hook can run, with the tiered gate expanded to its full tier.
 * Wiring checks read this instead of the raw hook: `node scripts/pre-push-gate.mjs` runs
 * `pnpm test` (and every gate reachable from it) whenever a diff needs the full tier,
 * so a gate wired through `pnpm test` stays counted as wired. Nothing is added when the
 * hook does not call the tiered gate.
 * @param {string} hookContent raw .husky/pre-push text
 * @returns {string}
 */
export function expandPrePushHook(hookContent) {
  if (!hookContent.includes(TIERED_GATE_SCRIPT)) return hookContent;
  return `${hookContent}\n# ${TIERED_GATE_SCRIPT} full tier:\n${planGate('full', []).join('\n')}\n`;
}
