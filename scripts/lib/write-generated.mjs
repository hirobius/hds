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
import { format, resolveConfig } from 'prettier';

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
 * Write a generated file in its committed form.
 *
 * @param {string} filePath - absolute path to write
 * @param {string} content - generated content
 * @returns {Promise<void>}
 */
export async function writeGenerated(filePath, content) {
  writeFileSync(filePath, await formatGenerated(filePath, content));
}
