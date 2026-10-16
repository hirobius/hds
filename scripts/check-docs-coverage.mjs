#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-docs-coverage.mjs — every documented component has a docs page, a live
 * demo and a Figma link (hds#762). Gaps today live in
 * scripts/docs-coverage-allowlist.json; the list can only shrink: a new gap
 * fails, and so does an entry that is no longer a gap (remove it).
 *
 * Usage: node scripts/check-docs-coverage.mjs [--list]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectArrayNames, collectObjectKeys } from './lib/check-component-docs.mjs';
import { applyRatchet, findCoverageGaps } from './lib/docs-coverage.mjs';
import { docsPagePath, loadDocsRouting } from './lib/docs-routing.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

const routing = loadDocsRouting(ROOT);
const manifest = JSON.parse(read('public/hds-manifest.json'));
const demos = new Set(
  [
    ...collectArrayNames(read('docs-site/lib/previewed-components.ts'), 'PREVIEWED_COMPONENTS'),
  ].filter((n) =>
    collectObjectKeys(read('docs-site/components/component-demos.tsx'), 'DEMOS').has(n),
  ),
);
// Providers are documented on the providers guide, which has no per-component demo.
for (const n of routing.providers) demos.add(n);

const components = [
  ...new Set([...routing.core, ...routing.patterns, ...routing.providers]),
].filter((n) => !manifest.componentSpecs?.[n]?.hidden);
const gaps = findCoverageGaps({
  components,
  pageFor: (n) => docsPagePath(n, routing),
  demos,
  figmaFor: (n) => manifest.componentSpecs?.[n]?.figmaUrl,
});

if (process.argv.includes('--list')) {
  for (const g of gaps) console.log(`${g.name}:${g.gap}`);
  process.exit(0);
}

const allowlist = JSON.parse(read('scripts/docs-coverage-allowlist.json')).gaps;
const { newGaps, stale } = applyRatchet(gaps, allowlist);
for (const g of newGaps)
  console.error(
    `  error ${g.gap}: ${g.name} (add the missing ${g.gap.replace('no-', '')}; do not extend the allowlist)`,
  );
for (const e of stale)
  console.error(
    `  error stale-allowlist: ${e} is no longer a gap — remove it from scripts/docs-coverage-allowlist.json`,
  );
if (newGaps.length || stale.length) process.exit(1);
console.log(
  `check-docs-coverage: ${components.length} components, ${gaps.length} known gaps (allowlist can only shrink).`,
);
