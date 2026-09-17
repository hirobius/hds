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

/** The committed text: stable two-space JSON with a trailing newline. */
export function serializeSnapshotFile({ checksum, snapshot }) {
  return `${JSON.stringify({ checksum, snapshot }, null, 2)}\n`;
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
  return { checksum: parsed.checksum, snapshot };
}
