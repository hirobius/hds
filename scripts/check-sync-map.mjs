#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-sync-map — one table answering "what is in sync, and where do I edit".
 *
 * Four records describe a component and none referenced the others: the source
 * file, the manifest entry, the Storybook story, and the Figma node. So the
 * only way to answer "is Table in sync" was to read four files and hold the
 * join in your head, which is why a defect list gets reported from memory.
 *
 *   node scripts/check-sync-map.mjs              # the table
 *   node scripts/check-sync-map.mjs --gaps       # only components with a gap
 *   node scripts/check-sync-map.mjs --json       # machine-readable
 *   node scripts/check-sync-map.mjs --component Table
 *
 * Exit 1 when a component regresses below the recorded coverage, or when a
 * story file resolves to no component. Existing gaps are reported, not failed:
 * 41 library components have no Figma node by known backlog, and failing on
 * that would make the gate a permanent red nobody reads.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDisposition, mappedByOverride } from './figma-disposition.mjs';
import { buildStoryIndex, findStoryFiles } from './lib/story-link.mjs';
import { GAPS, buildSyncMap, summarizeSyncMap } from './lib/sync-map.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'public/hds-manifest.json');
const GEOMETRY_BASELINE = path.join(ROOT, 'docs/guardrails/rendered-geometry-baseline.json');
const COVERAGE = path.join(ROOT, 'docs/guardrails/sync-coverage.json');
const OUT_JSON = path.join(ROOT, 'docs/sync-map.json');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f) => (argv.indexOf(f) >= 0 ? argv[argv.indexOf(f) + 1] : undefined);

const GAPS_ONLY = has('--gaps');
// The table is 139 rows. Printing it on every commit buries the summary and
// trains people to scroll past hook output, so it is opt-in.
const SHOW_TABLE = GAPS_ONLY || has('--table');
const AS_JSON = has('--json');
const WRITE = has('--write');
const UPDATE = has('--update-coverage');
const ONE = valueOf('--component');

function readJson(file, fallback = null) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback;
}

/** Defect counts per story id, from the rendered-geometry baseline. */
function defectsByStory() {
  const baseline = readJson(GEOMETRY_BASELINE, { accepted: [] });
  const counts = {};
  for (const fingerprint of baseline.accepted ?? []) {
    const storyId = fingerprint.split(' :: ')[0];
    counts[storyId] = (counts[storyId] ?? 0) + 1;
  }
  return counts;
}

const manifest = readJson(MANIFEST);
if (!manifest) {
  console.error('✗ check-sync-map — public/hds-manifest.json is missing');
  console.error('  fix: pnpm manifest:generate');
  process.exit(1);
}
const specs = manifest.componentSpecs ?? {};

const disposition = {};
for (const entry of buildDisposition().components) disposition[entry.name] = entry.class;

// "Does the declared source exist" is a file-system question, not a glob over
// src/. The seven Compiler primitives declare scripts/hds-jsx-compiler.mjs as
// their source because that is genuinely where they are defined, and a
// src/-only glob reported all seven as missing their own source file.
const sourceFiles = new Set(
  Object.values(specs)
    .map((spec) => spec.filePath)
    .filter((file) => file && existsSync(path.join(ROOT, file))),
);

const storyFilePaths = findStoryFiles(ROOT);
const { byFilePath: freshStories, unresolved } = buildStoryIndex(
  storyFilePaths.map((p) => ({ path: p, source: readFileSync(path.join(ROOT, p), 'utf8') })),
  new Set(
    Object.values(specs)
      .map((s) => s.filePath)
      .filter(Boolean),
  ),
);

// The manifest RECORDS the join; source IS the join. Reading only the recorded
// value would let a stale manifest pass a gate whose whole job is to prove the
// records agree -- the shape of defect this work exists to remove. So re-derive
// from source and report any spec whose recorded ids have drifted.
const manifestDrift = [];
for (const [name, spec] of Object.entries(specs)) {
  const recorded = (spec.storyIds ?? []).join(',');
  const derived = (spec.filePath ? (freshStories.get(spec.filePath)?.storyIds ?? []) : []).join(
    ',',
  );
  if (recorded !== derived) {
    manifestDrift.push({
      name,
      recorded: spec.storyIds ?? [],
      derived: spec.filePath ? (freshStories.get(spec.filePath)?.storyIds ?? []) : [],
    });
  }
}

const map = buildSyncMap({
  specs,
  disposition,
  figmaMapped: mappedByOverride(),
  sourceFiles,
  defectsByStory: defectsByStory(),
  orphanStories: unresolved,
});
const summary = summarizeSyncMap(map);

if (AS_JSON) {
  console.log(JSON.stringify({ summary, ...map }, null, 2));
  process.exit(0);
}

if (WRITE) {
  writeFileSync(
    OUT_JSON,
    `${JSON.stringify(
      {
        $comment:
          'Generated by scripts/check-sync-map.mjs --write. One row per component, joining source, manifest, Storybook and Figma. Do not hand-edit.',
        generated: manifest.generated ?? null,
        summary,
        ...map,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`✓ wrote ${path.relative(ROOT, OUT_JSON)}`);
}

const GAP_LABEL = {
  [GAPS.NO_SOURCE]: 'no source file',
  [GAPS.NOT_IN_MANIFEST]: 'not in manifest',
  [GAPS.NO_STORY]: 'no story',
  [GAPS.NO_FIGMA]: 'no Figma node',
  [GAPS.HAS_DEFECTS]: 'rendered defects',
};

if (ONE) {
  const row = map.rows.find((r) => r.name.toLowerCase() === ONE.toLowerCase());
  if (!row) {
    console.error(`✗ no component named ${ONE}`);
    process.exit(1);
  }
  console.log(`\n${row.name}  [${row.class}]${row.synced ? '  ✓ in sync' : ''}`);
  console.log(`  source  ${row.filePath ?? '—'}`);
  console.log(
    `  stories ${row.storyFiles.join(', ') || '—'}  (${row.storyCount} stor${row.storyCount === 1 ? 'y' : 'ies'})`,
  );
  console.log(
    `  figma   ${row.figmaUrl ?? (row.figmaVia ? `via ${row.figmaVia}` : row.expectFigma ? '— MISSING' : '— not expected')}`,
  );
  console.log(`  defects ${row.defects}`);
  if (row.gaps.length) console.log(`  gaps    ${row.gaps.map((g) => GAP_LABEL[g]).join(', ')}`);
  if (row.storyIds.length) console.log(`  ids     ${row.storyIds.join('\n          ')}`);
  process.exit(0);
}

const shown = GAPS_ONLY ? map.rows.filter((r) => !r.synced) : map.rows;
console.log(`\ncheck-sync-map — ${summary.components} components`);
console.log(
  `  in sync        ${summary.synced}/${summary.components}` +
    `   stories ${summary.storyCoverage.covered}/${summary.storyCoverage.expected}` +
    `   figma ${summary.figmaCoverage.covered}/${summary.figmaCoverage.expected}`,
);
console.log(
  '  ' +
    Object.entries(summary.byGap)
      .map(([gap, n]) => `${GAP_LABEL[gap]} ${n}`)
      .join('   '),
);

if (SHOW_TABLE) {
  console.log(
    `\n${'component'.padEnd(24)}${'class'.padEnd(10)}${'stories'.padEnd(9)}${'figma'.padEnd(18)}gaps`,
  );
  console.log('─'.repeat(96));
  for (const row of shown) {
    const figma = row.figmaVia ?? (row.expectFigma ? 'MISSING' : '—');
    console.log(
      row.name.padEnd(24) +
        row.class.padEnd(10) +
        String(row.storyCount || '—').padEnd(9) +
        figma.padEnd(18) +
        (row.gaps.map((g) => GAP_LABEL[g]).join(', ') || '✓'),
    );
  }

  if (map.orphanStories.length) {
    console.log(
      `\n${map.orphanStories.length} story file(s) resolve to no component in the manifest:`,
    );
    for (const o of map.orphanStories) console.log(`    ${o.storyFile} — ${o.reason}`);
  }
} else {
  console.log('  (pnpm sync-map for the gaps, --table for every component)');
  if (map.orphanStories.length) {
    console.log(
      `  ${map.orphanStories.length} story file(s) resolve to no component in the manifest`,
    );
  }
}

const recorded = readJson(COVERAGE);

if (UPDATE) {
  writeFileSync(
    COVERAGE,
    `${JSON.stringify(
      {
        $comment:
          'Coverage floor for check-sync-map. Coverage may rise; a drop fails the gate. Regenerate with: node scripts/check-sync-map.mjs --update-coverage',
        storyCoverage: summary.storyCoverage,
        figmaCoverage: summary.figmaCoverage,
        orphanStories: map.orphanStories.map((o) => o.storyFile).sort(),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`\n✓ coverage floor written: ${path.relative(ROOT, COVERAGE)}`);
  process.exit(0);
}

if (!recorded) {
  console.log(
    '\n(no coverage floor recorded yet — node scripts/check-sync-map.mjs --update-coverage)',
  );
  process.exit(0);
}

const problems = [];
if (summary.storyCoverage.covered < recorded.storyCoverage.covered) {
  problems.push(
    `story coverage fell from ${recorded.storyCoverage.covered} to ${summary.storyCoverage.covered}` +
      ` (of ${summary.storyCoverage.expected} components that should have one)`,
  );
}
if (summary.figmaCoverage.covered < recorded.figmaCoverage.covered) {
  problems.push(
    `Figma coverage fell from ${recorded.figmaCoverage.covered} to ${summary.figmaCoverage.covered}` +
      ` (of ${summary.figmaCoverage.expected} library components)`,
  );
}
const knownOrphans = new Set(recorded.orphanStories ?? []);
const newOrphans = map.orphanStories.filter((o) => !knownOrphans.has(o.storyFile));
for (const o of newOrphans) {
  problems.push(`${o.storyFile} resolves to no component in the manifest — ${o.reason}`);
}
for (const drift of manifestDrift) {
  problems.push(
    `${drift.name}: the manifest records ${drift.recorded.length} story id(s), source has ` +
      `${drift.derived.length} — run pnpm manifest:generate`,
  );
}

if (problems.length) {
  console.error('\n✗ check-sync-map — the join regressed:\n');
  for (const p of problems) console.error(`    ${p}`);
  // Manifest drift has one correct fix and accepting it is not among them, so
  // only offer the coverage escape hatch when coverage is what regressed.
  if (manifestDrift.length) {
    console.error('\n  Regenerate the manifest:\n    pnpm manifest:generate');
  }
  if (problems.length > manifestDrift.length) {
    console.error(
      '\n  A component that loses its story, or a story that points at nothing,\n' +
        '  is how the records drift apart again. Fix it, or accept it deliberately:\n' +
        '    node scripts/check-sync-map.mjs --update-coverage',
    );
  }
  process.exit(1);
}

console.log('\n✓ the join holds — no component lost a story or a Figma link');
