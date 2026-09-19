/** @internal — not part of @hirobius/design-system public API surface. */
import fs from 'node:fs';
import path from 'node:path';

// Fixture mode: read inputs from a synthetic mini-root (proof-of-firing
// directory fixture — see docs/guardrails/FIXTURE_DIR_HARNESS.md). No-op in
// normal runs (FIXTURE_DIR unset).
const FIXTURE_DIR = process.env.FIXTURE_DIR;
const repoRoot = FIXTURE_DIR || process.cwd();
const manifestPath = path.join(repoRoot, 'public', 'hds-manifest.json');
const compilerPath = path.join(repoRoot, 'scripts', 'hds-jsx-compiler.mjs');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function extractSetNames(source, setName) {
  const pattern = new RegExp(`const\\s+${setName}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\);`);
  const match = source.match(pattern);

  if (!match) {
    return [];
  }

  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

const manifest = readJson(manifestPath);
const compilerSource = fs.readFileSync(compilerPath, 'utf8');
const specNames = new Set(Object.keys(manifest.componentSpecs ?? {}));
const utilityNames = new Set(Object.keys(manifest.utilities ?? {}));
const knownNames = new Set([...specNames, ...utilityNames]);
const compilerNames = new Set(
  [
    ...extractSetNames(compilerSource, 'FRAME_TAGS'),
    ...extractSetNames(compilerSource, 'TEXT_TAGS'),
    ...extractSetNames(compilerSource, 'INSTANCE_TAGS'),
    ...extractSetNames(compilerSource, 'ICON_TAGS'),
  ].filter((name) => /^Hds[A-Z]/.test(name)),
);

let warnings = 0;

for (const name of compilerNames) {
  if (!knownNames.has(name)) {
    console.warn(`⚠ Compiler references ${name} but it is absent from componentSpecs/utilities`);
    warnings += 1;
  }
}

// `enrich-manifest.mjs` is what puts the compiler's tag vocabulary into
// componentSpecs; `generate-manifest.mjs` alone does not, because it scans
// src/ and these live in scripts/hds-jsx-compiler.mjs. So a manifest written
// by a chain that skipped enrichment loses them from componentSpecs while
// keeping them in utilities — and the union check above cannot see that
// (hds#229: `pnpm tokens` used to do exactly this, silently dropping seven
// entries from a committed file and only failing later, in CI).
//
// Assert the post-enrichment invariant directly.
for (const name of compilerNames) {
  if (utilityNames.has(name) && !specNames.has(name)) {
    console.error(
      `✖ ${name} is in manifest.utilities but missing from manifest.componentSpecs — ` +
        'the manifest was written without scripts/enrich-manifest.mjs. ' +
        'Regenerate with `pnpm manifest:generate` (not `generate-manifest.mjs` alone).',
    );
    warnings += 1;
  }
}

process.exit(warnings > 0 ? 1 : 0);
