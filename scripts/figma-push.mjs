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
 *   figma/push/plugin/            development plugin: Plan (dry run) · Push · Take snapshot
 *   figma/push/use-figma/NN-*.js  use_figma scripts for the Figma MCP server, run in order
 *   figma/push/use-figma/snapshot.js
 *
 * A push matches by token path (then TOKEN_MIGRATION.md renames, codeSyntax,
 * name), updates before it creates, renames a collection's initial mode, and
 * deletes nothing unless built with --prune. It re-reads the file afterwards
 * and fails if Figma still differs from the model.
 *
 * Usage:
 *   pnpm figma:push            write the carriers
 *   pnpm figma:push --prune    carriers that also delete variables, styles and
 *                              modes the model does not own
 *   pnpm figma:push --plan     also print what a push would change against the
 *                              committed figma/snapshot.json
 */

import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { loadFigmaInputs } from './lib/figma-inputs.mjs';
import {
  PUSH_CHUNKS,
  buildDevPlugin,
  buildUseFigmaPushScript,
  buildUseFigmaSnapshotScript,
  modelHash,
} from './lib/figma-scripts.mjs';
import { hdsDescribePlan, hdsPlan, hdsSummarize, hdsSummaryLine } from './lib/figma-runtime.mjs';
import { parseSnapshotFile } from './lib/figma-snapshot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Builds and validates the model, then (re)writes every carrier under outDir.
 *
 * @param {{ root: string, outDir: string, prune?: boolean }} options
 * @returns {{ model: object, renames: object, prune: boolean, files: Array<{path: string, bytes: number}> }}
 */
export function writePushArtifacts({ root, outDir, prune = false }) {
  const { model, renames } = loadFigmaInputs(root);
  const outputs = Object.entries(buildDevPlugin(model, { prune, renames })).map(([name, text]) => [
    join('plugin', name),
    text,
  ]);
  for (const chunk of PUSH_CHUNKS) {
    outputs.push([
      join('use-figma', `${chunk.id}.js`),
      buildUseFigmaPushScript(model, { scope: chunk.scope, prune, renames }, chunk.id),
    ]);
  }
  outputs.push([join('use-figma', 'snapshot.js'), buildUseFigmaSnapshotScript()]);

  rmSync(outDir, { recursive: true, force: true });
  const files = outputs.map(([path, text]) => {
    mkdirSync(dirname(join(outDir, path)), { recursive: true });
    writeFileSync(join(outDir, path), text);
    return { path: path.replaceAll('\\', '/'), bytes: Buffer.byteLength(text) };
  });
  return { model, renames, prune, files };
}

/** What a push would change, judged against a snapshot instead of the live file. */
export function planAgainstSnapshot({ model, renames, snapshotFile, prune = false }) {
  const plan = hdsPlan(model, snapshotFile.snapshot, { prune, renames });
  return { line: hdsSummaryLine(hdsSummarize(plan)), changes: hdsDescribePlan(plan), plan };
}

function formatRun({ model, prune, files }, outDir) {
  const kb = (bytes) => `${Math.ceil(bytes / 1024)} KB`;
  const rel = relative(ROOT, outDir).replaceAll('\\', '/');
  const scripts = files.filter(
    (f) => f.path.startsWith('use-figma/') && !f.path.endsWith('snapshot.js'),
  );
  return [
    `figma:push — carriers written to ${rel}/ (model ${modelHash(model)}, prune ${prune ? 'ON: deletes extras' : 'off'})`,
    '',
    '  Development plugin (recommended: no size limit, nothing passes through a chat):',
    `    Figma desktop → Plugins → Development → Import plugin from manifest… → ${rel}/plugin/manifest.json`,
    '    Run "Plan push (dry run, writes nothing)", read the plan, then run the push command.',
    '',
    '  use_figma (Figma MCP server), in order and unmodified; a changed payload fails its checksum:',
    ...scripts.map((f) => `    ${rel}/${f.path}  (${kb(f.bytes)})`),
    '',
    '  Then take a snapshot (pnpm figma:snapshot) and run pnpm check:figma-drift.',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
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
        const { line, changes } = planAgainstSnapshot({ ...result, snapshotFile });
        console.log(
          `  Against figma/snapshot.json (taken ${snapshotFile.snapshot.takenAt}): ${line}`,
        );
        for (const change of changes) console.log(`    ${change}`);
      }
    }
  } catch (error) {
    console.error(`✗ figma:push — ${error.message}`);
    process.exit(1);
  }
}
