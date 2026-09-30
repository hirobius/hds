#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * copy-agent-context — put DESIGN.md, CONSUMING.md and component-api.json at the
 * Storybook host root, next to the llms files that .storybook/main.ts already
 * serves from public/. Runs after `pnpm build-storybook` (see vercel.json).
 * Fails naming the file when a source is missing.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const COPIES = [
  ['DESIGN.md', 'DESIGN.md'],
  ['CONSUMING.md', 'CONSUMING.md'],
  ['src/app/data/component-api.json', 'component-api.json'],
];

export function copyAgentContext(root = ROOT, outDir = 'storybook-static') {
  for (const [src] of COPIES) {
    if (!existsSync(path.join(root, src))) {
      throw new Error(`copy-agent-context: source file missing: ${src}`);
    }
  }
  mkdirSync(path.join(root, outDir), { recursive: true });
  for (const [src, dest] of COPIES) {
    copyFileSync(path.join(root, src), path.join(root, outDir, dest));
  }
  return COPIES.map(([, d]) => d);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const out = copyAgentContext();
    console.log(`✓ copy-agent-context — ${out.join(', ')} -> storybook-static/`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}
