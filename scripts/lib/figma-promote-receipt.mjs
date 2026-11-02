/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The promote plugin's snapshot receipt (hds#397, receipt-channel slice).
 *
 * "Take snapshot" in the promote plugin emits one fixed JSON shape,
 * `{ kind, v, fileKey, checksum, snapshot }`, saved by Download JSON under one
 * fixed name (PROMOTE_RECEIPT_FILE). `pnpm figma:snapshot --ingest` with no
 * file reads it from a known path (the Downloads folder, then beside the
 * promote plugin), or from an https URL, so nobody hand-copies the JSON. The
 * plugin itself keeps `networkAccess: none`: the receipt leaves Figma through
 * the window's download, never a request.
 */
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const PROMOTE_RECEIPT_KIND = 'hds-snapshot-receipt';
export const PROMOTE_RECEIPT_VERSION = 1;
export const PROMOTE_RECEIPT_FILE = 'hds-snapshot-receipt.json';

/**
 * Where `--ingest` with no file looks, in order.
 *
 * @param {{ root: string, home?: string }} options
 */
export function promoteReceiptPaths({ root, home = homedir() }) {
  return [
    join(home, 'Downloads', PROMOTE_RECEIPT_FILE),
    join(root, 'figma', 'push', 'promote', PROMOTE_RECEIPT_FILE),
  ];
}

/**
 * The `{ checksum, snapshot }` text ingest verifies. A receipt is checked
 * (version, and that it was taken in the library) and unwrapped; anything else
 * passes through for parseSnapshotFile to judge.
 *
 * @param {string} text
 * @param {{ libraryFileKey: string }} sync
 */
export function unwrapPromoteReceipt(text, { libraryFileKey }) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text;
  }
  if (!parsed || parsed.kind !== PROMOTE_RECEIPT_KIND) return text;
  if (parsed.v !== PROMOTE_RECEIPT_VERSION) {
    throw new Error(
      `This snapshot receipt is version ${parsed.v}; this repo reads version ${PROMOTE_RECEIPT_VERSION}. Re-run pnpm figma:push, re-import the promote plugin, and take the snapshot again.`,
    );
  }
  if (parsed.fileKey !== libraryFileKey) {
    throw new Error(
      `This snapshot receipt was taken in ${parsed.fileKey == null ? 'a file with no key' : `file ${parsed.fileKey}`}, not the HDS library (${libraryFileKey}). Take the snapshot in the library.`,
    );
  }
  return JSON.stringify({ checksum: parsed.checksum, snapshot: parsed.snapshot });
}

async function defaultFetchText(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} answered ${response.status}.`);
  return response.text();
}

/**
 * The text to ingest and where it came from: an https URL (fetched), a named
 * file, or, with no `from`, the first known receipt path that exists.
 *
 * @param {{ root: string, from?: string, home?: string, fetchText?: (url: string) => Promise<string> }} options
 */
export async function readIngestSource({ root, from, home, fetchText = defaultFetchText }) {
  if (from && /^[a-z]+:\/\//i.test(from)) {
    if (!from.startsWith('https://')) {
      throw new Error(`Refused ${from}: --ingest fetches https URLs only.`);
    }
    return { text: await fetchText(from), source: from };
  }
  if (from) return { text: readFileSync(from, 'utf8'), source: from };
  const paths = promoteReceiptPaths({ root, home });
  const found = paths.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      `No snapshot receipt at ${paths.join(' or ')}. In the promote plugin run "Take snapshot", click Download JSON (it saves ${PROMOTE_RECEIPT_FILE}), or pass the file or an https URL.`,
    );
  }
  return { text: readFileSync(found, 'utf8'), source: found };
}
