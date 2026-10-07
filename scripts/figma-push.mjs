#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — `pnpm figma:push`
 *
 * Code → Figma, one way. Builds the Figma model from hirobius.tokens.json and
 * writes the code that upserts it into a Figma file, to figma/push/ (generated,
 * gitignored). Nothing here talks to Figma; a person or an agent runs the
 * output inside Figma. See figma/README.md for the runbook.
 *
 *   figma/push/plugin/            the Sync plugin: Sync · Plan · Check this file · Mark
 *                                 (no model inside; it fetches the sync bundle, ADR-032)
 *   figma/push/promote/           HDS tokens promote (baked): Plan push · Push · Take snapshot,
 *                                 with the model baked in, for a deliberate prune (Adrian runs it)
 *   figma/push/use-figma/NN-*.js  use_figma scripts for the Figma MCP server, run in order
 *   figma/push/use-figma/snapshot.js
 *   figma/push/use-figma/receipt.js  reads a Sync's receipt from the library, for
 *                                 pnpm figma:snapshot --from-receipt (hds#417)
 *   figma/push/use-figma/delta.js    with --delta only: the zero-click agent sync
 *                                 (hds#418), one use_figma call that applies the
 *                                 change since figma/snapshot.json to the library
 *
 * A push matches by token path (then TOKEN_MIGRATION.md renames, codeSyntax,
 * name), updates before it creates, renames a collection's initial mode, and
 * deletes nothing unless built with --prune. It re-reads the file afterwards
 * and fails if Figma still differs from the model. The Sync plugin never
 * prunes, whatever the flags.
 *
 * Usage:
 *   pnpm figma:push            write the carriers
 *   pnpm figma:push --prune    promote plugin and use_figma scripts that also
 *                              delete variables, styles and modes the model does
 *                              not own
 *   pnpm figma:push --plan     also print what a push would change against the
 *                              committed figma/snapshot.json
 *   pnpm figma:push --delta    also write use-figma/delta.js for the change since
 *                              figma/snapshot.json, or refuse and route it to Sync
 *                              (figma/README.md "Agent sync (zero clicks)")
 *   node scripts/figma-push.mjs --bundle <out>
 *                              write only the sync bundle the Sync plugin fetches
 *                              (the Vercel build writes it to
 *                              storybook-static/figma/sync-bundle.json). Needs no
 *                              secret and no network; the commit comes from
 *                              VERCEL_GIT_COMMIT_SHA, else git.
 */

import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { loadFigmaInputs } from './lib/figma-inputs.mjs';
import {
  PUSH_CHUNKS,
  buildPromotePlugin,
  buildSyncBundle,
  buildSyncPlugin,
  buildUseFigmaPushScript,
  buildUseFigmaReceiptScript,
  buildUseFigmaSnapshotScript,
  modelHash,
  syncPluginBuild,
} from './lib/figma-scripts.mjs';
import {
  hdsDescribePlan,
  hdsPlan,
  hdsPlanWarnings,
  hdsSummarize,
  hdsSummaryLine,
} from './lib/figma-runtime.mjs';
import { parseSnapshotFile } from './lib/figma-snapshot.mjs';
import {
  DELTA_MAX_CHARS,
  DELTA_PRUNE_REFUSAL,
  buildUseFigmaDeltaScript,
} from './lib/figma-agent-sync.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** figma/links.json, or {} when the root has none (the Sync plugin then refuses to build). */
export function readLinks(root) {
  const path = join(root, 'figma', 'links.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
}

/**
 * Builds and validates the model and the Sync plugin's file guard, then
 * (re)writes every carrier under outDir. Throws before writing anything when
 * the model breaks an invariant, or when figma/links.json gives the Sync
 * plugin no safe target (no library key or name, or a retired file that is the library).
 *
 * @param {{ root: string, outDir: string, prune?: boolean }} options
 * @returns {{ model: object, renames: object, prune: boolean, pluginBuild: string, files: Array<{path: string, bytes: number}> }}
 */
export function writePushArtifacts({ root, outDir, prune = false }) {
  const { model, renames } = loadFigmaInputs(root);
  const links = readLinks(root);
  const sync = buildSyncPlugin(links);
  const outputs = [
    ...Object.entries(sync).map(([name, text]) => [join('plugin', name), text]),
    ...Object.entries(buildPromotePlugin(model, { prune, renames })).map(([name, text]) => [
      join('promote', name),
      text,
    ]),
  ];
  for (const chunk of PUSH_CHUNKS) {
    outputs.push([
      join('use-figma', `${chunk.id}.js`),
      buildUseFigmaPushScript(model, { scope: chunk.scope, prune, renames }, chunk.id),
    ]);
  }
  outputs.push([join('use-figma', 'snapshot.js'), buildUseFigmaSnapshotScript()]);
  outputs.push([join('use-figma', 'receipt.js'), buildUseFigmaReceiptScript(links)]);

  rmSync(outDir, { recursive: true, force: true });
  const files = outputs.map(([path, text]) => {
    mkdirSync(dirname(join(outDir, path)), { recursive: true });
    writeFileSync(join(outDir, path), text);
    return { path: path.replaceAll('\\', '/'), bytes: Buffer.byteLength(text) };
  });
  return { model, renames, prune, pluginBuild: syncPluginBuild(sync), files };
}

/** HEAD of the git checkout at `root`, or null outside one (a Vercel build has no .git). */
function gitHead(root = ROOT) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * The commit a sync bundle is built from: Vercel's system variable
 * VERCEL_GIT_COMMIT_SHA (not a secret), else `git rev-parse HEAD`. Throws,
 * naming the fix, when neither is there: a bundle that cannot say which
 * commit it carries is not written.
 */
export function resolveBundleCommit({ env = process.env, git = gitHead } = {}) {
  const commit = env.VERCEL_GIT_COMMIT_SHA || git();
  if (commit) return commit;
  throw new Error(
    'cannot tell which commit the bundle is built from: VERCEL_GIT_COMMIT_SHA is not set and git rev-parse HEAD failed. On Vercel, turn on Settings → Environment Variables → "Automatically expose System Environment Variables" (https://vercel.com/adrian-6234s-projects/hirobius-design-system/settings/environment-variables); locally, run inside the git checkout.',
  );
}

/**
 * Writes the sync bundle (figma-scripts.mjs buildSyncBundle) to `out`: the
 * full push payload, never a prune, the Sync plugin build main expects, and
 * the committed figma/snapshot.json as its base. Refuses, writing nothing,
 * whatever writePushArtifacts refuses.
 *
 * @param {{ root: string, out: string, commit: string }} options
 * @returns {{ bundle: object, bytes: number }}
 */
export function writeSyncBundle({ root, out, commit }) {
  const { model, renames } = loadFigmaInputs(root);
  const pluginFiles = buildSyncPlugin(readLinks(root));
  const snapshotPath = join(root, 'figma', 'snapshot.json');
  const base = existsSync(snapshotPath)
    ? parseSnapshotFile(readFileSync(snapshotPath, 'utf8'))
    : null;
  const bundle = buildSyncBundle(model, { renames, commit, base, pluginFiles });
  const text = JSON.stringify(bundle);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  return { bundle, bytes: Buffer.byteLength(text) };
}

/**
 * `pnpm figma:push --delta`: builds delta.js for the change from the
 * committed figma/snapshot.json to the model
 * (scripts/lib/figma-agent-sync.mjs), then writes every carrier and it.
 * Throws, writing no file and leaving no delta.js (not even an earlier one),
 * when the builder refuses or anything before it fails; writes the carriers
 * but no delta.js when there is nothing to sync.
 *
 * @param {{ root: string, outDir: string, commit: string }} options
 */
export function writeDeltaScript({ root, outDir, commit }) {
  const path = join(outDir, 'use-figma', 'delta.js');
  rmSync(path, { force: true });
  const { model, renames } = loadFigmaInputs(root);
  const snapshotPath = join(root, 'figma', 'snapshot.json');
  const snapshotFile = existsSync(snapshotPath)
    ? parseSnapshotFile(readFileSync(snapshotPath, 'utf8'))
    : null;
  const built = buildUseFigmaDeltaScript(model, {
    renames,
    snapshotFile,
    links: readLinks(root),
    commit,
  });
  writePushArtifacts({ root, outDir });
  if (built.text) writeFileSync(path, built.text);
  return { ...built, path, shown: relative(root, path).replaceAll('\\', '/') };
}

/**
 * `pnpm figma:push --delta [--prune]`: what it prints, or throws why it
 * refused. It removes any earlier delta.js first, so a refusal or failure
 * leaves none. `resolveCommit` names the commit delta.js is built from.
 *
 * @param {{ root?: string, prune?: boolean, resolveCommit?: () => string }} [options]
 * @returns {string}
 */
export function runDeltaCommand({
  root = ROOT,
  prune = false,
  resolveCommit = resolveBundleCommit,
} = {}) {
  const outDir = join(root, 'figma', 'push');
  // First, before any step that can fail: no refusal leaves an earlier delta.js behind.
  rmSync(join(outDir, 'use-figma', 'delta.js'), { force: true });
  if (prune) throw new Error(DELTA_PRUNE_REFUSAL);
  return formatDeltaRun(writeDeltaScript({ root, outDir, commit: resolveCommit() }));
}

/** What `pnpm figma:push --delta` prints for writeDeltaScript's result. */
export function formatDeltaRun(result) {
  if (!result.text) return `figma:push --delta — ${result.nothing}`;
  return [
    `figma:push --delta — ${result.shown} (${result.chars.toLocaleString('en-US')} of ${DELTA_MAX_CHARS.toLocaleString('en-US')} chars): ${result.line}`,
    `  against figma/snapshot.json ${result.base}; model ${result.modelHash}; commit ${result.commit.slice(0, 7)}`,
    ...result.changes.map((change) => `    ${change}`),
    ...result.warnings.map((warning) => `    ⚠ ${warning}`),
    '',
    `  Next: log the call in figma/MCP-LEDGER.md, then pass delta.js unmodified to one use_figma call on the library ${result.library}.`,
    '  Save what it returns and run pnpm figma:snapshot --from-receipt <file> (when it returns only the head, first run',
    '  use-figma/receipt.js once per page). On a refusal: stop, never retry. Runbook: figma/README.md "Agent sync (zero clicks)".',
  ].join('\n');
}

/** What a push would change, judged against a snapshot instead of the live file. */
export function planAgainstSnapshot({ model, renames, snapshotFile, prune = false }) {
  const plan = hdsPlan(model, snapshotFile.snapshot, { prune, renames });
  return {
    line: hdsSummaryLine(hdsSummarize(plan)),
    changes: hdsDescribePlan(plan),
    warnings: hdsPlanWarnings(plan),
    plan,
  };
}

function formatRun({ model, prune, files, pluginBuild }, outDir) {
  const kb = (bytes) => `${Math.ceil(bytes / 1024)} KB`;
  const rel = relative(ROOT, outDir).replaceAll('\\', '/');
  const sizeOf = (path) => files.find((f) => f.path === path).bytes;
  const scripts = files.filter(
    (f) => f.path.startsWith('use-figma/') && /\/\d\d-[^/]+\.js$/.test(f.path),
  );
  return [
    `figma:push — carriers written to ${rel}/ (model ${modelHash(model)}, prune ${prune ? 'ON: deletes extras' : 'off'})`,
    '',
    `  Sync plugin (build ${pluginBuild}; code.js ${sizeOf('plugin/code.js').toLocaleString('en-US')} B, no model inside):`,
    `    ${rel}/plugin/  →  overwrite manifest.json, code.js and ui.html in the folder Figma imported "HDS tokens sync" from.`,
    '    In the library: Plugins → Development → HDS tokens sync → Sync. It fetches the model the Storybook deploy publishes,',
    '    so these files change only when the plugin build above does. It never prunes.',
    '',
    '  Promote plugin, model baked in (deliberate prunes only, run by Adrian):',
    `    Figma desktop → Plugins → Development → Import plugin from manifest… → ${rel}/promote/manifest.json`,
    '    Run "Plan push (dry run, writes nothing)", read the plan, then run the push command.',
    '',
    '  use_figma (Figma MCP server), in order and unmodified; a script whose payload or runtime code changed stops before it reads or writes:',
    ...scripts.map((f) => `    ${rel}/${f.path}  (${kb(f.bytes)})`),
    '',
    '  Then take a snapshot (pnpm figma:snapshot) and run pnpm check:figma-drift.',
    '',
    `  After a Sync, an agent collects its receipt with ${rel}/use-figma/receipt.js (reads only; figma/README.md "Agent: collect a sync").`,
  ].join('\n');
}

function runBundle(args) {
  const at = args.indexOf('--bundle');
  const out = args[at + 1];
  if (!out || out.startsWith('--')) {
    throw new Error(
      '--bundle needs an output path, e.g. --bundle storybook-static/figma/sync-bundle.json.',
    );
  }
  if (args.includes('--prune')) {
    throw new Error(
      'the sync bundle never prunes, so --bundle refuses --prune. A deliberate prune uses the promote plugin (pnpm figma:push --prune).',
    );
  }
  const path = resolve(process.cwd(), out);
  const { bundle, bytes } = writeSyncBundle({
    root: ROOT,
    out: path,
    commit: resolveBundleCommit(),
  });
  console.log(
    `figma:push --bundle — ${relative(process.cwd(), path).replaceAll('\\', '/')} (${bytes.toLocaleString('en-US')} B): commit ${bundle.commit.slice(0, 7)}, model ${bundle.modelHash}, Sync plugin build ${bundle.pluginBuild}, base ${bundle.base ? bundle.base.checksum : 'none'}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--bundle')) {
    try {
      runBundle(args);
    } catch (error) {
      console.error(`✗ figma:push --bundle — ${error.message}`);
      console.error(
        '  The Figma Sync plugin fetches this file from the deployed Storybook, so the build stops here instead of deploying without it. Fix the cause above, then redeploy.',
      );
      process.exit(1);
    }
  } else if (args.includes('--delta')) {
    try {
      console.log(runDeltaCommand({ prune: args.includes('--prune') }));
    } catch (error) {
      console.error(`✗ figma:push --delta — ${error.message}`);
      process.exit(1);
    }
  } else {
    const outDir = join(ROOT, 'figma', 'push');
    try {
      const result = writePushArtifacts({ root: ROOT, outDir, prune: args.includes('--prune') });
      console.log(formatRun(result, outDir));
      if (args.includes('--plan')) {
        const snapshotPath = join(ROOT, 'figma', 'snapshot.json');
        console.log('');
        if (!existsSync(snapshotPath)) {
          console.log('  --plan: no figma/snapshot.json yet, so there is nothing to plan against.');
        } else {
          const snapshotFile = parseSnapshotFile(readFileSync(snapshotPath, 'utf8'));
          const { line, changes, warnings } = planAgainstSnapshot({ ...result, snapshotFile });
          console.log(
            `  Against figma/snapshot.json (taken ${snapshotFile.snapshot.takenAt}): ${line}`,
          );
          for (const change of changes) console.log(`    ${change}`);
          for (const warning of warnings) console.log(`    ⚠ ${warning}`);
        }
      }
    } catch (error) {
      console.error(`✗ figma:push — ${error.message}`);
      process.exit(1);
    }
  }
}
