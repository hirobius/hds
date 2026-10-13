/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/lib/generated-check.mjs — the shared runner of the generators.
 *
 * A generated file is only known to be fresh if something compares it with what
 * its generator would write today, in the bytes the repo commits. A generator
 * builds its output as `{ 'path/relative/to/root': text }` and hands it to
 * `runGenerator`, which owns the rest: `--check` from argv, Prettier formatting
 * (`formatCommitted`, so the output matches what lint-staged commits), the
 * write, the comparison, the exit code and the fix hint. Under `--check` it
 * writes nothing, names every stale file, says which command regenerates them,
 * and exits 1. docs/state-surfaces.json points its `check` at these commands;
 * scripts/check-state-surfaces.mjs verifies that the script it names handles
 * `--check`, and its test (hds#644) that the script goes through this runner.
 *
 * `runCheck` is the older check-only half, still used by generators that write
 * on their own path; new and migrated generators use `runGenerator`.
 *
 * @module generated-check
 */

import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { matchesArtifact } from './stable-artifact.mjs';
import { formatCommitted } from './write-generated.mjs';

/**
 * What a generator produces: path relative to its root -> text, or `null` for
 * a file that must not exist (a generated file whose source went away).
 * @typedef {Record<string, string | null>} GeneratedOutputs
 */

/**
 * Files under `root` that differ from what the generator would write.
 * @param {string} root
 * @param {GeneratedOutputs} outputs  path relative to root -> expected text
 * @param {{ stable?: boolean, volatileRe?: RegExp, format?: (absPath: string, text: string) => Promise<string> }} [opts]
 *   `stable`: ignore date-like fragments, as `writeStableArtifact` does.
 *   `format`: shape the expected text the way the repo stores it (Prettier).
 * @returns {Promise<string[]>}
 */
export async function staleOutputs(root, outputs, { stable = false, volatileRe, format } = {}) {
  const stale = [];
  for (const [rel, text] of Object.entries(outputs)) {
    const abs = join(root, rel);
    if (text === null) {
      if (existsSync(abs)) stale.push(rel);
      continue;
    }
    const expected = format ? await format(abs, text) : text;
    const fresh = stable
      ? matchesArtifact(abs, expected, { volatileRe })
      : existsSync(abs) && readFileSync(abs, 'utf8') === expected;
    if (!fresh) stale.push(rel);
  }
  return stale;
}

/**
 * Write `outputs` under `root` as given, touching only files whose bytes would
 * change (with `stable`, only beyond their date-like fragments) and removing
 * each `null` one that exists. Format first; `runGenerator` does.
 * @param {string} root
 * @param {GeneratedOutputs} outputs
 * @param {{ stable?: boolean, volatileRe?: RegExp }} [opts]
 * @returns {string[]} the paths written or removed
 */
export function writeOutputs(root, outputs, { stable = false, volatileRe } = {}) {
  const changed = [];
  for (const [rel, text] of Object.entries(outputs)) {
    const abs = join(root, rel);
    if (text === null) {
      if (existsSync(abs)) {
        rmSync(abs);
        changed.push(rel);
      }
      continue;
    }
    const fresh = stable
      ? matchesArtifact(abs, text, { volatileRe })
      : existsSync(abs) && readFileSync(abs, 'utf8') === text;
    if (fresh) continue;
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text);
    changed.push(rel);
  }
  return changed;
}

/** Each output in the bytes the repo commits for its path. */
async function committed(outputs) {
  const entries = await Promise.all(
    Object.entries(outputs).map(async ([rel, text]) => [
      rel,
      text === null ? null : await formatCommitted(rel, text),
    ]),
  );
  return Object.fromEntries(entries);
}

const listed = (paths) => paths.join(', ');

/**
 * The CLI of a generator. With `--check` in `argv`: compare, write nothing,
 * name the stale files and `fix`, exit 1. Otherwise: write what changed.
 * Sets `process.exitCode` when it fails (never lowers one already set) and
 * returns what it did, so a generator can do follow-up work after a write.
 *
 * @param {{
 *   root: string,
 *   outputs: GeneratedOutputs,
 *   label: string,
 *   fix: string,
 *   stable?: boolean,
 *   volatileRe?: RegExp,
 *   format?: boolean,
 *   argv?: string[],
 * }} opts
 *   `label`: how messages name the generator. `fix`: the command that
 *   regenerates the outputs. `stable`: ignore date-like fragments (see
 *   stable-artifact.mjs). `format: false`: compare and write the text as given.
 * @returns {Promise<{ check: boolean, stale: string[], changed: string[], exitCode: 0 | 1 }>}
 */
export async function runGenerator({
  root,
  outputs,
  label,
  fix,
  stable = false,
  volatileRe,
  format = true,
  argv = process.argv,
}) {
  const expected = format ? await committed(outputs) : outputs;
  const present = Object.keys(outputs).filter((rel) => outputs[rel] !== null);

  if (argv.includes('--check')) {
    const stale = await staleOutputs(root, expected, { stable, volatileRe });
    if (stale.length > 0) {
      console.error(
        `✗ ${label}: ${listed(stale)} ${stale.length === 1 ? 'is' : 'are'} out of date. Run: ${fix}`,
      );
      if (!process.exitCode) process.exitCode = 1;
      return { check: true, stale, changed: [], exitCode: 1 };
    }
    console.log(`✓ ${label}: ${listed(present)} up to date`);
    return { check: true, stale: [], changed: [], exitCode: 0 };
  }

  const changed = writeOutputs(root, expected, { stable, volatileRe });
  console.log(
    changed.length > 0
      ? `✓ ${label}: wrote ${listed(changed)}`
      : `✓ ${label}: ${listed(present)} already up to date`,
  );
  return { check: false, stale: [], changed, exitCode: 0 };
}

/**
 * Run the `--check` of a generator and exit: 0 when fresh, 1 naming the stale
 * files and the command that fixes them. Prefer `runGenerator`, which also
 * owns the write and the formatting.
 * @param {string} root
 * @param {GeneratedOutputs} outputs
 * @param {{ label: string, fix: string } & Parameters<typeof staleOutputs>[2]} opts
 * @returns {Promise<never>}
 */
export async function runCheck(root, outputs, { label, fix, ...rest }) {
  const stale = await staleOutputs(root, outputs, rest);
  if (stale.length > 0) {
    console.error(
      `✗ ${label}: ${listed(stale)} ${stale.length === 1 ? 'is' : 'are'} out of date. Run: ${fix}`,
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
