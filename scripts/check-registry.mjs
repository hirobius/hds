#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-registry.mjs
 *
 * Validates that hds-registry.json is complete and up-to-date.
 *
 * Checks:
 *   1. No stub summaries (entries with "TODO:" in their summary field)
 *   2. No page files are missing a registry entry (src/app/pages/hds was
 *      removed with the docs SPA teardown, #51 — hds-registry.json is now a
 *      frozen data artifact, still consumed by hds-nav-data.ts, so this
 *      check degrades to a no-op rather than erroring when the dir is gone)
 *
 * Run: node scripts/check-registry.mjs
 * Or:  pnpm check:registry
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Fixture mode: read inputs from a synthetic mini-root (proof-of-firing
// directory fixture — see docs/guardrails/FIXTURE_DIR_HARNESS.md). No-op in
// normal runs (FIXTURE_DIR unset).
const FIXTURE_DIR = process.env.FIXTURE_DIR;
const INPUT_ROOT = FIXTURE_DIR || ROOT;
const REGISTRY = join(INPUT_ROOT, 'src', 'app', 'data', 'hds-registry.json');
const PAGES_DIR = join(INPUT_ROOT, 'src', 'app', 'pages', 'hds');

const EXCLUDE = new Set([
  'HDSLayout.tsx',
  'HdsDocPrimitives.tsx',
  'HdsTocContext.tsx',
  'IconGallery.tsx',
  'GettingStartedPage.tsx',
  'TokenCascadeDiagram.tsx',
  'TokenExplorerPanel.tsx',
  'HirobiusCaseStudyPage.tsx',
  'RanchFoundationCaseStudyPage.tsx',
  'PrimaryCaseStudyPage.tsx',
  'PortfolioHomePage.tsx',
]);

const PATH_OVERRIDES = {
  'OverviewPage.tsx': '/hds',
};

function toKebab(str) {
  return str.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`).replace(/^-/, '');
}

function derivePath(relFile) {
  if (PATH_OVERRIDES[relFile]) return PATH_OVERRIDES[relFile];
  const name = basename(relFile, '.tsx').replace(/Page$/, '');
  const slug = toKebab(name);
  const dir =
    basename(relFile, '.tsx') === relFile.split('/')[0]
      ? ''
      : relFile.split('/').slice(0, -1).join('/');

  if (!dir || dir === '.') return `/hds/${slug}`;
  return `/hds/${dir}/${slug}`;
}

function collectTsx(dir, base = '') {
  if (!base && !existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    if (statSync(full).isDirectory()) results.push(...collectTsx(full, rel));
    else if (entry.endsWith('.tsx') && !entry.endsWith('.test.tsx')) results.push(rel);
  }
  return results;
}

export function runRegistryCheck() {
  const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
  const errors = [];

  for (const entry of registry) {
    if (entry.summary?.startsWith('TODO:')) {
      errors.push(`stub summary: ${entry.path} - fill in summary in hds-registry.json`);
    }
  }

  const pageFiles = collectTsx(PAGES_DIR).filter((file) => !EXCLUDE.has(basename(file)));
  const registryPaths = new Set(registry.map((entry) => entry.path));
  for (const relFile of pageFiles) {
    const path = derivePath(relFile);
    if (!registryPaths.has(path)) {
      errors.push(`missing entry: ${path} (${relFile}) - run pnpm tokens to add stub`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    registryCount: registry.length,
  };
}

export function main() {
  const result = runRegistryCheck();
  if (!result.ok) {
    console.error(`FAIL check:registry - ${result.errors.length} issue(s):`);
    result.errors.forEach((error) => console.error(`  ${error}`));
    process.exit(1);
  }
  console.log(`OK check:registry - ${result.registryCount} entries, all complete`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
