/**
 * Build entrypoint for the Style Dictionary multi-format emitter.
 * Writes every target into scripts/tokens-sd/dist/ (gitignored).
 *
 * Run: node scripts/tokens-sd/build.mjs   (pnpm tokens:sd)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { generateAll } from './config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');

const files = await generateAll();
mkdirSync(DIST, { recursive: true });
for (const [name, contents] of Object.entries(files)) {
  writeFileSync(join(DIST, name), contents);
  console.log(`  ✓ scripts/tokens-sd/dist/${name}  (${contents.split('\n').length - 1} lines)`);
}
console.log(`\nGenerated ${Object.keys(files).length} targets from hirobius.tokens.json.`);
