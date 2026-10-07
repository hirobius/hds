/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — what the Sync plugin (figma/push/plugin/) runs
 * inside Figma around the push engine (figma-runtime.mjs). hds#411, ADR-032.
 *
 * `pnpm figma:push` copies this file's functions into the plugin's code.js,
 * after the runtime, minus `export`, the import and comments
 * (syncRuntimeSource in figma-scripts.mjs). Node imports them for tests.
 * Rules (scripts/__tests__/figma-sync.test.mjs enforces them):
 *   - top level holds only `export function` / `export async function`, plus
 *     the one import of figma-runtime.mjs
 *   - no module-level constants; no globals beyond the Plugin API and
 *     setTimeout / clearTimeout (both exist in the plugin sandbox)
 *   - ES2020 syntax
 *
 * Trust. The plugin carries no model. Its window fetches the sync bundle the
 * Storybook deploy publishes, and this code treats it as data: JSON.parse,
 * never evaluated. Where the plugin may write is never read from the bundle:
 * the library's key and name and the retired files' keys and names (`sync`)
 * are baked into code.js from figma/links.json when `pnpm figma:push` builds
 * it, and prune is forced off here, in code. Order of checks for Sync and
 * Plan: the bundle (reachable, JSON, this plugin's build, its checksum, no
 * prune), then the file (a retired file is denied before the library is
 * allowed), then the push. There is no staging file (ADR-026, amended
 * 2026-10-07): Sync writes to the one library.
 *
 * Receipt (hds#417). After a verified push and its snapshot, Sync writes the
 * snapshot back into the file as shared plugin data on figma.root: pages
 * `syncSnapshot.0..n` holding the delta against the bundle's base (the
 * committed figma/snapshot.json; the full snapshot when there is none), then
 * the `syncReceipt` head that names them. An agent reads them with
 * figma/push/use-figma/receipt.js and rebuilds the snapshot with
 * `pnpm figma:snapshot --from-receipt`. The delta codec (figma-snapshot-delta.mjs)
 * sits in code.js before this code; hdsSyncMain gets its `snapshotDelta`.
 */

import { hdsChecksum, hdsGetKey, hdsSetKey, hdsRunPush, hdsRunSnapshot } from './figma-runtime.mjs';

/** `value` when it is 7–40 hex digits, else a placeholder: fetched data never reaches a message as prose or a link. */
export function hdsSyncHex(value) {
  return typeof value === 'string' && /^[0-9a-f]{7,40}$/.test(value) ? value : '(unreadable)';
}

/** The file key Figma gives the plugin, or null (an unsaved file, or no enablePrivatePluginApi). */
export function hdsSyncFileKey(figma) {
  return typeof figma.fileKey === 'string' && figma.fileKey ? figma.fileKey : null;
}

/**
 * Whether this file carries the HDS library marker (Mark) holding the library
 * key. The staging-era marker counts too when it holds the library key: Mark
 * stamped the copy that became the library before 2026-10-07, and only a file
 * then named exactly like staging could take it.
 */
export function hdsSyncMarked(figma, sync) {
  return (
    hdsGetKey(figma.root, 'libraryFileKey') === sync.libraryFileKey ||
    hdsGetKey(figma.root, 'stagingFileKey') === sync.libraryFileKey
  );
}

/**
 * Null when Sync and Plan may run in this file, else why not. Deny first: a
 * retired file, by key or by name, is refused whatever else is true. Then
 * allow the library key; where Figma gives no key, allow only a file that
 * carries the library marker (Mark) AND is named exactly like the library,
 * because a duplicate of the library carries the marker too.
 */
export function hdsSyncFileGuard(figma, sync) {
  const key = hdsSyncFileKey(figma);
  const name = figma.root.name;
  const nothing = ' Nothing was read or written.';
  const library = ' ("' + sync.libraryFileName + '", ' + sync.libraryFileKey + ')';
  if (
    (key !== null && sync.retiredFileKeys.indexOf(key) !== -1) ||
    sync.retiredFileNames.indexOf(name) !== -1
  ) {
    return (
      'This is a retired HDS file (' +
      (key !== null && sync.retiredFileKeys.indexOf(key) !== -1 ? key : '"' + name + '"') +
      '), the library before 2026-10-07. The Sync plugin writes to the HDS library only' +
      library +
      '.' +
      nothing +
      ' Open the library and run Sync there.'
    );
  }
  if (key !== null) {
    if (key === sync.libraryFileKey) return null;
    return (
      'This file (' +
      key +
      ') is not the HDS library named in figma/links.json' +
      library +
      '.' +
      nothing +
      ' Open "' +
      sync.libraryFileName +
      '" and run Sync there.'
    );
  }
  if (!hdsSyncMarked(figma, sync)) {
    return (
      'Figma gave this plugin no file key, and this file is not marked as the HDS library, so the plugin cannot tell the library from another file.' +
      nothing +
      ' If this is the library "' +
      sync.libraryFileName +
      '": Plugins > Development > HDS tokens sync > Mark this file as the HDS library, paste ' +
      sync.libraryFileKey +
      ', then run Sync again.'
    );
  }
  if (name !== sync.libraryFileName) {
    return (
      'This file carries the HDS library marker but is named "' +
      name +
      '", not "' +
      sync.libraryFileName +
      '". A copy of the library keeps the marker, so the library must be named exactly.' +
      nothing +
      ' Open the library itself and run Sync there.'
    );
  }
  return null;
}

/** Null when Mark may stamp this file as the library with the pasted key, else why not. */
export function hdsSyncMarkGuard(figma, sync, typed) {
  const key = hdsSyncFileKey(figma);
  const name = figma.root.name;
  const value = typeof typed === 'string' ? typed.trim() : '';
  const nothing = ' Nothing was written.';
  if (
    (key !== null && sync.retiredFileKeys.indexOf(key) !== -1) ||
    sync.retiredFileNames.indexOf(name) !== -1 ||
    sync.retiredFileKeys.indexOf(value) !== -1
  ) {
    return (
      'Refused: that is a retired HDS file, the library before 2026-10-07. Only the library ("' +
      sync.libraryFileName +
      '") can be marked as the HDS library.' +
      nothing
    );
  }
  if (name !== sync.libraryFileName) {
    return (
      'Refused: this file is named "' +
      name +
      '". Only a file named exactly "' +
      sync.libraryFileName +
      '" can be marked as the HDS library.' +
      nothing +
      ' Open the library, then run Mark again.'
    );
  }
  if (value !== sync.libraryFileKey) {
    return (
      'Refused: "' +
      value.slice(0, 40) +
      '" is not the library file key from figma/links.json.' +
      nothing +
      ' Run Mark again and paste ' +
      sync.libraryFileKey +
      ' exactly.'
    );
  }
  if (key !== null && key !== sync.libraryFileKey) {
    return (
      'Refused: Figma says this file is ' +
      key +
      ', not the library ' +
      sync.libraryFileKey +
      '.' +
      nothing
    );
  }
  return null;
}

/** The first characters of a response, printable ASCII only, for a message. */
export function hdsSyncPreview(text) {
  return String(text || '')
    .slice(0, 40)
    .replace(/[^\x20-\x7e]/g, ' ');
}

/**
 * The bundle the window fetched, checked, or an Error naming the reason and
 * the fix. `fetched` is the window's answer: { url, status, text } or
 * { url, error }. `pluginBuild` is the build baked into this code.js.
 */
export function hdsSyncReadBundle(fetched, sync, pluginBuild) {
  const url = sync.bundleUrl;
  const nothing = ' Nothing was read or written.';
  const retry =
    ' Open ' +
    url +
    ' in a browser: when it shows JSON, run Sync again. If it does not, check the latest Vercel deployment of the Storybook site, whose build writes this file.';
  if (!fetched || fetched.url !== url) {
    throw new Error(
      'The plugin window answered for another address than ' + url + '.' + nothing + retry,
    );
  }
  if (typeof fetched.error === 'string') {
    throw new Error(
      'Could not fetch the Sync bundle from ' +
        url +
        ' (' +
        fetched.error +
        '): this computer may be offline, or the network blocked the request.' +
        nothing +
        ' Check the connection.' +
        retry,
    );
  }
  if (!(fetched.status >= 200 && fetched.status < 300)) {
    throw new Error(
      'The Sync bundle at ' +
        url +
        ' answered HTTP ' +
        fetched.status +
        ' instead of the bundle: the deploy may still be building, or its build did not write the file.' +
        nothing +
        retry,
    );
  }
  let bundle = null;
  try {
    bundle = JSON.parse(fetched.text);
  } catch (_error) {
    throw new Error(
      'The Sync bundle at ' +
        url +
        ' is not JSON (it starts "' +
        hdsSyncPreview(fetched.text) +
        '"): the host served something else in its place, such as an error or sign-in page.' +
        nothing +
        retry,
    );
  }
  if (!bundle || typeof bundle !== 'object') {
    throw new Error('The Sync bundle at ' + url + ' is not an HDS sync bundle.' + nothing + retry);
  }
  if (bundle.pluginBuild !== pluginBuild) {
    const code = bundle.pluginFiles ? bundle.pluginFiles['code.js'] : null;
    throw new Error(
      'This plugin is out of date (build ' +
        pluginBuild +
        ', main needs ' +
        hdsSyncHex(bundle.pluginBuild) +
        ').' +
        nothing +
        " Ask an agent for new plugin files (pnpm figma:push), overwrite manifest.json, code.js and ui.html in this plugin's folder, then run Sync again. Expected code.js checksum: " +
        hdsSyncHex(code) +
        '.',
    );
  }
  const payload = bundle.payload;
  const intact =
    bundle.schemaVersion === sync.schemaVersion &&
    payload !== null &&
    typeof payload === 'object' &&
    hdsChecksum(JSON.stringify(payload)) === bundle.checksum &&
    payload.modelHash === bundle.modelHash &&
    hdsSyncHex(bundle.commit) === bundle.commit;
  if (!intact) {
    throw new Error(
      'The Sync bundle at ' +
        url +
        ' does not match its checksum: it changed after the build wrote it (a damaged or altered download).' +
        nothing +
        ' Run Sync again. If it repeats, ask an agent to compare it with pnpm figma:push --bundle on main.',
    );
  }
  const options = payload.options || {};
  if (options.prune !== false) {
    throw new Error(
      'The Sync bundle at ' +
        url +
        ' asks for prune, and the Sync plugin never deletes.' +
        nothing +
        ' Rebuild it with pnpm figma:push --bundle (which never prunes), then run Sync again. A deliberate prune uses the "HDS tokens promote (baked)" plugin.',
    );
  }
  if (options.scope !== null) {
    throw new Error(
      'The Sync bundle at ' +
        url +
        ' asks for a partial push, and Sync always pushes the whole model.' +
        nothing +
        ' Rebuild it with pnpm figma:push --bundle, then run Sync again.',
    );
  }
  return bundle;
}

/** The bundle's base (the committed snapshot) when it is intact, else null: the receipt then carries the full snapshot. */
export function hdsSyncBase(bundle) {
  const base = bundle.base;
  const sum = base && base.snapshot ? hdsChecksum(JSON.stringify(base.snapshot)) : null;
  return sum !== null && sum === base.checksum ? base : null;
}

/**
 * The receipt head (at most 1,024 characters) a verified Sync stamps on
 * figma.root. `post` is the snapshot's checksum and `lastPush` the push it
 * records; `base` is the checksum the pages are a delta against (null: they
 * hold the full snapshot). hdsSyncStamp adds `format`, `pages` and `sum`.
 */
export function hdsSyncReceipt(bundle, report, snap, pluginBuild, base) {
  const s = snap.snapshot;
  const sum = (list, count) => list.reduce((n, item) => n + count(item), 0);
  return {
    v: 1,
    commit: bundle.commit,
    modelHash: bundle.modelHash,
    pluginBuild: pluginBuild,
    pushedAt: s.lastPush && typeof s.lastPush.pushedAt === 'string' ? s.lastPush.pushedAt : null,
    takenAt: s.takenAt,
    line: report.line,
    counts: {
      collections: s.collections.length,
      modes: sum(s.collections, (c) => c.modes.length),
      variables: sum(s.collections, (c) => c.variables.length),
      textStyles: s.textStyles.length,
      effectStyles: s.effectStyles.length,
    },
    post: snap.checksum,
    lastPush: s.lastPush,
    base: base ? base.checksum : null,
  };
}

/** The receipt pages' text, joined in order: `count` pages from syncSnapshot.0. */
export function hdsSyncReadPages(figma, count) {
  let text = '';
  for (let i = 0; i < count; i++) text += hdsGetKey(figma.root, 'syncSnapshot.' + i) || '';
  return text;
}

/**
 * Whether the receipt already on figma.root still describes this file
 * exactly: same commit, model, plugin build, push and base, a state that,
 * read at that receipt's takenAt, has its post checksum, and its pages
 * intact. Then a Sync that changed nothing writes nothing. A head naming more
 * than `sync.maxPages` pages never holds, and none of them is read: a
 * malformed count cannot keep Sync reading.
 */
export function hdsSyncReceiptHolds(figma, receipt, snapshot, sync) {
  let previous = null;
  try {
    previous = JSON.parse(hdsGetKey(figma.root, 'syncReceipt') || 'null');
  } catch (_error) {
    previous = null;
  }
  return (
    previous !== null &&
    typeof previous === 'object' &&
    ['v', 'commit', 'modelHash', 'pluginBuild', 'pushedAt', 'base'].every(
      (field) => previous[field] === receipt[field],
    ) &&
    typeof previous.takenAt === 'string' &&
    hdsChecksum(JSON.stringify(Object.assign({}, snapshot, { takenAt: previous.takenAt }))) ===
      previous.post &&
    previous.pages <= sync.maxPages &&
    hdsChecksum(hdsSyncReadPages(figma, previous.pages)) === previous.sum
  );
}

/**
 * Writes the receipt: the old head goes first (so a reader never pairs it
 * with new pages), then each page, read back to prove Figma kept it whole,
 * then the pages a longer receipt left, and the head last (so it never names
 * a page not written yet). Throws, writing nothing, when the head is over
 * 1,024 characters or the pages over `sync.maxPages`.
 */
export function hdsSyncWriteReceipt(figma, receipt, pages, sync) {
  const text = JSON.stringify(receipt);
  if (text.length > 1024) {
    throw new Error('the head is ' + text.length + ' characters, over its 1,024 limit.');
  }
  if (pages.length > sync.maxPages) {
    throw new Error(
      'it needs ' + pages.length + ' pages, over its limit of ' + sync.maxPages + '.',
    );
  }
  const put = (key, value) => {
    hdsSetKey(figma.root, key, value);
    if ((hdsGetKey(figma.root, key) || '') !== value) {
      throw new Error(
        'Figma did not keep ' + key + ' (' + value.length + ' characters of shared plugin data).',
      );
    }
  };
  if (hdsGetKey(figma.root, 'syncReceipt')) put('syncReceipt', '');
  pages.forEach((page, i) => put('syncSnapshot.' + i, page));
  for (let i = pages.length; i < sync.maxPages; i++) {
    if (hdsGetKey(figma.root, 'syncSnapshot.' + i)) put('syncSnapshot.' + i, '');
  }
  put('syncReceipt', text);
}

/**
 * Stamps the receipt for a verified Sync and returns its head, or null when
 * the receipt already there still holds. The pages hold `deltaOf(base, post)`
 * as JSON, or `{ full: post }` with no intact base. Up to `sync.rawChars`
 * that text goes raw; above, the window gzips and base64-encodes it
 * (CompressionStream, default level) and the smaller wins. A window without
 * CompressionStream, or one that does not answer, leaves it raw. Either way
 * it is cut into pages of at most `sync.pageChars`, never between the two
 * halves of a surrogate pair (raw JSON keeps an emoji as one), so every page
 * is well-formed text on its own.
 */
export async function hdsSyncStamp(figma, bundle, report, snap, pluginBuild, sync, deltaOf) {
  const base = hdsSyncBase(bundle);
  const receipt = hdsSyncReceipt(bundle, report, snap, pluginBuild, base);
  if (hdsSyncReceiptHolds(figma, receipt, snap.snapshot, sync)) return null;
  const body = JSON.stringify(
    base ? deltaOf(base.snapshot, snap.snapshot) : { full: snap.snapshot },
  );
  let text = body;
  receipt.format = 'json';
  if (body.length > sync.rawChars) {
    try {
      const packed = await hdsSyncAsk(
        figma,
        { type: 'gzip', text: body },
        'gzipped',
        sync.gzipTimeoutMs,
      );
      if (typeof packed.text === 'string' && packed.text.length < body.length) {
        text = packed.text;
        receipt.format = 'gzip';
      }
    } catch (_error) {
      text = body;
    }
  }
  const pages = [];
  for (let at = 0, end = 0; at < text.length; at = end) {
    end = at + sync.pageChars;
    if (end < text.length && end - 1 > at && /[\uD800-\uDBFF]/.test(text[end - 1])) end -= 1;
    pages.push(text.slice(at, end));
  }
  receipt.pages = pages.length;
  receipt.sum = hdsChecksum(text);
  hdsSyncWriteReceipt(figma, receipt, pages, sync);
  return receipt;
}

/** What Check this file reports. Reads only. */
export function hdsSyncCheck(figma, sync, pluginBuild) {
  const key = hdsSyncFileKey(figma);
  const read = (field) => {
    try {
      return JSON.parse(hdsGetKey(figma.root, field) || 'null');
    } catch (_error) {
      return null;
    }
  };
  const refused = hdsSyncFileGuard(figma, sync);
  return {
    file: { name: figma.root.name, key: key, fileKeyExposed: key !== null },
    libraryMarker:
      hdsGetKey(figma.root, 'libraryFileKey') || hdsGetKey(figma.root, 'stagingFileKey'),
    verdict: refused ? 'refused' : 'library',
    reason: refused,
    pluginBuild: pluginBuild,
    bundleUrl: sync.bundleUrl,
    lastPush: read('lastPush'),
    syncReceipt: read('syncReceipt'),
  };
}

/**
 * Posts `message` to the plugin window and resolves with its first answer of
 * type `answer`. With `timeoutMs`, rejects when none comes in time: a window
 * built by an older ui.html does not know the message.
 */
export function hdsSyncAsk(figma, message, answer, timeoutMs) {
  return new Promise((resolve, reject) => {
    let done = false;
    let timer = null;
    if (timeoutMs && typeof setTimeout === 'function') {
      timer = setTimeout(() => {
        if (done) return;
        done = true;
        reject(
          new Error(
            'The plugin window did not answer within ' +
              Math.round(timeoutMs / 1000) +
              ' s. Nothing was read or written. Its ui.html may be out of date: ask an agent for new plugin files (pnpm figma:push), overwrite all three, then run Sync again.',
          ),
        );
      }, timeoutMs);
    }
    figma.ui.onmessage = (reply) => {
      if (reply === 'close') {
        figma.closePlugin();
        return;
      }
      if (done || !reply || reply.type !== answer) return;
      done = true;
      if (timer !== null && typeof clearTimeout === 'function') clearTimeout(timer);
      resolve(reply);
    };
    figma.ui.postMessage(message);
  });
}

/**
 * The plugin: one menu command, one result in its window. Never throws.
 * `deltaOf` is the codec's snapshotDelta, which code.js carries.
 */
export async function hdsSyncMain(figma, sync, pluginBuild, html, deltaOf) {
  const closeOnly = (reply) => {
    if (reply === 'close') figma.closePlugin();
  };
  const show = (result) => {
    figma.ui.onmessage = closeOnly;
    figma.ui.postMessage(Object.assign({ type: 'result' }, result));
  };
  figma.showUI(html, { width: 560, height: 520, themeColors: true });
  figma.ui.onmessage = closeOnly;
  const command = figma.command;
  try {
    if (command === 'check') {
      const result = hdsSyncCheck(figma, sync, pluginBuild);
      show({
        ok: true,
        title:
          'Check: ' +
          (result.verdict === 'library' ? 'Sync may run here' : 'Sync refuses this file') +
          ' · Figma ' +
          (result.file.fileKeyExposed ? 'gives' : 'does not give') +
          ' this plugin the file key',
        notes: result.reason ? [result.reason] : [],
        fileName: 'figma-sync-check.json',
        result: result,
      });
      return;
    }
    if (command === 'mark') {
      const answer = await hdsSyncAsk(
        figma,
        {
          type: 'mark-form',
          title:
            'Mark this file as the HDS library: paste the library file key from figma/links.json',
        },
        'mark',
        0,
      );
      const refused = hdsSyncMarkGuard(figma, sync, answer.key);
      if (refused) throw new Error(refused);
      hdsSetKey(figma.root, 'libraryFileKey', sync.libraryFileKey);
      show({
        ok: true,
        title: 'Marked "' + figma.root.name + '" as the HDS library. Run Sync now.',
        notes: [],
        fileName: 'figma-sync-mark.json',
        result: hdsSyncCheck(figma, sync, pluginBuild),
      });
      return;
    }
    if (command !== 'sync' && command !== 'plan') {
      throw new Error(
        'This plugin has no "' +
          command +
          '" command: its manifest.json is out of date. Nothing was read or written. Ask an agent for new plugin files (pnpm figma:push), overwrite manifest.json, code.js and ui.html in this plugin\'s folder, then run Sync again.',
      );
    }
    const fetched = await hdsSyncAsk(
      figma,
      { type: 'fetch', url: sync.bundleUrl },
      'fetched',
      sync.fetchTimeoutMs,
    );
    const bundle = hdsSyncReadBundle(fetched, sync, pluginBuild);
    const refused = hdsSyncFileGuard(figma, sync);
    if (refused) throw new Error(refused);
    const dryRun = command === 'plan';
    const report = await hdsRunPush(figma, bundle.payload, bundle.checksum, {
      dryRun: dryRun,
      prune: false,
      scope: null,
    });
    const at = bundle.commit.slice(0, 7);
    const warned = report.warnings.length
      ? ' · ' + report.warnings.length + ' warning(s): read them below'
      : '';
    if (dryRun) {
      show({
        ok: true,
        title: 'Plan for ' + at + ' (nothing written): ' + report.line + warned,
        notes: report.changes.concat(report.warnings, report.problems),
        fileName: 'figma-sync-plan.json',
        result: report,
      });
      return;
    }
    const snap = await hdsRunSnapshot(figma);
    let receiptNote = 'Receipt unchanged: this file already matched.';
    try {
      const stamped = await hdsSyncStamp(figma, bundle, report, snap, pluginBuild, sync, deltaOf);
      if (stamped) {
        receiptNote =
          'Receipt written to this file: syncReceipt and ' +
          stamped.pages +
          ' page(s), ' +
          stamped.format +
          '. An agent collects it with figma/push/use-figma/receipt.js, so you are done.';
      }
    } catch (error) {
      receiptNote =
        'Receipt not written: ' +
        String((error && error.message) || error) +
        ' The push and the snapshot are done. Use Download JSON and hand the file to an agent (pnpm figma:snapshot --ingest).';
    }
    show({
      ok: true,
      title: 'Synced ' + at + ': ' + report.line + warned,
      notes: report.changes.concat(report.warnings, [
        receiptNote,
        'Download JSON saves the snapshot for pnpm figma:snapshot --ingest.',
      ]),
      fileName: 'figma-snapshot.json',
      result: snap,
    });
  } catch (error) {
    show({ ok: false, error: String((error && error.message) || error) });
  }
}
