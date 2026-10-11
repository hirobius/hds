#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * copy-agent-context — put DESIGN.md, CONSUMING.md, component-api.json and the
 * agent files from public/ (llms, the manifest) at the docs site's root. Runs
 * as part of `pnpm docs:publish` (after `pnpm docs:build`). Fails naming the
 * file when a source is missing.
 *
 *   node scripts/copy-agent-context.mjs --out docs-site/out
 */
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export function copyAgentContext(root, outDir) {
  for (const src of [...COPIES.map(([s]) => s), ...PUBLIC_COPIES.map((name) => `public/${name}`)]) {
    if (!existsSync(path.join(root, src))) {
      throw new Error(`copy-agent-context: source file missing: ${src}`);
    }
  }
  for (const name of PUBLIC_COPIES) {
    const dest = path.join(root, outDir, name);
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(path.join(root, 'public', name), dest, { recursive: true });
  }
  for (const [src, dest] of COPIES) {
    mkdirSync(path.dirname(path.join(root, outDir, dest)), { recursive: true });
    copyFileSync(path.join(root, src), path.join(root, outDir, dest));
  }
  return [...COPIES.map(([, d]) => d), ...PUBLIC_COPIES];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const at = args.indexOf('--out');
    if (at < 0 || !args[at + 1]) throw new Error('copy-agent-context: pass --out <dir>');
    const outDir = args[at + 1];
    const out = copyAgentContext(ROOT, outDir);
    console.log(`✓ copy-agent-context — ${out.join(', ')} -> ${outDir}/`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}
