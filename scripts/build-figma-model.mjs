#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — `pnpm figma:model`
 *
 * Builds the Figma model from hirobius.tokens.json and the demo tenants in
 * figma/brand-modes.json (scripts/lib/figma-model.mjs), checks its invariants,
 * and writes figma/model.json: collections × modes ×
 * variables keyed by token path, text styles, effect styles, and the declared
 * not-in-Figma list. figma/model.json is a generated artifact (gitignored, like
 * the hirobius.figma-variables*.json exports). Nothing here talks to Figma.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { buildFigmaModel } from './lib/figma-model.mjs';
import { loadBrandModes } from './lib/figma-brand-modes.mjs';
import { validateFigmaModel, summarizeFigmaModel } from './lib/figma-model-invariants.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Builds, validates and (only when valid) writes the model.
 *
 * @param {{ tokensPath: string, outPath: string, brands?: object|null }} paths
 *   brands: demo tenant overlays (loadBrandModes) for the Brand and Density collections.
 * @returns {{ model: object, summary: object, violations: string[] }}
 */
export function writeFigmaModel({ tokensPath, outPath, brands = null }) {
  const model = buildFigmaModel(JSON.parse(readFileSync(tokensPath, 'utf8')), { brands });
  const violations = validateFigmaModel(model);
  if (violations.length === 0) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(model, null, 2)}\n`);
  }
  return { model, summary: summarizeFigmaModel(model), violations };
}

/** Human-readable summary for the terminal. */
export function formatSummary(summary, outLabel) {
  const width = Math.max(...summary.collections.map((c) => c.name.length));
  const modesWidth = Math.max(...summary.collections.map((c) => c.modes.join('/').length));
  const exclusions = Object.entries(summary.notInFigma)
    .map(([id, count]) => `${id} ${count}`)
    .join(', ');
  return [
    `Figma model → ${outLabel}`,
    ...summary.collections.map(
      (c) =>
        `  ${c.name.padEnd(width)}  ${c.modes.join('/').padEnd(modesWidth)}  ${c.variables} variables`,
    ),
    `  ${summary.variables} variables in total; ${summary.themeDifferences} variables differ between Light and Dark`,
    `  ${summary.textStyles} text styles, ${summary.effectStyles} effect styles`,
    `  Not in Figma: ${exclusions}`,
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outPath = join(ROOT, 'figma', 'model.json');
  try {
    const tokensPath = join(ROOT, 'hirobius.tokens.json');
    const { summary, violations } = writeFigmaModel({
      tokensPath,
      outPath,
      brands: loadBrandModes(ROOT, JSON.parse(readFileSync(tokensPath, 'utf8'))),
    });
    if (violations.length > 0) {
      console.error(
        `✗ figma:model — ${violations.length} invariant violation(s); figma/model.json not written:`,
      );
      for (const v of violations) console.error(`  • ${v}`);
      process.exit(1);
    }
    console.log(formatSummary(summary, relative(ROOT, outPath).replaceAll('\\', '/')));
    console.log('✓ All invariants pass');
  } catch (error) {
    console.error(`✗ figma:model — ${error.message}`);
    process.exit(1);
  }
}
