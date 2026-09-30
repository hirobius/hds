#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-pack-contents — does the npm tarball carry what consumers' agents need?
 *
 * Runs `npm pack --dry-run --json` and compares the file list against a
 * required set (agent context, manifest, tokens, entry point) and a forbidden
 * set (env files, repo `src/`, built Storybook). Forbidden entries match as a
 * path prefix at the tarball root, not as a substring: `dist/types/src/` is
 * correct and must not be flagged.
 *
 * Usage: node scripts/check-pack-contents.mjs [--require <path>]...
 * Requires `dist/` (run `pnpm build:lib` first; smoke:consumer does).
 * Exit codes: 0 = tarball contents as expected, 1 = missing or forbidden paths.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED = [
  'llms.txt',
  'public/llms.txt',
  'public/llms-full.txt',
  'public/llms/layout.txt',
  'public/llms/tokens.txt',
  'public/llms/scroll.txt',
  'public/llms/components.txt',
  'DESIGN.md',
  'CONSUMING.md',
  'docs/CONSUMING.md',
  'src/app/data/component-api.json',
  'public/hds-manifest.json',
  'hirobius.tokens.json',
  'dist/hirobius-ui.js',
];

/** Prefix rules; a path is forbidden when it matches and is not in `allow`. */
export const FORBIDDEN = [
  { prefix: '.env' },
  { prefix: 'src/', allow: ['src/app/data/component-api.json'] },
  { prefix: 'storybook-static/' },
];

/**
 * @param {string[]} packedPaths
 * @param {{required: string[], forbidden: {prefix: string, allow?: string[]}[]}} rules
 */
export function diffPackContents(packedPaths, { required, forbidden }) {
  const have = new Set(packedPaths);
  const missing = required.filter((p) => !have.has(p));
  const bad = packedPaths.filter((p) =>
    forbidden.some((f) => p.startsWith(f.prefix) && !(f.allow ?? []).includes(p)),
  );
  return { missing, forbidden: bad };
}

/** File list of the tarball `npm pack` would produce from `cwd`. */
export function packedPaths(cwd) {
  const res = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status !== 0) {
    throw new Error(`npm pack --dry-run failed (exit ${res.status}): ${res.stderr}`);
  }
  // Lifecycle scripts (prepare) may print before the JSON; take from the array start.
  const start = res.stdout.search(/^\[\s*$/m);
  const json = JSON.parse(res.stdout.slice(start < 0 ? 0 : start));
  return json[0].files.map((f) => f.path);
}

function main() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2);
  const extra = [];
  for (let i = 0; i < args.length; i++) if (args[i] === '--require') extra.push(args[++i]);

  let paths;
  try {
    paths = packedPaths(root);
  } catch (err) {
    console.error(`✗ check-pack-contents — ${err.message}`);
    process.exit(1);
  }
  const { missing, forbidden } = diffPackContents(paths, {
    required: [...REQUIRED, ...extra],
    forbidden: FORBIDDEN,
  });
  if (missing.length || forbidden.length) {
    console.error('✗ check-pack-contents — tarball contents are wrong');
    for (const p of missing) console.error(`  missing:   ${p}`);
    for (const p of forbidden) console.error(`  forbidden: ${p}`);
    console.error('  fix: package.json "files" (run pnpm build:lib first if dist/ is the gap)');
    process.exit(1);
  }
  console.log(
    `✓ check-pack-contents — ${paths.length} files, all ${REQUIRED.length} required present`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
