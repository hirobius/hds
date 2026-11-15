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
 * Flags: --json (the full result), --verbose (also list the baselined differences),
 * --accept (print baseline entries for the new differences; a person adds the reason).
 *
 * Fixture mode: FIXTURE_DIR=<root> reads every input from that root
 * (docs/guardrails/FIXTURE_DIR_HARNESS.md).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatParity, ingestRead, parity } from './lib/figma-parity.mjs';
import { hdsParityDigest } from './lib/figma-parity-runtime.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const READ_PATH = 'figma/parity/read.json';
export const BASELINE_PATH = 'figma/parity/baseline.json';

const json = (root, rel) => JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
const optional = (root, rel, fallback) =>
  existsSync(path.join(root, rel)) ? json(root, rel) : fallback;
const nodeIdOf = (url) =>
  url
    ?.match(/node-id=(\d+)-(\d+)/)
    ?.slice(1, 3)
    .join(':') ?? null;

/** The code side, from the records the other gates already hold to the source. */
export function loadCode(root) {
  const manifest = json(root, 'public/hds-manifest.json');
  const disposition = json(root, 'figma/disposition.json');
  const classes = new Map(Object.values(disposition.components).map((c) => [c.name, c.class]));
  // figma/code-connect-map.json resolves every library component to its node: the @figma
  // tag, or the override that pairs a part (TabsTrigger, Sheet.Title) with its own node.
  const mapped = new Map(
    (optional(root, 'figma/code-connect-map.json', {}).entries ?? []).map((e) => [
      e.name,
      e.nodeId,
    ]),
  );
  const components = Object.entries(manifest.componentSpecs).map(([name, spec]) => ({
    name,
    class: classes.get(name) ?? 'internal',
    deprecated: Boolean(spec.deprecated),
    filePath: spec.filePath,
    nodeId: mapped.get(name) ?? nodeIdOf(spec.figmaUrl),
    props: spec.props ?? {},
    consumers: spec.consumers ?? [],
  }));
  return {
    components,
    templates: optional(root, 'figma/code-connect.json', {}).templates ?? {},
    overrides: optional(root, 'figma/mapping-overrides.json', {}).overrides ?? [],
    icons: manifest.iconSet?.names,
  };
}

/** The variables side: the snapshot's digest, and tokens against the snapshot. */
export async function loadVariables(root) {
  const snapshotPath = path.join(root, 'figma/snapshot.json');
  if (!existsSync(snapshotPath)) return null;
  const { parseSnapshotFile } = await import('./lib/figma-snapshot.mjs');
  const snapshotFile = parseSnapshotFile(readFileSync(snapshotPath, 'utf8'));
  const { runDriftCheck } = await import('./check-figma-drift.mjs');
  const { report, output } = runDriftCheck({ root });
  if (!report) throw new Error(`The token drift check did not run: ${output}`);
  const label = (item) =>
    `${item.collection ?? 'Styles'}: ${item.what === 'variable' ? '' : `${item.what} `}${item.name}`;
  const of = (kind) => report.items.filter((item) => item.kind === kind);
  return {
    snapshotDigest: hdsParityDigest(snapshotFile.snapshot),
    drift: {
      total: report.totals.variables + report.totals.textStyles + report.totals.effectStyles,
      missing: of('missing').map(label),
      extra: of('extra').map(label),
      changed: of('changed').map((item) => ({
        name: `${label(item)}${item.mode ? ` [${item.mode}]` : ''}`,
        detail: item.mode
          ? `tokens say ${item.expected}, Figma has ${item.actual}`
          : `differs in ${(item.fields ?? [item.what]).join(', ')}`,
      })),
    },
    unmanaged: report.unmanagedCollections,
  };
}

export async function runParityCheck({ root = REPO, today, maxAgeDays } = {}) {
  if (!existsSync(path.join(root, READ_PATH))) {
    return {
      exitCode: 2,
      output: `No Figma read yet (${READ_PATH}). Run pnpm figma:parity --emit-read, pass each script to use_figma unmodified, then pnpm figma:parity --ingest <the saved results>.`,
    };
  }
  const result = parity({
    read: json(root, READ_PATH),
    code: loadCode(root),
    variables: await loadVariables(root),
    baseline: optional(root, BASELINE_PATH, {}),
    today: maxAgeDays === undefined ? undefined : today,
    maxAgeDays,
  });
  return { exitCode: result.fresh.length || result.stale.length ? 1 : 0, result };
}

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

async function main(argv) {
  const root = process.env.FIXTURE_DIR ? path.resolve(process.env.FIXTURE_DIR) : REPO;
  const value = (flag) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  if (argv.includes('--emit-read'))
    return emitRead(root, value('--parts') && Number(value('--parts')));
  if (argv.includes('--ingest')) return ingest(root, argv.slice(argv.indexOf('--ingest') + 1));

  const maxAge = value('--max-age');
  const { exitCode, output, result } = await runParityCheck({
    root,
    today: new Date().toISOString().slice(0, 10),
    maxAgeDays: maxAge === undefined ? undefined : Number(maxAge),
  });
  if (!result) {
    console.error(output);
    process.exit(exitCode);
  }
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
