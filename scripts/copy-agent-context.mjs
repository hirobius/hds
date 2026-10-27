#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * copy-agent-context — put DESIGN.md, CONSUMING.md, component-api.json and the
 * agent files from public/ (llms, the manifest) at the docs site's root. Runs
 * as part of `pnpm docs:publish` (after `pnpm docs:build`). Fails naming the
 * file when a source is missing.
 *
 * The site builds from main, so its copy is restamped (hds#463): every
 * `Version: <release>` line and `packageVersion` says `<last release>+main
 * <short sha>` (scripts/lib/version-stamp.mjs), never a bare version that would
 * label unreleased work as the release.
 *
 *   node scripts/copy-agent-context.mjs --out docs-site/out
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hostedStamp, readPackageVersion, restamp } from './lib/version-stamp.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const COPIES = [
  ['DESIGN.md', 'DESIGN.md'],
  ['CONSUMING.md', 'CONSUMING.md'],
  ['docs/CONSUMING.md', 'docs/CONSUMING.md'],
  ['src/app/data/component-api.json', 'component-api.json'],
];

/** Agent files in public/; a trailing slash marks a directory. */
export const PUBLIC_COPIES = [
  'llms.txt',
  'llms-full.txt',
  'llms/',
  'hds-manifest.json',
  'hds-manifest-agent.json',
  'component-changelogs.json',
];

/** Every file under `p` (or `p` itself). */
const filesUnder = (p) =>
  statSync(p).isDirectory() ? readdirSync(p).flatMap((f) => filesUnder(path.join(p, f))) : [p];

/** The site's stamp: VERCEL_GIT_COMMIT_SHA, else git HEAD. */
export function hostedStampFor(root) {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
  if (!sha) throw new Error('copy-agent-context: no commit sha (VERCEL_GIT_COMMIT_SHA or git)');
  const version = readPackageVersion(root);
  return { version, hosted: hostedStamp(version, sha) };
}

/**
 * @param {{ stamp?: { version: string, hosted: string } }} [opts] rewrite the
 *   `version` stamps of the copied public files to `hosted`.
 */
export function copyAgentContext(root, outDir, { stamp } = {}) {
  for (const src of [...COPIES.map(([s]) => s), ...PUBLIC_COPIES.map((name) => `public/${name}`)]) {
    if (!existsSync(path.join(root, src))) {
      throw new Error(`copy-agent-context: source file missing: ${src}`);
    }
  }
  for (const name of PUBLIC_COPIES) {
    const dest = path.resolve(root, outDir, name);
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(path.join(root, 'public', name), dest, { recursive: true });
    if (!stamp) continue;
    for (const file of filesUnder(dest)) {
      const text = readFileSync(file, 'utf8');
      const next = restamp(text, stamp.version, stamp.hosted);
      if (next !== text) writeFileSync(file, next);
    }
  }
  for (const [src, dest] of COPIES) {
    mkdirSync(path.dirname(path.resolve(root, outDir, dest)), { recursive: true });
    copyFileSync(path.join(root, src), path.resolve(root, outDir, dest));
  }
  return [...COPIES.map(([, d]) => d), ...PUBLIC_COPIES];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const at = args.indexOf('--out');
    if (at < 0 || !args[at + 1]) throw new Error('copy-agent-context: pass --out <dir>');
    const outDir = args[at + 1];
    const stamp = hostedStampFor(ROOT);
    const out = copyAgentContext(ROOT, outDir, { stamp });
    console.log(`✓ copy-agent-context — ${out.join(', ')} -> ${outDir}/ (${stamp.hosted})`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}
