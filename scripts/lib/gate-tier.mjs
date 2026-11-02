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

export const FULL_GATE_FILE_LIMIT = 25;

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
];

const CODE_EXT = /\.(js|mjs|cjs|ts|tsx|jsx)$/;
const LINT_DIRS = /^(src|scripts|validators|tests|mcp)\//;

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
