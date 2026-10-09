/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — rebuilds the snapshot a Sync wrote into the library
 * (hds#417, hds#397 C2), for `pnpm figma:snapshot --from-receipt`.
 *
 * Input: what figma/push/use-figma/receipt.js returned through use_figma, one
 * result per page ({ file, page, head, text, live }), and the committed
 * figma/snapshot.json. The head (`syncReceipt`) names the base the pages are
 * a delta against, their format, count and sum, and the post-sync checksum.
 * Every check refuses with the cause and the next step, before anything is
 * written:
 *   1. every read came from the library (and from no retired file);
 *   2. there is a receipt, and every read carries the same head;
 *   3. its base is the committed snapshot (or it carries the full snapshot);
 *   4. every page is there and the pages match the head's sum;
 *   5. the pages decode, and the rebuilt snapshot hashes to `post`;
 *   6. it is not stale: each read's live lastPush and collection, mode,
 *      variable and style counts match the rebuilt snapshot, so nothing
 *      wrote to the library between the Sync and the read.
 *
 * A multi-part delta.js (delta-1-of-N.js ... delta-N-of-N.js) leaves one
 * receipt per part, each a delta against the state before its part and each
 * head carrying `part: [i, N, run]`. Reads whose heads all name the same run
 * are chained: part 1 on the committed snapshot, part i on what part i - 1
 * rebuilt, every link checked by the six steps above; the last part's
 * snapshot is the result.
 */

import { gunzipSync } from 'zlib';
import { hdsChecksum } from './figma-runtime.mjs';
import { applySnapshotDelta } from './figma-snapshot-delta.mjs';

const COLLECT =
  'run figma/push/use-figma/receipt.js again (const PAGE = 0, then each page) and pass every saved result';
const ASK_FOR_SYNC =
  'Ask Adrian to run Sync in the library (Plugins > Development > HDS tokens sync > Sync), then read the receipt again';

/** The counts a receipt head and receipt.js's live fingerprint carry, for a snapshot. */
export function receiptCounts(snapshot) {
  const sum = (count) => snapshot.collections.reduce((n, c) => n + count(c), 0);
  return {
    collections: snapshot.collections.length,
    modes: sum((c) => c.modes.length),
    variables: sum((c) => c.variables.length),
    textStyles: snapshot.textStyles.length,
    effectStyles: snapshot.effectStyles.length,
  };
}

const isRead = (read) =>
  read !== null &&
  typeof read === 'object' &&
  Number.isInteger(read.page) &&
  typeof read.head === 'string' &&
  typeof read.text === 'string' &&
  read.live !== null &&
  typeof read.live === 'object';

function parseHead(text) {
  if (!text) {
    throw new Error(
      `The library has no sync receipt: no Sync has written one, or a promote push or snapshot cleared it. ${ASK_FOR_SYNC}.`,
    );
  }
  let head = null;
  try {
    head = JSON.parse(text);
  } catch {
    head = null;
  }
  const paged =
    head !== null &&
    typeof head === 'object' &&
    /^[0-9a-f]{8}$/.test(head.post) &&
    'base' in head &&
    (head.format === 'json' || head.format === 'gzip') &&
    Number.isInteger(head.pages) &&
    head.pages > 0 &&
    typeof head.sum === 'string';
  if (!paged) {
    throw new Error(
      `The sync receipt in the library has no pages: an older Sync plugin wrote it. Send Adrian new plugin files (pnpm figma:push) to overwrite, then: ${ASK_FOR_SYNC}.`,
    );
  }
  return head;
}

/**
 * The snapshot a Sync's receipt describes, verified, or an Error naming the
 * cause and the fix.
 *
 * @param {{ reads: object[], base: {checksum: string, snapshot: object}|null, sync: {libraryFileKey: string, retiredFileKeys: string[]} }} input
 * @returns {{ checksum: string, snapshot: object, head: object }}
 */
export function rebuildFromReceipt({ reads, base, sync }) {
  const parts = partsOf(reads);
  if (!parts) return rebuildOne({ reads, base, sync });
  let link = base;
  let result = null;
  for (let i = 1; i <= parts.n; i++) {
    // A part that needed several pages also returned its head alone: that result carries no page.
    const group = reads.filter(
      (read) => typeof read.text === 'string' && JSON.parse(read.head).part[0] === i,
    );
    if (!group.length) {
      throw new Error(
        `Part ${i} of ${parts.n} (run ${parts.run}) has no receipt page among the files: run delta-${i}-of-${parts.n}.js before part ${i + 1}, save its result (and every receipt.js page it asks for), and pass the files of every part.`,
      );
    }
    try {
      result = rebuildOne({ reads: group, base: link, sync });
    } catch (error) {
      throw new Error(`Part ${i} of ${parts.n}: ${error.message}`);
    }
    link = { checksum: result.checksum, snapshot: result.snapshot };
  }
  return { ...result, head: { ...result.head, parts: parts.n } };
}

/** { run, n } when every read's head names the same part of the same multi-part run, else null. */
function partsOf(reads) {
  let found = null;
  for (const read of reads) {
    let part = null;
    try {
      part = JSON.parse(read.head).part;
    } catch {
      return null;
    }
    const ok =
      Array.isArray(part) &&
      Number.isInteger(part[0]) &&
      Number.isInteger(part[1]) &&
      part[0] >= 1 &&
      part[0] <= part[1] &&
      typeof part[2] === 'string';
    if (!ok || (found && (found.run !== part[2] || found.n !== part[1]))) return null;
    found = { run: part[2], n: part[1] };
  }
  return found;
}

function rebuildOne({ reads, base, sync }) {
  if (!reads.length) {
    throw new Error(`--from-receipt needs the files saved from receipt.js: ${COLLECT}.`);
  }
  reads.forEach((read, i) => {
    if (!isRead(read)) {
      throw new Error(
        `File ${i + 1} is not a receipt.js result ({ file, page, head, text, live }): save what use_figma returned, unedited.`,
      );
    }
    if (read.file !== sync.libraryFileKey || sync.retiredFileKeys.includes(read.file)) {
      throw new Error(
        `Page ${read.page} was read from ${read.file === null ? 'a file with no key' : `file ${read.file}`}, not the HDS library ${sync.libraryFileKey}. Only the library carries a sync receipt an agent may ingest: run receipt.js against the library.`,
      );
    }
  });

  const head = parseHead(reads[0].head);
  if (reads.some((read) => read.head !== reads[0].head)) {
    throw new Error(
      `The files carry different receipt heads: a Sync ran between the reads. Read every page again: ${COLLECT}.`,
    );
  }

  if (head.base !== null && (!base || base.checksum !== head.base)) {
    throw new Error(
      `This receipt is a delta against base snapshot ${head.base}, but the committed figma/snapshot.json is ${base ? base.checksum : 'missing'}: main's snapshot changed after the deploy the Sync fetched its bundle from. Once the deploy of the current main is live, ask Adrian to run Sync again, then read the receipt again.`,
    );
  }

  const pages = new Map();
  for (const read of reads) {
    if (pages.has(read.page) && pages.get(read.page) !== read.text) {
      throw new Error(`Two files hold different text for page ${read.page}: ${COLLECT}.`);
    }
    pages.set(read.page, read.text);
  }
  let text = '';
  for (let i = 0; i < head.pages; i++) {
    if (!pages.has(i)) {
      throw new Error(
        `Receipt page ${i} of ${head.pages} is missing. Run figma/push/use-figma/receipt.js with const PAGE = ${i};, save the result, and pass every file.`,
      );
    }
    text += pages.get(i);
  }
  if (hdsChecksum(text) !== head.sum) {
    throw new Error(
      `The receipt pages hash to ${hdsChecksum(text)}, not the head's sum ${head.sum}: a page is cut short or belongs to another receipt. ${COLLECT}.`,
    );
  }

  let snapshot = null;
  try {
    const body = JSON.parse(
      head.format === 'gzip' ? gunzipSync(Buffer.from(text, 'base64')).toString('utf8') : text,
    );
    snapshot = applySnapshotDelta(head.base === null ? null : base.snapshot, body);
  } catch (error) {
    throw new Error(
      `The receipt pages could not be decoded as ${head.format} (${error.message}). ${ASK_FOR_SYNC}.`,
    );
  }
  const checksum = hdsChecksum(JSON.stringify(snapshot));
  if (checksum !== head.post) {
    throw new Error(
      `The rebuilt snapshot hashes to ${checksum}, not the receipt's post checksum ${head.post}: the pages do not rebuild the state the Sync took. ${ASK_FOR_SYNC}.`,
    );
  }

  const counts = receiptCounts(snapshot);
  for (const read of reads) {
    let lastPush;
    try {
      lastPush = JSON.parse(read.live.lastPush || 'null');
    } catch {
      lastPush = undefined;
    }
    const differs = Object.keys(counts)
      .filter((key) => read.live[key] !== counts[key])
      .map((key) => `${key} ${counts[key]} in the receipt, ${read.live[key]} live`);
    if (JSON.stringify(lastPush) !== JSON.stringify(snapshot.lastPush)) {
      differs.push(
        `lastPush ${JSON.stringify(snapshot.lastPush)} in the receipt, ${read.live.lastPush || 'none'} live`,
      );
    }
    if (differs.length) {
      throw new Error(
        `The receipt is stale: the library changed after the Sync that wrote it (${differs.join('; ')}), so its snapshot no longer describes the file. ${ASK_FOR_SYNC}.`,
      );
    }
  }
  return { checksum, snapshot, head };
}
