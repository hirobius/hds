import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import type { LedgerIndex, LedgerRelease } from './upgrade-ledger';
import type { A11ySpec } from './a11y-contracts';

/** Walk up from the working directory so this works whether Next runs from docs-site/ or the repo root. */
export function findUp(relative: string, start = process.cwd()): string {
  for (let dir = start; ; dir = dirname(dir)) {
    const file = join(dir, relative);
    if (existsSync(file)) return file;
    if (dirname(dir) === dir) throw new Error(`${relative} not found above ${start}`);
  }
}

/**
 * The released package's version, from the repo root package.json (the one beside
 * hirobius.tokens.json); findUp('package.json') alone would stop at docs-site's own.
 */
export function loadPackageVersion(): string {
  const root = dirname(findUp('hirobius.tokens.json'));
  return (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string })
    .version;
}

const cache = new Map<string, unknown>();
function readJson(relative: string): unknown {
  if (!cache.has(relative)) cache.set(relative, JSON.parse(readFileSync(findUp(relative), 'utf8')));
  return cache.get(relative);
}

export const loadTokens = () => readJson('hirobius.tokens.json');
/** public/hds-stats.json (scripts/build-stats-json.mjs): repo counts, checked fresh by pretest. */
export const loadStats = () =>
  readJson('public/hds-stats.json') as { contrast: { textPairs: number; nonTextPairs: number } };
/** Opt-in accent themes (`accents/<name>/tokens.json`), keyed by name. */
export const loadAccentThemes = (): Record<string, unknown> =>
  Object.fromEntries(
    readdirSync(findUp('accents'), { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
      .map((d) => [d.name, readJson(`accents/${d.name}/tokens.json`)]),
  );

interface ManifestSpec extends A11ySpec {
  category?: string;
  tokenMapping?: Record<string, string>;
}
export const loadManifestSpecs = () =>
  (readJson('public/hds-manifest.json') as { componentSpecs: Record<string, ManifestSpec> })
    .componentSpecs;

/**
 * The commit the docs build from (hds#464): the host's git env var when the
 * build runs there, else the local checkout's HEAD. Null when neither is
 * available (a source tarball), so the header can leave the sha off.
 */
export function loadBuildSha(): string | null {
  const fromEnv = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: dirname(findUp('upgrade/index.json')),
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
}

/** The upgrade ledger (upgrade/index.json + upgrade/releases/*.json), for the upgrade and deprecation guides. */
export const loadUpgradeIndex = () => readJson('upgrade/index.json') as LedgerIndex;
export function loadUpgradeReleases(): LedgerRelease[] {
  const dir = dirname(findUp('upgrade/index.json'));
  return readdirSync(join(dir, 'releases'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson(`upgrade/releases/${f}`) as LedgerRelease);
}
