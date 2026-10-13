/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — the committed Figma snapshot (figma/snapshot.json).
 *
 * A snapshot is `{ checksum, snapshot }` exactly as the development plugin's
 * "Take snapshot" command or the use_figma snapshot script returns it:
 * `snapshot` is hdsReadState() (scripts/lib/figma-runtime.mjs) and `checksum`
 * is its FNV-1a. The checksum is checked on ingest and on every drift check, so
 * a transcription slip or a hand edit ("fixing" drift in the JSON instead of
 * in Figma) is refused instead of trusted.
 */

import { hdsChecksum } from './figma-runtime.mjs';

export const SNAPSHOT_SCHEMA_VERSION = 1;

/**
 * The committed text: stable two-space JSON with a trailing newline.
 * `bindingFallbacks` (the bound-colour fallback sweep, figma-fallbacks.mjs) is
 * a sibling of `snapshot`, not part of it: it has its own checksum and its own
 * `takenAt`, so the snapshot's checksum, the base a receipt or diff names and
 * the delta codec are untouched by it.
 */
export function serializeSnapshotFile({ checksum, snapshot, bindingFallbacks }) {
  const file = bindingFallbacks ? { checksum, snapshot, bindingFallbacks } : { checksum, snapshot };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** The kinds a bound-colour fallback mismatch can have. */
const FALLBACK_KINDS = ['fill', 'stroke', 'effect'];

/**
 * Verifies a bound-colour fallback record (what fallbacks.js returns): its
 * shape and its checksum, the FNV-1a of the record without `checksum`.
 *
 * @param {unknown} record
 * @returns {object} the record
 * @throws {Error} with the fix in the message when it is not a valid, unedited record
 */
export function verifyBindingFallbacks(record) {
  if (record?.tooLarge === true) {
    throw new Error(
      `fallbacks.js found too much to return (${record.mismatches} mismatches, ${record.chars} characters). ${record.next}`,
    );
  }
  const text = (value) => typeof value === 'string' && value.length > 0;
  const count = (value) => Number.isInteger(value) && value >= 0;
  const shaped =
    record?.format === 'binding-fallbacks' &&
    record.schemaVersion === 1 &&
    text(record.takenAt) &&
    text(record.checksum) &&
    ['all', 'components'].includes(record.scope) &&
    count(record.pages) &&
    count(record.nodes) &&
    count(record.bindings) &&
    Array.isArray(record.skippedPages) &&
    Array.isArray(record.mismatches) &&
    record.mismatches.every(
      (item) =>
        text(item?.nodeId) &&
        typeof item.nodeName === 'string' &&
        typeof item.page === 'string' &&
        FALLBACK_KINDS.includes(item.kind) &&
        text(item.variable) &&
        text(item.raw) &&
        text(item.expected),
    );
  if (!shaped) {
    throw new Error(
      'This is not a bound-colour fallback record: expected what figma/push/use-figma/fallbacks.js returns (format "binding-fallbacks", with scope, counts and a mismatches list). Save the complete, unedited result and ingest that file.',
    );
  }
  const { checksum, ...rest } = record;
  if (hdsChecksum(JSON.stringify(rest)) !== checksum) {
    throw new Error(
      'The bound-colour fallback record does not match its checksum, so it was edited after fallbacks.js returned it (or copied incompletely). Run fallbacks.js again instead of editing the JSON.',
    );
  }
  return record;
}

/**
 * Parses and verifies a snapshot file.
 *
 * @param {string} text
 * @returns {{ checksum: string, snapshot: object }}
 * @throws {Error} with the fix in the message when the text is not a valid, unedited snapshot.
 */
export function parseSnapshotFile(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      'The snapshot is not valid JSON. Save the complete result of "Take snapshot" (development plugin) or of the use_figma snapshot script, then ingest that file.',
    );
  }
  const snapshot = parsed?.snapshot;
  const shaped =
    typeof parsed?.checksum === 'string' &&
    snapshot?.schemaVersion === SNAPSHOT_SCHEMA_VERSION &&
    typeof snapshot.takenAt === 'string' &&
    ['collections', 'textStyles', 'effectStyles'].every((key) => Array.isArray(snapshot[key]));
  if (!shaped) {
    throw new Error(
      `This is not an HDS Figma snapshot: expected { checksum, snapshot } with snapshot.schemaVersion ${SNAPSHOT_SCHEMA_VERSION}, as returned by "Take snapshot" or the use_figma snapshot script.`,
    );
  }
  if (hdsChecksum(JSON.stringify(snapshot)) !== parsed.checksum) {
    throw new Error(
      'The snapshot checksum does not match its contents, so it was edited after it was taken (or copied incompletely). Take a new snapshot (pnpm figma:snapshot) instead of editing the JSON.',
    );
  }
  if (parsed.bindingFallbacks === undefined) return { checksum: parsed.checksum, snapshot };
  return {
    checksum: parsed.checksum,
    snapshot,
    bindingFallbacks: verifyBindingFallbacks(parsed.bindingFallbacks),
  };
}
