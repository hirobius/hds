/**
 * scripts/lib/stable-artifact.mjs
 *
 * Idempotent write helper for tracked artifacts that contain volatile fields
 * (wall-clock timestamps, etc.). Ensures that a regen which produces only
 * volatile differences does NOT touch the file on disk, keeping the working
 * tree clean after a pre-commit + post-commit cycle.
 *
 * Usage:
 *   import { writeStableArtifact } from './lib/stable-artifact.mjs';
 *
 *   const changed = writeStableArtifact(absPath, newContent, { volatileRe });
 *   // Returns true if the file was written, false if it was preserved as-is.
 *
 * Algorithm:
 *   1. If the file does not yet exist, write it unconditionally.
 *   2. Otherwise, replace all matches of `volatileRe` with a fixed sentinel
 *      in BOTH the existing content and the new content.
 *   3. If the normalised strings are equal, skip the write and return false.
 *   4. Otherwise, write `newContent` (un-normalised) and return true.
 *
 * Default `volatileRe` matches ISO-8601 timestamps (date-only and full form):
 *   YYYY-MM-DD  or  YYYY-MM-DDTHH:MM:SS.mmmZ
 *
 * @module stable-artifact
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';

/** Sentinel used when normalising volatile fragments for comparison. */
const SENTINEL = '__VOLATILE__';

/**
 * Default regex: ISO-8601 timestamps (full datetime or date-only).
 * The full form covers: 2026-06-18T07:22:21.335Z  (T…Z suffix optional)
 */
const DEFAULT_VOLATILE_RE = /\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?/g;

/**
 * Write `newContent` to `absPath` only when the non-volatile content differs
 * from what is already on disk.
 *
 * @param {string} absPath     - Absolute path of the artifact file.
 * @param {string} newContent  - The full new file content as a string.
 * @param {{ volatileRe?: RegExp }} [options]
 * @returns {boolean} `true` if the file was written, `false` if preserved.
 */
export function writeStableArtifact(absPath, newContent, { volatileRe } = {}) {
  const re = volatileRe ?? DEFAULT_VOLATILE_RE;

  if (existsSync(absPath)) {
    const oldContent = readFileSync(absPath, 'utf-8');
    // Normalise both sides by replacing all volatile matches with the sentinel.
    // We must reset the regex lastIndex between uses (global regexes are stateful).
    const normalize = (str) => str.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'), SENTINEL);
    if (normalize(oldContent) === normalize(newContent)) {
      return false; // No substantive change — preserve existing file.
    }
  }

  writeFileSync(absPath, newContent, 'utf-8');
  return true;
}
