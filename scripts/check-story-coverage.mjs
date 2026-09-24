#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-story-coverage — every consumer-facing component must be visible.
 *
 * The reference site renders a component from its stories, so a component with
 * no story is invisible on it: no examples, and no rendered-geometry findings
 * either, which reads as "clean" when the truth is "never looked at". Coverage
 * is currently complete — library 88/88, layout 14/14, slot 18/18 — and this
 * gate is what keeps the next component from landing storyless.
 *
 * WHO IS EXEMPT IS NOT A LIST KEPT HERE. It is the ratified disposition
 * (hds#235): `internal` components are not part of the consumer-facing
 * surface. Seven of them are not even React modules — the Compiler primitives
 * are defined in scripts/hds-jsx-compiler.mjs. A hand-kept allowlist is what
 * the old componentPreviewRegistry tried and failed at: 46 entries, 16 naming
 * components that no longer exist, 109 of 139 components missing entirely.
 *
 *   node scripts/check-story-coverage.mjs
 *   node scripts/check-story-coverage.mjs --report
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDisposition } from './figma-disposition.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'public/hds-manifest.json');
const REPORT = process.argv.includes('--report');

if (!existsSync(MANIFEST)) {
  console.error('✗ check-story-coverage — public/hds-manifest.json is missing');
  console.error('  fix: pnpm manifest:generate');
  process.exit(1);
}

const specs = JSON.parse(readFileSync(MANIFEST, 'utf8')).componentSpecs ?? {};
const klass = {};
for (const entry of buildDisposition().components) klass[entry.name] = entry.class;

const rows = Object.entries(specs).map(([name, spec]) => ({
  name,
  class: klass[name] ?? 'internal',
  stories: (spec.storyIds ?? []).length,
  filePath: spec.filePath ?? '',
}));

// `internal` is the exemption, and it comes from the disposition rules rather
// than from anything written down here.
const expected = rows.filter((r) => r.class !== 'internal');
const missing = expected.filter((r) => r.stories === 0);

const byClass = {};
for (const r of rows) {
  byClass[r.class] ??= { total: 0, covered: 0 };
  byClass[r.class].total += 1;
  if (r.stories) byClass[r.class].covered += 1;
}

console.log(`\ncheck-story-coverage — ${expected.length} consumer-facing components`);
for (const [name, v] of Object.entries(byClass).sort()) {
  const exempt = name === 'internal' ? '   (exempt)' : '';
  console.log(`  ${name.padEnd(10)} ${v.covered}/${v.total}${exempt}`);
}

if (REPORT) {
  const silent = rows.filter((r) => r.class === 'internal' && r.stories === 0);
  console.log(`\n${silent.length} internal component(s) carry no story, by design:`);
  for (const r of silent) console.log(`    ${r.name.padEnd(22)} ${r.filePath}`);
}

if (missing.length) {
  console.error(`\n✗ ${missing.length} consumer-facing component(s) have no story:\n`);
  for (const r of missing) {
    console.error(`    ${r.name}  [${r.class}]  ${r.filePath}`);
  }
  console.error(
    '\n  A component with no story is invisible on the reference site and is\n' +
      '  never swept by check-rendered-geometry, so it reads as clean when the\n' +
      '  truth is that nothing has looked at it. Write a story, or — if it is\n' +
      '  genuinely not consumer-facing — correct its class in\n' +
      '  figma/disposition.json with a reason (hds#235).',
  );
  process.exit(1);
}

console.log('\n✓ every consumer-facing component has at least one story');
