/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — turns the Figma model into code that runs inside Figma.
 *
 * Carriers of one runtime (scripts/lib/figma-runtime.mjs, copied minus
 * `export` and comments):
 *   - the Sync plugin (manifest.json + code.js + ui.html, hds#411, ADR-032): a
 *     local development plugin that carries no model. Its window fetches the
 *     sync bundle (buildSyncBundle) the Storybook deploy publishes, and its code
 *     (plus scripts/lib/figma-sync-runtime.mjs) checks it, checks the file,
 *     pushes, snapshots and stamps a receipt. Import it once in Figma desktop;
 *     its files change only when its code does, never with the tokens.
 *   - the promote plugin: the development plugin with the model baked in
 *     (buildDevPlugin), renamed, for library promotion and deliberate prunes.
 *     Its Push and Snapshot clear the Sync receipt (hds#417).
 *   - receipt.js (buildUseFigmaReceiptScript, hds#417): a read-only use_figma
 *     script that returns the Sync receipt's head, one page and a live
 *     fingerprint of staging, for `pnpm figma:snapshot --from-receipt`.
 *   - `use_figma` scripts for the remote Figma MCP server, one per collection plus
 *     one for styles, carrying only the out-of-scope variables they alias. An
 *     agent retypes each script into the `code` parameter, so the script checks
 *     two checksums before it reads or writes anything: one over its payload,
 *     one over the source of every runtime function. Only the closing call
 *     lines are not covered.
 *
 * Nothing here talks to Figma.
 */

import { readFileSync } from 'fs';
import { parse } from 'acorn';
import { hdsChecksum } from './figma-runtime.mjs';

/**
 * Push order: a collection's aliases point at collections in its own chunk or
 * an earlier one. Brand and Density ride with Semantic because the aliases run
 * both ways: Semantic variables alias Brand and Density, and a Brand base mode
 * holds the base token's own alias (often a Semantic variable).
 */
export const PUSH_CHUNKS = Object.freeze([
  { id: '01-primitive', scope: ['primitive'] },
  { id: '02-semantic', scope: ['semantic', 'brand', 'density'] },
  { id: '03-component', scope: ['component'] },
  { id: '04-role', scope: ['role'] },
  { id: '05-styles', scope: ['styles'] },
]);

/**
 * The runtime as a script body: the same code Node imports, minus `export` and
 * minus comments (they would only add size to every script).
 */
export function runtimeSource() {
  return scriptBody('./figma-runtime.mjs');
}

/**
 * The Sync plugin's own in-Figma code (figma-sync-runtime.mjs) as a script
 * body: minus `export`, comments and its import of the runtime, which code.js
 * carries just before it.
 */
export function syncRuntimeSource() {
  return scriptBody('./figma-sync-runtime.mjs');
}

/** The snapshot delta codec (figma-snapshot-delta.mjs) as a script body, for the Sync plugin's code.js. */
export function deltaRuntimeSource() {
  return scriptBody('./figma-snapshot-delta.mjs');
}

/** delta.js's own in-Figma code (figma-agent-runtime.mjs, hds#418) as a script body. */
export function agentRuntimeSource() {
  return scriptBody('./figma-agent-runtime.mjs');
}

/** A module in this folder as a plain script: no comments, no imports, no `export`. */
function scriptBody(fileName) {
  const source = readFileSync(new URL(fileName, import.meta.url), 'utf8');
  const cuts = [];
  const ast = parse(source, { ecmaVersion: 2020, sourceType: 'module', onComment: cuts });
  ast.body
    .filter((node) => node.type === 'ImportDeclaration')
    .forEach((node) => cuts.push({ start: node.start, end: node.end }));
  cuts.sort((a, b) => a.start - b.start);
  let code = '';
  let from = 0;
  for (const cut of cuts) {
    code += source.slice(from, cut.start);
    from = cut.end;
  }
  code += source.slice(from);
  return code
    .replace(/^export (async )?function /gm, (_m, isAsync) => `${isAsync ?? ''}function `)
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * The runtime's top-level functions exactly as a script carries them: each
 * name, and the source text `Function.prototype.toString` returns for it.
 */
export function runtimeFunctions(source = runtimeSource()) {
  return parse(source, { ecmaVersion: 2020, sourceType: 'script' })
    .body.filter((node) => node.type === 'FunctionDeclaration')
    .map((node) => ({ name: node.id.name, text: source.slice(node.start, node.end) }));
}

/**
 * The runtime functions a carrier actually runs: the transitive closure of its
 * entry points over the other functions' names, plus `hdsVerifyRuntime`, which
 * every carrier calls.
 *
 * A carrier that ships only the code it reaches is smaller to retype into
 * `use_figma` — the snapshot script drops from 37 KB to about 8 KB, well inside
 * the tool's 50,000-character `code` limit — and its checksum then covers
 * exactly what it executes rather than the whole push engine. The read-only
 * snapshot in particular no longer carries `hdsApply`, so a transcription
 * error in code it never calls cannot fail a snapshot, and the script a human
 * reads before running it is the script that runs.
 */
export function reachableRuntime(entries, source = runtimeSource()) {
  const all = runtimeFunctions(source);
  const byName = new Map(all.map((fn) => [fn.name, fn]));
  const reached = new Set();
  const queue = entries.concat(['hdsVerifyRuntime']);
  while (queue.length) {
    const name = queue.shift();
    if (reached.has(name) || !byName.has(name)) continue;
    reached.add(name);
    const body = byName.get(name).text;
    for (const other of byName.keys()) {
      if (other !== name && new RegExp(`\\b${other}\\b`).test(body)) queue.push(other);
    }
  }
  return all.filter((fn) => reached.has(fn.name));
}

/**
 * The runtime a carrier reaches, plus the statement that checks it. `prune`
 * (whether the carrier deletes) picks the plugin a refusal names.
 */
function verifiedRuntime(entries, prune) {
  const functions = reachableRuntime(entries);
  const names = functions.map((fn) => fn.name);
  const texts = functions.map((fn) => fn.text.replace(/\r/g, ''));
  return [
    functions.map((fn) => fn.text).join('\n\n'),
    '',
    `hdsVerifyRuntime([${names.join(', ')}], '${hdsChecksum(texts.join('\n'))}', ${prune === true});`,
  ].join('\n');
}

/** A JSON round trip gives the key order a JS engine will see when it parses the literal. */
const canonical = (value) => JSON.parse(JSON.stringify(value));

/**
 * The model reduced to what a scoped push needs. Of the variables outside the
 * scope, only their identity (path, name, type, codeSyntax) is kept, so the
 * push can find them in Figma: without prune, only those an in-scope alias or
 * text-style binding points at; with prune, all of them, so a variable the
 * model moved out of the scope is recognised as moved and never deleted.
 * Out-of-scope styles are dropped.
 */
function pushModel(model, scope, prune) {
  const inScope = (key) => !scope || scope.includes(key);
  const referenced = new Set();
  for (const c of model.collections.filter((c) => inScope(c.key))) {
    for (const v of c.variables) {
      for (const entry of Object.values(v.valuesByMode)) {
        if ('alias' in entry) referenced.add(entry.alias);
      }
    }
  }
  if (inScope('styles')) {
    for (const style of model.textStyles) {
      Object.values(style.boundVariables).forEach((path) => referenced.add(path));
    }
  }
  return {
    collections: model.collections.map((c) => ({
      key: c.key,
      name: c.name,
      modes: c.modes,
      hiddenFromPublishing: c.hiddenFromPublishing,
      variables: inScope(c.key)
        ? c.variables.map((v) => ({
            path: v.path,
            name: v.name,
            resolvedType: v.resolvedType,
            description: v.description,
            scopes: v.scopes,
            hiddenFromPublishing: v.hiddenFromPublishing,
            codeSyntax: v.codeSyntax,
            valuesByMode: v.valuesByMode,
          }))
        : c.variables
            .filter((v) => prune || referenced.has(v.path))
            .map((v) => ({
              path: v.path,
              name: v.name,
              resolvedType: v.resolvedType,
              codeSyntax: v.codeSyntax,
            })),
    })),
    textStyles: inScope('styles') ? model.textStyles : [],
    // tint and pairsWith document where an effect came from; Figma stores neither.
    effectStyles: inScope('styles')
      ? model.effectStyles.map(({ tint: _tint, pairsWith: _pairs, ...style }) => style)
      : [],
  };
}

/** The model's identity: what `lastPush.modelHash` in Figma is compared against. */
export function modelHash(model) {
  return hdsChecksum(JSON.stringify(canonical(model)));
}

/**
 * @param {object} model  The Figma model.
 * @param {{prune?: boolean, scope?: string[]|null, renames?: object, dryRun?: boolean}} [options]
 * @returns {{ payload: object, checksum: string }}
 */
export function buildPushPayload(
  model,
  { prune = false, scope = null, renames = {}, dryRun = false } = {},
) {
  const payload = canonical({
    modelHash: modelHash(model),
    options: { prune, scope, renames, dryRun },
    model: pushModel(model, scope, prune),
  });
  return { payload, checksum: hdsChecksum(JSON.stringify(payload)) };
}

const header = (lines) => lines.map((line) => `// ${line}`.trimEnd()).join('\n');

/**
 * A `use_figma` script: plain JavaScript with top-level await and return, as
 * the Figma MCP server expects.
 */
export function buildUseFigmaPushScript(model, options = {}, title = 'full push') {
  const { payload, checksum } = buildPushPayload(model, options);
  return [
    header([
      `HDS figma:push — ${title}. Generated by \`pnpm figma:push\`; run it unmodified.`,
      `Model ${payload.modelHash} · prune ${payload.options.prune} · dry run ${payload.options.dryRun}`,
    ]),
    `const PAYLOAD = ${JSON.stringify(payload)};`,
    `const CHECKSUM = '${checksum}';`,
    '',
    verifiedRuntime(['hdsRunPush'], payload.options.prune),
    'return await hdsRunPush(figma, PAYLOAD, CHECKSUM);',
    '',
  ].join('\n');
}

export function buildUseFigmaSnapshotScript() {
  return [
    header([
      'HDS figma:snapshot. Generated by `pnpm figma:snapshot`; run it unmodified.',
      'Save the returned JSON to a file, then: pnpm figma:snapshot --ingest <file>',
    ]),
    '',
    verifiedRuntime(['hdsRunSnapshot'], false),
    'return await hdsRunSnapshot(figma);',
    '',
  ].join('\n');
}

// ── Development plugin ───────────────────────────────────────────────────────
const PLUGIN_UI = `<!doctype html>
<meta charset="utf-8" />
<style>
  body { margin: 0; padding: 12px; font: 12px/1.5 system-ui, sans-serif;
    background: var(--figma-color-bg); color: var(--figma-color-text); }
  h1 { font-size: 13px; margin: 0 0 8px; }
  textarea { box-sizing: border-box; width: 100%; height: 380px; font: 11px/1.4 ui-monospace, monospace;
    background: var(--figma-color-bg-secondary); color: var(--figma-color-text);
    border: 1px solid var(--figma-color-border); border-radius: 4px; }
  .row { display: flex; gap: 8px; margin-top: 8px; }
  button { font: inherit; padding: 4px 12px; border-radius: 4px; cursor: pointer;
    border: 1px solid var(--figma-color-border); background: var(--figma-color-bg); color: var(--figma-color-text); }
  .error { color: var(--figma-color-text-danger); }
</style>
<h1 id="title">Running…</h1>
<textarea id="out" readonly></textarea>
<div class="row">
  <button id="copy">Copy</button>
  <button id="save">Download JSON</button>
  <button id="close">Close</button>
</div>
<script>
  const out = document.getElementById('out');
  const title = document.getElementById('title');
  let fileName = 'hds-figma-result.json';
  onmessage = (event) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;
    if (!msg.ok) {
      title.textContent = 'Push or snapshot failed';
      title.className = 'error';
      out.value = msg.error;
      return;
    }
    title.textContent = msg.title;
    fileName = msg.fileName;
    out.value = JSON.stringify(msg.result, null, 2);
  };
  document.getElementById('copy').onclick = () => { out.select(); document.execCommand('copy'); };
  document.getElementById('save').onclick = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([out.value], { type: 'application/json' }));
    link.download = fileName;
    link.click();
  };
  document.getElementById('close').onclick = () => parent.postMessage({ pluginMessage: 'close' }, '*');
</script>
`;

/**
 * A local development plugin (Plugins → Development → Import plugin from
 * manifest) with the model baked in. Its prune command exists only when
 * generated with prune. Push (before it writes) and Take snapshot clear the
 * Sync receipt (`syncReceipt` and its pages, hds#417), so a receipt never
 * outlives a write it does not describe; a file with none gets no write.
 * `pnpm figma:push` writes it only as the promote plugin (buildPromotePlugin),
 * whose id does not collide with the Sync plugin's.
 *
 * @returns {Record<string, string>} file name → contents
 */
export function buildDevPlugin(model, { prune = false, renames = {} } = {}) {
  const { payload, checksum } = buildPushPayload(model, { prune, renames });
  const menu = [
    { name: 'Plan push (dry run, writes nothing)', command: 'plan' },
    { name: prune ? 'Push and prune extras (deletes)' : 'Push', command: 'push' },
    { separator: true },
    { name: 'Take snapshot', command: 'snapshot' },
  ];
  const manifest = {
    name: 'HDS tokens sync (development)',
    id: 'hds-tokens-sync-dev',
    api: '1.0.0',
    main: 'code.js',
    ui: 'ui.html',
    editorType: ['figma'],
    documentAccess: 'dynamic-page',
    networkAccess: { allowedDomains: ['none'] },
    menu,
  };
  const code = [
    header([
      'HDS tokens sync — development plugin. Generated by `pnpm figma:push`; do not edit.',
      `Model ${payload.modelHash} · prune ${prune}`,
    ]),
    `const PAYLOAD = ${JSON.stringify(payload)};`,
    `const CHECKSUM = '${checksum}';`,
    '',
    runtimeSource(),
    '',
    `figma.showUI(__html__, { width: 560, height: 500, themeColors: true });
figma.ui.onmessage = (message) => {
  if (message === 'close') figma.closePlugin();
};
function hdsClearSyncReceipt() {
  const keys = ['syncReceipt'];
  for (let i = 0; i < ${SYNC_MAX_PAGES}; i++) keys.push('syncSnapshot.' + i);
  keys.forEach((key) => hdsGetKey(figma.root, key) && hdsSetKey(figma.root, key, ''));
}
(async () => {
  try {
    if (figma.command === 'snapshot') {
      const result = await hdsRunSnapshot(figma);
      hdsClearSyncReceipt();
      figma.ui.postMessage({ ok: true, title: 'Snapshot — download it, then run pnpm figma:snapshot --ingest <file>', fileName: 'figma-snapshot.json', result });
      return;
    }
    const dryRun = figma.command !== 'push';
    if (!dryRun) hdsClearSyncReceipt();
    const result = await hdsRunPush(figma, PAYLOAD, CHECKSUM, { dryRun });
    const warned = result.warnings.length ? ' · ' + result.warnings.length + ' warning(s): read them below' : '';
    figma.ui.postMessage({ ok: true, title: (dryRun ? 'Plan (nothing written): ' : 'Pushed: ') + result.line + warned, fileName: dryRun ? 'figma-push-plan.json' : 'figma-push-report.json', result });
  } catch (error) {
    figma.ui.postMessage({ ok: false, error: String((error && error.message) || error) });
  }
})();
`,
  ].join('\n');
  return {
    'manifest.json': `${JSON.stringify(manifest, null, 2)}\n`,
    'code.js': code,
    'ui.html': PLUGIN_UI,
  };
}

/**
 * Today's baked development plugin under its own id and name, so it can sit
 * next to the Sync plugin in Figma: "HDS tokens promote (baked)". Its code and
 * window are buildDevPlugin's, byte for byte. Use it only to promote staging
 * into the library (ADR-026 §2) or for a deliberate prune; the Sync plugin
 * does neither.
 *
 * @returns {Record<string, string>} file name → contents
 */
export function buildPromotePlugin(model, options = {}) {
  const files = buildDevPlugin(model, options);
  const manifest = JSON.parse(files['manifest.json']);
  manifest.name = 'HDS tokens promote (baked)';
  manifest.id = 'hds-tokens-promote-dev';
  return { ...files, 'manifest.json': `${JSON.stringify(manifest, null, 2)}\n` };
}

// ── Sync plugin (hds#411, ADR-032) ───────────────────────────────────────────
/** Where the Storybook deploy serves the sync bundle, under its storybookUrl. */
export const SYNC_BUNDLE_PATH = 'figma/sync-bundle.json';
export const SYNC_BUNDLE_SCHEMA_VERSION = 1;
const SYNC_FETCH_TIMEOUT_MS = 45000;
/** Receipt pages (hds#417): raw JSON up to SYNC_RAW_CHARS, else gzip + base64; pages of SYNC_PAGE_CHARS. */
const SYNC_RAW_CHARS = 12000;
const SYNC_PAGE_CHARS = 15000;
/** The most receipt pages Sync writes, and the most the promote plugin clears. */
const SYNC_MAX_PAGES = 64;
const SYNC_GZIP_TIMEOUT_MS = 20000;
/** code.js's PLUGIN_BUILD line holds this while the build is computed, so the build can cover code.js itself. */
const PLUGIN_BUILD_PLACEHOLDER = '--------';
const PLUGIN_BUILD_LINE = /^const PLUGIN_BUILD = '[^'\n]*';$/m;

/**
 * What the Sync plugin bakes in from figma/links.json: the one host it may
 * fetch from and the files it may and may not write to. Refuses, before
 * anything is built, a links file that would give the plugin no safe target:
 * a missing or equal staging and library key, a missing file name, or a
 * Storybook URL that is not https.
 */
export function syncConfigFromLinks(links = {}) {
  const fix = ' Set it in figma/links.json (ADR-026, ADR-032), then run pnpm figma:push again.';
  for (const field of ['stagingFileKey', 'libraryFileKey', 'stagingFileName', 'libraryFileName']) {
    if (typeof links[field] !== 'string' || !links[field]) {
      throw new Error(
        `figma/links.json has no ${field}, so the Sync plugin would have no safe file to write to. Nothing was built.${fix}`,
      );
    }
  }
  if (links.stagingFileKey === links.libraryFileKey) {
    throw new Error(
      `figma/links.json: stagingFileKey equals libraryFileKey (${links.libraryFileKey}), so the Sync plugin would write to the published library. Nothing was built.${fix}`,
    );
  }
  if (links.stagingFileName === links.libraryFileName) {
    throw new Error(
      `figma/links.json: stagingFileName equals libraryFileName ("${links.libraryFileName}"), so names cannot tell staging from the library. Nothing was built.${fix}`,
    );
  }
  let origin = null;
  try {
    origin = new URL(links.storybookUrl).origin;
  } catch {
    origin = null;
  }
  if (!origin || !origin.startsWith('https://')) {
    throw new Error(
      `figma/links.json has no https storybookUrl, so the Sync plugin has no host to fetch its bundle from. Nothing was built.${fix}`,
    );
  }
  return {
    schemaVersion: SYNC_BUNDLE_SCHEMA_VERSION,
    origin,
    bundleUrl: `${links.storybookUrl.replace(/\/+$/, '')}/${SYNC_BUNDLE_PATH}`,
    stagingFileKey: links.stagingFileKey,
    libraryFileKey: links.libraryFileKey,
    stagingFileName: links.stagingFileName,
    libraryFileName: links.libraryFileName,
    fetchTimeoutMs: SYNC_FETCH_TIMEOUT_MS,
    rawChars: SYNC_RAW_CHARS,
    pageChars: SYNC_PAGE_CHARS,
    maxPages: SYNC_MAX_PAGES,
    gzipTimeoutMs: SYNC_GZIP_TIMEOUT_MS,
  };
}

/**
 * The Sync plugin's build: hdsChecksum of its code.js + ui.html +
 * manifest.json, read with code.js's own PLUGIN_BUILD line blanked (a file
 * cannot hold its own checksum). code.js carries the result, and the bundle
 * names the build main expects, so a stale copy of any of the three files is
 * caught before Sync reads anything.
 */
export function syncPluginBuild(files) {
  const code = files['code.js'].replace(
    PLUGIN_BUILD_LINE,
    `const PLUGIN_BUILD = '${PLUGIN_BUILD_PLACEHOLDER}';`,
  );
  return hdsChecksum(code + files['ui.html'] + files['manifest.json']);
}

const SYNC_UI = `<!doctype html>
<meta charset="utf-8" />
<style>
  body { margin: 0; padding: 12px; font: 12px/1.5 system-ui, sans-serif;
    background: var(--figma-color-bg); color: var(--figma-color-text); }
  h1 { font-size: 13px; margin: 0 0 8px; }
  pre { white-space: pre-wrap; margin: 0 0 8px; max-height: 140px; overflow: auto; }
  textarea, input { box-sizing: border-box; width: 100%; font: 11px/1.4 ui-monospace, monospace;
    background: var(--figma-color-bg-secondary); color: var(--figma-color-text);
    border: 1px solid var(--figma-color-border); border-radius: 4px; }
  textarea { height: 260px; }
  input { padding: 4px 6px; margin: 4px 0 8px; }
  .row { display: flex; gap: 8px; margin-top: 8px; }
  button { font: inherit; padding: 4px 12px; border-radius: 4px; cursor: pointer;
    border: 1px solid var(--figma-color-border); background: var(--figma-color-bg); color: var(--figma-color-text); }
  .error { color: var(--figma-color-text-danger); }
</style>
<h1 id="title">Working…</h1>
<div id="mark" hidden>
  <input id="key" placeholder="Staging file key" />
  <button id="markGo">Mark this file</button>
</div>
<pre id="notes"></pre>
<textarea id="out" readonly></textarea>
<div class="row">
  <button id="copy">Copy</button>
  <button id="save">Download JSON</button>
  <button id="close">Close</button>
</div>
<script>
  const byId = (id) => document.getElementById(id);
  const send = (message) => parent.postMessage({ pluginMessage: message }, '*');
  let fileName = 'hds-figma-result.json';
  // The bundle is data: its text goes back to the plugin, which only ever JSON.parses it.
  async function fetchBundle(url) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 30000) : null;
    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller ? controller.signal : undefined });
      const text = await response.text();
      send({ type: 'fetched', url: url, status: response.status, text: text });
    } catch (error) {
      send({ type: 'fetched', url: url, error: String((error && error.message) || error) });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  // The receipt pages (hds#417): gzip at CompressionStream's default level, then base64.
  async function gzipBase64(text) {
    if (typeof CompressionStream !== 'function') throw new Error('this window has no CompressionStream');
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return btoa(binary);
  }
  onmessage = (event) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;
    if (msg.type === 'gzip') {
      gzipBase64(msg.text).then(
        (text) => send({ type: 'gzipped', text: text }),
        (error) => send({ type: 'gzipped', error: String((error && error.message) || error) }),
      );
      return;
    }
    if (msg.type === 'fetch') {
      byId('title').textContent = 'Fetching ' + msg.url + '…';
      fetchBundle(msg.url);
      return;
    }
    if (msg.type === 'mark-form') {
      byId('title').textContent = msg.title;
      byId('mark').hidden = false;
      byId('key').focus();
      return;
    }
    if (msg.type !== 'result') return;
    byId('mark').hidden = true;
    if (!msg.ok) {
      byId('title').textContent = 'Refused or failed: nothing past this point ran';
      byId('title').className = 'error';
      byId('notes').textContent = '';
      byId('out').value = msg.error;
      return;
    }
    byId('title').textContent = msg.title;
    byId('notes').textContent = (msg.notes || []).join('\\n');
    fileName = msg.fileName;
    byId('out').value = JSON.stringify(msg.result, null, 2);
  };
  byId('markGo').onclick = () => send({ type: 'mark', key: byId('key').value });
  byId('copy').onclick = () => { byId('out').select(); document.execCommand('copy'); };
  byId('save').onclick = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([byId('out').value], { type: 'application/json' }));
    link.download = fileName;
    link.click();
  };
  byId('close').onclick = () => send('close');
</script>
`;

/**
 * The Sync plugin (figma/push/plugin/): same id as the plugin Figma already
 * imported, so overwriting its three files is enough. It carries no model and
 * may reach one origin, the Storybook deploy; where it may write is baked in
 * from figma/links.json (syncConfigFromLinks), never read from the bundle.
 *
 * @param {object} links  figma/links.json
 * @returns {Record<string, string>} file name → contents
 */
export function buildSyncPlugin(links) {
  const sync = syncConfigFromLinks(links);
  const { origin, ...baked } = sync;
  const manifest = `${JSON.stringify(
    {
      name: 'HDS tokens sync',
      id: 'hds-tokens-sync-dev',
      api: '1.0.0',
      main: 'code.js',
      ui: 'ui.html',
      editorType: ['figma'],
      documentAccess: 'dynamic-page',
      // figma.fileKey is only exposed to private and development plugins that ask for it.
      enablePrivatePluginApi: true,
      networkAccess: {
        allowedDomains: [origin],
        reasoning: `Fetches the HDS token sync bundle (data only, never code) that the Storybook deploy publishes at ${sync.bundleUrl}.`,
      },
      menu: [
        { name: 'Sync', command: 'sync' },
        { name: 'Plan (dry run)', command: 'plan' },
        { separator: true },
        { name: 'Check this file', command: 'check' },
        { name: 'Mark this file as HDS staging', command: 'mark' },
      ],
    },
    null,
    2,
  )}\n`;
  const code = (build) =>
    [
      header([
        'HDS tokens sync — the Sync plugin. Generated by `pnpm figma:push`; do not edit.',
        `It carries no model: Sync fetches it from ${sync.bundleUrl}.`,
      ]),
      `const SYNC = Object.freeze(${JSON.stringify(baked)});`,
      `const PLUGIN_BUILD = '${build}';`,
      '',
      runtimeSource(),
      '',
      deltaRuntimeSource(),
      '',
      syncRuntimeSource(),
      '',
      'hdsSyncMain(figma, SYNC, PLUGIN_BUILD, __html__, snapshotDelta);',
      '',
    ].join('\n');
  const build = syncPluginBuild({
    'code.js': code(PLUGIN_BUILD_PLACEHOLDER),
    'ui.html': SYNC_UI,
    'manifest.json': manifest,
  });
  return { 'manifest.json': manifest, 'code.js': code(build), 'ui.html': SYNC_UI };
}

/**
 * The sync bundle the Storybook deploy serves (SYNC_BUNDLE_PATH): data only.
 * `payload` is a full push that never prunes, `checksum` its hdsChecksum,
 * `pluginBuild` the Sync plugin build main expects (with `pluginFiles`, each
 * file's checksum, so a refusal can name the code.js to expect), and `base`
 * the committed figma/snapshot.json (null when none), which the receipt
 * pages of hds#397 C2 will be a delta against.
 *
 * @param {object} model
 * @param {{ renames?: object, commit: string, base?: object|null, pluginFiles: Record<string, string> }} options
 */
export function buildSyncBundle(model, { renames = {}, commit, base = null, pluginFiles }) {
  if (typeof commit !== 'string' || !/^[0-9a-f]{7,40}$/.test(commit)) {
    throw new Error(
      `The sync bundle needs the commit it is built from (7 to 40 hex digits), got ${JSON.stringify(commit)}.`,
    );
  }
  const { payload, checksum } = buildPushPayload(model, { prune: false, scope: null, renames });
  return {
    schemaVersion: SYNC_BUNDLE_SCHEMA_VERSION,
    commit,
    modelHash: payload.modelHash,
    payload,
    checksum,
    pluginBuild: syncPluginBuild(pluginFiles),
    pluginFiles: Object.fromEntries(
      ['code.js', 'ui.html', 'manifest.json'].map((name) => [name, hdsChecksum(pluginFiles[name])]),
    ),
    base,
  };
}

// ── Receipt collector (hds#417) ──────────────────────────────────────────────
/**
 * figma/push/use-figma/receipt.js: what an agent runs through use_figma to
 * collect a Sync. Its first statement refuses, before it reads anything else,
 * unless figma.fileKey is the staging key baked from figma/links.json (and is
 * not the library key). Then it reads only: the `syncReceipt` head, page PAGE
 * (an agent sets 0, then 1 … up to the head's pages - 1), and a cheap live
 * fingerprint of the file (root lastPush; collection, mode, variable and
 * style counts) that `--from-receipt` checks the receipt against. At most
 * 1,500 characters.
 *
 * @param {object} links  figma/links.json
 */
export function buildUseFigmaReceiptScript(links) {
  const sync = syncConfigFromLinks(links);
  return [
    `if (figma.fileKey !== '${sync.stagingFileKey}' || figma.fileKey === '${sync.libraryFileKey}') {`,
    `  throw new Error('Refused: this is not the HDS staging file (${sync.stagingFileKey}). receipt.js reads staging only. Nothing was read.');`,
    '}',
    header([
      'HDS sync receipt collector (hds#417). Generated by `pnpm figma:push`; reads only.',
      'Run it as generated (PAGE 0); when the head says pages > 1, again with PAGE 1, 2 …',
      'Save each result, then: pnpm figma:snapshot --from-receipt <files...>',
    ]),
    'const PAGE = 0;',
    "const get = (key) => figma.root.getSharedPluginData('hirobius', key);",
    'const collections = await figma.variables.getLocalVariableCollectionsAsync();',
    'return {',
    '  file: figma.fileKey,',
    '  page: PAGE,',
    "  head: get('syncReceipt'),",
    "  text: get('syncSnapshot.' + PAGE),",
    '  live: {',
    "    lastPush: get('lastPush'),",
    '    collections: collections.length,',
    '    modes: collections.reduce((n, c) => n + c.modes.length, 0),',
    '    variables: (await figma.variables.getLocalVariablesAsync()).length,',
    '    textStyles: (await figma.getLocalTextStylesAsync()).length,',
    '    effectStyles: (await figma.getLocalEffectStylesAsync()).length,',
    '  },',
    '};',
    '',
  ].join('\n');
}
