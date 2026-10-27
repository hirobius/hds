#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-docs-coverage.mjs — every component has a docs page, a live demo and a Figma link in its page header (hds#762).
 *
 * Joins three lists: the components in public/hds-manifest.json (not hidden;
 * docExempt only counts when the component has no page; a part such as
 * CardHeader is covered by its file's paged component), the docs-site pages
 * (scripts/lib/docs-routing.mjs) with their demos (DEMOS ∩
 * PREVIEWED_COMPONENTS), and the Figma links (manifest figmaUrl from each
 * @figma tag, a real Figma URL, shown in the page header). Components on a
 * shared page (the utilities page, the providers guide) have no header slot of
 * their own, so no Figma link is asked of them. The logic is
 * scripts/lib/docs-coverage.mjs.
 *
 * Today's gaps sit in docs/guardrails/baselines/check-docs-coverage.json, a
 * ratchet that only shrinks: a new gap fails, and so does a baseline entry that
 * is no longer a gap (remove it when you fill the gap).
 *
 * Usage: node scripts/check-docs-coverage.mjs [--list]
 *   --list  print every current gap as `Name:gap` and exit 0
 *
 * Fixture mode: FIXTURE_DIR=<mini-root> reads the manifest, the two demo
 * registries, src/patterns.ts and the baseline from there
 * (fixtures/check-docs-coverage). The routing rules (CORE_COMPONENTS,
 * scripts/docs-rules.json) still come from this checkout, so a fixture's
 * components use real core names (Button has a page because it is core).
 * See docs/guardrails/FIXTURE_DIR_HARNESS.md.
 *
 * Exit codes: 0 clean (every gap baselined) · 1 a new gap or a stale entry.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { documentedFromSources } from './lib/check-component-docs.mjs';
import { applyRatchet, coverageUnits, findCoverageGaps } from './lib/docs-coverage.mjs';
import { docsPagePath, loadDocsRouting } from './lib/docs-routing.mjs';
import { resolveFigmaLink } from './lib/figma-link.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.FIXTURE_DIR ? path.resolve(process.env.FIXTURE_DIR) : ROOT;
const BASELINE = 'docs/guardrails/baselines/check-docs-coverage.json';
const read = (rel) => {
  const file = path.join(BASE, rel);
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
};

const routing = loadDocsRouting(BASE);
const specs = JSON.parse(read('public/hds-manifest.json')).componentSpecs ?? {};
const demos = documentedFromSources({
  previewedText: read('docs-site/lib/previewed-components.ts'),
  demosText: read('docs-site/components/component-demos.tsx'),
  // The providers guide documents the providers, with no per-component demo.
  providers: routing.providers,
});

const sharedPages = new Set(
  [...routing.providers, ...routing.utilities].map((n) => docsPagePath(n, routing)),
);
const pageFor = (name) => {
  const p = docsPagePath(name, routing);
  return p ? { path: p, shared: sharedPages.has(p) } : null;
};

const { units, parts } = coverageUnits(specs, (n) => Boolean(docsPagePath(n, routing)));
const gaps = findCoverageGaps({
  units,
  pageFor,
  demos,
  figmaFor: (n) => resolveFigmaLink(specs[n]?.figmaUrl),
});

if (process.argv.includes('--list')) {
  for (const g of gaps) console.log(`${g.name}:${g.gap}`);
  process.exit(0);
}

const baseline = JSON.parse(read(BASELINE) || '{"gaps":[]}').gaps ?? [];
const { newGaps, stale } = applyRatchet(gaps, baseline);
const FIX = {
  'no-page': 'give it a docs page (core set, a /patterns module, or a part of a paged component)',
  'no-demo': 'add a DEMOS entry and list it in PREVIEWED_COMPONENTS',
  'no-figma-link':
    'add an @figma tag to its JSDoc on a page of its own, then pnpm manifest:generate',
};
for (const g of newGaps)
  console.error(`  error ${g.gap}: ${g.name} — ${FIX[g.gap]}. Do not extend the baseline.`);
for (const e of stale)
  console.error(`  error stale-baseline: ${e} is no longer a gap — remove it from ${BASELINE}`);
if (newGaps.length || stale.length) process.exit(1);
console.log(
  `check-docs-coverage: ${units.length} components (+${parts.length} parts), ` +
    `${gaps.length} baselined gaps (the baseline only shrinks; --list prints them).`,
);
