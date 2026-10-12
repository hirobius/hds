/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/lib/generated-check.mjs — the shared `--check` of the generators.
 *
 * A generated file is only known to be fresh if something compares it with what
 * its generator would write today. A generator that builds its output as
 * `{ 'path/relative/to/root': text }` calls `runCheck` under `--check`: it
 * writes nothing, names every stale file, tells the reader which command
 * regenerates them, and exits 1. docs/state-surfaces.json points its `check`
 * at these commands, and scripts/check-state-surfaces.mjs verifies that the
 * script it names handles `--check`.
 *
 * @module generated-check
 */

import { join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { matchesArtifact } from './stable-artifact.mjs';

/**
 * Files under `root` that differ from what the generator would write.
 * @param {string} root
 * @param {Record<string, string>} outputs  path relative to root -> expected text
 * @param {{ stable?: boolean, volatileRe?: RegExp, format?: (absPath: string, text: string) => Promise<string> }} [opts]
 *   `stable`: ignore date-like fragments, as `writeStableArtifact` does.
 *   `format`: shape the expected text the way the repo stores it (Prettier).
 * @returns {Promise<string[]>}
 */
export async function staleOutputs(root, outputs, { stable = false, volatileRe, format } = {}) {
  const stale = [];
  for (const [rel, text] of Object.entries(outputs)) {
    const abs = join(root, rel);
    const expected = format ? await format(abs, text) : text;
    const fresh = stable
      ? matchesArtifact(abs, expected, { volatileRe })
      : existsSync(abs) && readFileSync(abs, 'utf8') === expected;
    if (!fresh) stale.push(rel);
  }
  return stale;
}

/**
 * Run the `--check` of a generator and exit: 0 when fresh, 1 naming the stale
 * files and the command that fixes them.
 * @param {string} root
 * @param {Record<string, string>} outputs
 * @param {{ label: string, fix: string } & Parameters<typeof staleOutputs>[2]} opts
 * @returns {Promise<never>}
 */
export async function runCheck(root, outputs, { label, fix, ...rest }) {
  const stale = await staleOutputs(root, outputs, rest);
  if (stale.length > 0) {
    console.error(
      `✗ ${label}: ${stale.join(', ')} ${stale.length === 1 ? 'is' : 'are'} out of date. Run: ${fix}`,
    );
    process.exit(1);
  }
  console.log(`✓ ${label}: ${Object.keys(outputs).join(', ')} up to date`);
  process.exit(0);
}

/**
 * `--root <dir>` from argv, or `defaultRoot`: lets a test point a generator at
 * a throwaway copy of the files it reads and writes.
 * @param {string} defaultRoot
 * @param {string[]} [argv]
 */
export function rootFromArgv(defaultRoot, argv = process.argv) {
  const at = argv.indexOf('--root');
  return at >= 0 && argv[at + 1] ? resolve(argv[at + 1]) : defaultRoot;
}
