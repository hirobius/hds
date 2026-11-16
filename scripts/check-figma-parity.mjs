#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Fails when the Figma library and the code disagree: compares the committed read of the library (figma/parity/read.json) with the components, props, variants and tokens in code, and reports every difference with a parity score.
 *
 * `pnpm check:figma-parity`. The comparison is scripts/lib/figma-parity.mjs.
 * Nothing in CI can read Figma on a Professional plan, so "a fresh Figma read"
 * is a committed file an agent or a person refreshes on purpose:
 *
 *   pnpm figma:parity --emit-read [--parts N]   write the read-only use_figma scripts to figma/push/parity/
 *   pnpm figma:parity --ingest <files...>       verify their results and write figma/parity/read.json
 *   pnpm check:figma-parity                     compare; exit 1 on drift
 *
 * Exit 1 when:
 *   - a difference is not in figma/parity/baseline.json (new drift);
 *   - a baseline entry no longer matches a difference (the drift is fixed: remove
 *     the entry, so the list only shrinks);
 *   - with --max-age <days>, the read is older than that (default: never fails on age,
 *     because a gate that turns red with no change teaches people to ignore it;
 *     `pnpm check:figma-parity:fresh` is the 14-day form, for a release or a demo).
 * Exit 2 when there is no read yet.
 *
 * Every run that reads the library also rewrites `figmaParity` in public/hds-stats.json
 * with its score, through scripts/build-stats-json.mjs (the one generator of that file;
 * `pnpm stats:build --check` proves it fresh). Nothing is typed by hand. The write is
 * idempotent, so a run on an unchanged read changes no byte.
 *
 * Flags: --json (the full result), --verbose (also list the baselined differences),
 * --accept (print baseline entries for the new differences; a person adds the reason).
 *
 * Fixture mode: FIXTURE_DIR=<root> reads every input from that root
 * (docs/guardrails/FIXTURE_DIR_HARNESS.md).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatParity, ingestRead } from './lib/figma-parity.mjs';
import {
  BASELINE_PATH,
  READ_PATH,
  REPO,
  json,
  loadCode,
  loadVariables,
  runParityCheck,
} from './lib/figma-parity-run.mjs';

export { BASELINE_PATH, READ_PATH, loadCode, loadVariables, runParityCheck };

async function emitRead(root, parts) {
  const { buildParityComponentsScript, buildParityVariablesScript, PARITY_COMPONENT_PARTS } =
    await import('./lib/figma-parity-scripts.mjs');
  const links = json(root, 'figma/links.json');
  const count = parts ?? PARITY_COMPONENT_PARTS;
  const dir = path.join(root, 'figma/push/parity');
  mkdirSync(dir, { recursive: true });
  const files = [
    [
      'variables.js',
      buildParityVariablesScript(links, json(root, 'figma/snapshot.json').snapshot.file),
    ],
  ];
  for (let part = 0; part < count; part++) {
    files.push([
      `components-${part + 1}-of-${count}.js`,
      buildParityComponentsScript(links, part, count),
    ]);
  }
  for (const [name, text] of files) writeFileSync(path.join(dir, name), text);
  console.log(
    [
      `Wrote ${files.length} read-only scripts to figma/push/parity/ (gitignored):`,
      ...files.map(([name, text]) => `  ${name}  (${text.length} characters)`),
      '',
      'Log the calls in figma/MCP-LEDGER.md, then pass each script, unmodified, to one use_figma call on the library.',
      'Save each result to its own file, then: pnpm figma:parity --ingest <every saved file>',
    ].join('\n'),
  );
}

function ingest(root, files) {
  const results = files.map((file) => JSON.parse(readFileSync(path.resolve(file), 'utf8')));
  const read = ingestRead(results, {
    fileKey: json(root, 'figma/links.json').libraryFileKey,
    readOn: (results.find((r) => r.takenAt)?.takenAt ?? new Date().toISOString()).slice(0, 10),
  });
  mkdirSync(path.join(root, 'figma/parity'), { recursive: true });
  writeFileSync(path.join(root, READ_PATH), JSON.stringify(read, null, 2) + '\n');
  const components = read.pages.reduce((n, p) => n + p.components.length, 0);
  console.log(
    `Wrote ${READ_PATH}: ${read.pages.length} pages, ${components} components, ${read.variables.collections.length} variable collections (read ${read.readOn}).`,
  );
}

/** Save the score into the stats through their generator; skipped where a root carries no stats file. */
async function saveScore(root, score) {
  const stats = await import('./build-stats-json.mjs');
  if (!existsSync(path.join(root, stats.STATS_PATH))) return;
  const { runGenerator } = await import('./lib/generated-check.mjs');
  await runGenerator({
    root,
    outputs: {
      [stats.STATS_PATH]: await stats.renderStats(root, { parity: stats.parityBlock(root, score) }),
    },
    label: 'build-stats-json',
    fix: 'pnpm stats:build',
    argv: [],
  });
}

async function main(argv) {
  const root = process.env.FIXTURE_DIR ? path.resolve(process.env.FIXTURE_DIR) : REPO;
  const value = (flag) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  if (argv.includes('--emit-read'))
    return emitRead(root, value('--parts') && Number(value('--parts')));
  if (argv.includes('--ingest')) return ingest(root, argv.slice(argv.indexOf('--ingest') + 1));

  const maxAge = value('--max-age');
  if (maxAge !== undefined && !(Number(maxAge) >= 0)) {
    console.error(`--max-age needs a number of days, got "${maxAge}".`);
    process.exit(1);
  }
  const { exitCode, output, result } = await runParityCheck({
    root,
    today: new Date().toISOString().slice(0, 10),
    maxAgeDays: maxAge === undefined ? undefined : Number(maxAge),
  });
  if (!result) {
    console.error(output);
    process.exit(exitCode);
  }
  await saveScore(root, result.score);
  if (argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else if (argv.includes('--accept')) {
    const accepted = Object.fromEntries(
      result.fresh.map((f) => [
        f.id,
        { reason: 'TODO: why this difference stays, and the issue that removes it' },
      ]),
    );
    console.log(JSON.stringify({ accepted }, null, 2));
  } else
    (exitCode === 0 ? console.log : console.error)(
      formatParity(result, { verbose: argv.includes('--verbose') }),
    );
  process.exit(argv.includes('--accept') ? 0 : exitCode);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
