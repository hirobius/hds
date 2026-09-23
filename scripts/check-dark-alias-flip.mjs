#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-dark-alias-flip — does every theme-sensitive alias flip when a theme is
 * scoped to a subtree?
 *
 * A bare `--x: var(--y)` alias is substituted on the element where it is
 * DECLARED, so what inherits down the tree is a finished colour, not a live
 * reference. Declared in `:root` and overridden only at `[data-theme="dark"]`,
 * it computes correctly when that attribute is on `<html>` (same element) and
 * renders its LIGHT value when the attribute is on a descendant — a themed
 * section, the preview stage. #245: 55 variables, measured in Chromium.
 *
 * WHY EVERY EXISTING GATE MISSED IT. check-contrast and friends resolve the
 * token GRAPH in JS, where the indirection is correct by construction. The
 * defect exists only in the emitted cascade, which nothing read. This gate
 * therefore reads the EMITTED CSS — the artifact that ships — and re-derives
 * the invariant from it rather than trusting that build-tokens ran the
 * re-emission step.
 *
 * Reads src/styles/tokens.css, so it is fast and needs no browser. It runs
 * from `pretest`, the channel CI actually invokes via `pnpm test`.
 *
 * Usage: node scripts/check-dark-alias-flip.mjs
 * Exit codes: 0 = every theme-sensitive alias is re-declared, 1 = at least one is not.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { darkAliasReemissions } from './lib/dark-alias-reemit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = path.join(ROOT, 'src', 'styles', 'tokens.css');

/** The declarations inside one top-level block, by selector. */
function blocksOf(css) {
  const out = new Map();
  for (const [, rawSelector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/gs)) {
    const selector = rawSelector.trim().split('\n').pop().trim();
    if (!selector || selector.startsWith('/*')) continue;
    out.set(
      selector,
      body.split('\n').filter((l) => /^\s*--[\w-]+\s*:/.test(l)),
    );
  }
  return out;
}

function main() {
  if (!existsSync(CSS)) {
    console.error(
      `check-dark-alias-flip: ${path.relative(ROOT, CSS)} does not exist — run \`node scripts/build-tokens.mjs\`.`,
    );
    process.exit(1);
  }

  const blocks = blocksOf(readFileSync(CSS, 'utf8'));
  const root = blocks.get(':root') ?? [];
  const dark = blocks.get('[data-theme="dark"]') ?? [];

  if (root.length === 0 || dark.length === 0) {
    console.error(
      'check-dark-alias-flip: found no :root or no [data-theme="dark"] block in the emitted CSS.\n' +
        '  The emission shape changed, so this gate would pass vacuously. It fails instead.',
    );
    process.exit(1);
  }

  const missing = darkAliasReemissions(root, dark);

  if (missing.length > 0) {
    console.error(
      `check-dark-alias-flip — ${missing.length} alias(es) would render their LIGHT value when\n` +
        `a theme is scoped to a subtree, because they are declared only in :root:\n` +
        missing.map((l) => `  ${l.trim()}`).join('\n') +
        '\n\nThey must also be declared in the [data-theme="dark"] block so they re-compute at\n' +
        'whichever element carries the attribute. build-tokens.mjs does this automatically —\n' +
        'if this fires, that step was removed or the emission shape changed.',
    );
    process.exit(1);
  }

  console.log(
    `check-dark-alias-flip — OK: every theme-sensitive alias is re-declared in the dark block ` +
      `(${root.length} :root, ${dark.length} dark declarations)`,
  );
}

main();
