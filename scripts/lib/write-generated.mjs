/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * write-generated.mjs — write a generated file the way the repo will store it.
 *
 * WHY THIS EXISTS. Generated files are committed, and lint-staged runs Prettier
 * over every staged file. A generator that writes unformatted output therefore
 * produces bytes that can never match the committed copy: Prettier rewrites them
 * on the way in, and the next `pnpm tokens` writes the unformatted version back.
 * check-token-rebake-needed compares the two byte-for-byte, so it reported
 * "REBAKE REQUIRED" on every run regardless of how current the tokens were — a
 * gate that is always red says nothing about the thing it guards, and the real
 * staleness it exists to catch hides inside its own noise.
 *
 * Three generated files had this bug (tailwind.config.tokens.cjs,
 * src/styles/tenants.css, DESIGN-HANDOFF.md) and each was found separately.
 * Writing through here means a fourth cannot be introduced by forgetting.
 *
 * @module write-generated
 */

import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, getFileInfo, resolveConfig } from 'prettier';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/** What Prettier's CLI (so lint-staged) skips by default. */
const IGNORE_FILES = ['.gitignore', '.prettierignore'].map((f) => join(REPO, f));

/**
 * Format `content` with the repo's Prettier config for `filePath`, or return it
 * unchanged if Prettier has no parser for that file type.
 *
 * @param {string} filePath - absolute path, used to pick parser and config
 * @param {string} content - generated content
 * @returns {Promise<string>}
 */
export async function formatGenerated(filePath, content) {
  try {
    const config = await resolveConfig(filePath);
    return await format(content, { ...config, filepath: filePath });
  } catch {
    // No parser for this extension, or unparseable output. Writing the raw
    // content is strictly better than failing the build — the rebake gate will
    // say so if it matters.
    return content;
  }
}

/**
 * The bytes this repo commits for the generated file at `relPath`: Prettier
 * with this repo's config, or `content` unchanged when .gitignore or
 * .prettierignore lists the path (Prettier's CLI, so lint-staged, never
 * touches those; their generator owns the layout).
 *
 * Resolved against this repository whatever root the generator writes under,
 * so a test's throwaway copy of the tree formats exactly like the real one.
 *
 * @param {string} relPath - output path relative to the generator's root
 * @param {string} content - generated content
 * @returns {Promise<string>}
 */
export async function formatCommitted(relPath, content) {
  const filePath = join(REPO, relPath);
  const { ignored } = await getFileInfo(filePath, { ignorePath: IGNORE_FILES });
  return ignored ? content : formatGenerated(filePath, content);
}

/**
 * Write a generated file in its committed form.
 *
 * @param {string} filePath - absolute path to write
 * @param {string} content - generated content
 * @returns {Promise<void>}
 */
export async function writeGenerated(filePath, content) {
  writeFileSync(filePath, await formatGenerated(filePath, content));
}
