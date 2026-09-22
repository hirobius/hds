/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — turns the Figma model into code that runs inside Figma.
 *
 * Two carriers, one runtime (scripts/lib/figma-runtime.mjs, copied minus
 * `export` and comments):
 *   - a local development plugin (manifest.json + code.js + ui.html). Import it
 *     once in Figma desktop; nothing passes through a chat transcript, and it is
 *     the only plugin a Professional plan can run privately.
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
  const source = readFileSync(new URL('./figma-runtime.mjs', import.meta.url), 'utf8');
  const comments = [];
  parse(source, { ecmaVersion: 2020, sourceType: 'module', onComment: comments });
  let code = '';
  let from = 0;
  for (const comment of comments) {
    code += source.slice(from, comment.start);
    from = comment.end;
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

/** The runtime a carrier reaches, plus the statement that checks it. */
function verifiedRuntime(entries) {
  const functions = reachableRuntime(entries);
  const names = functions.map((fn) => fn.name);
  const texts = functions.map((fn) => fn.text.replace(/\r/g, ''));
  return [
    functions.map((fn) => fn.text).join('\n\n'),
    '',
    `hdsVerifyRuntime([${names.join(', ')}], '${hdsChecksum(texts.join('\n'))}');`,
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
    verifiedRuntime(['hdsRunPush']),
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
    verifiedRuntime(['hdsRunSnapshot']),
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
 * manifest). Its prune command exists only when generated with prune.
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
(async () => {
  try {
    if (figma.command === 'snapshot') {
      const result = await hdsRunSnapshot(figma);
      figma.ui.postMessage({ ok: true, title: 'Snapshot — download it, then run pnpm figma:snapshot --ingest <file>', fileName: 'figma-snapshot.json', result });
      return;
    }
    const dryRun = figma.command !== 'push';
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
