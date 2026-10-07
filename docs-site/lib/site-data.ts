import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Walk up from the working directory so this works whether Next runs from docs-site/ or the repo root. */
export function findUp(relative: string, start = process.cwd()): string {
  for (let dir = start; ; dir = dirname(dir)) {
    const file = join(dir, relative);
    if (existsSync(file)) return file;
    if (dirname(dir) === dir) throw new Error(`${relative} not found above ${start}`);
  }
}

const cache = new Map<string, unknown>();
function readJson(relative: string): unknown {
  if (!cache.has(relative)) cache.set(relative, JSON.parse(readFileSync(findUp(relative), 'utf8')));
  return cache.get(relative);
}

export const loadTokens = () => readJson('hirobius.tokens.json');

interface ManifestSpec {
  category?: string;
  tokenMapping?: Record<string, string>;
}
export const loadManifestSpecs = () =>
  (readJson('public/hds-manifest.json') as { componentSpecs: Record<string, ManifestSpec> })
    .componentSpecs;
