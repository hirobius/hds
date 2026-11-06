#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — Token Build Script
 *
 * Compiles hirobius.tokens.json (W3C DTCG 2025.10) into:
 *   src/styles/tokens.generated.css             — CSS custom properties
 *   src/app/design-system/generated-tokens.ts   — TypeScript constants
 *   (plus the token values / descriptions / refs / vars .d.ts, the manifest,
 *   the Tailwind bridge, the deprecation table and the tenant / accent CSS)
 *
 * Run: node scripts/build-tokens.mjs
 * No dependencies required — pure Node.js ESM.
 *
 * This file is the CLI. The work lives in pure modules (hds#645):
 *   lib/token-tree.mjs         walk the tree, parse and resolve aliases
 *   lib/token-validate.mjs     structural rules V1–V6
 *   lib/token-emit/css.mjs     values → CSS, tokens.generated.css
 *   lib/token-emit/ts.mjs      the generated-token*.ts files
 *   lib/token-emit/tailwind.mjs tailwind.config.tokens.cjs
 *   lib/token-emit/tenant.mjs  tenant / accent overlays
 *   lib/token-manifest.mjs     public/hds-manifest.json (previous manifest passed in)
 * Import those modules directly; this file exports only the CLI's
 * buildManifest wrapper. Importing it reads no files.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeGenerated } from './lib/write-generated.mjs';
import { collectDeprecations } from './lib/token-deprecations.mjs';
import { writeStableArtifact } from './lib/stable-artifact.mjs';
import { readTokenSource } from './lib/token-source.mjs';
import { walkTokens } from './lib/token-tree.mjs';
import { validateTokens } from './lib/token-validate.mjs';
import { renderTokensCSS } from './lib/token-emit/css.mjs';
import {
  buildDeprecationNotes,
  renderTokenDescriptionsTS,
  renderTokenRefsTS,
  renderTokenValuesTS,
  renderTokenVarsDts,
  renderTokensTS,
} from './lib/token-emit/ts.mjs';
import { renderTailwindConfig } from './lib/token-emit/tailwind.mjs';
import { ACCENT_HEADER, DOCS_ONLY_DIRECTIONS, buildTenantCSS } from './lib/token-emit/tenant.mjs';
import { buildManifest as buildManifestFrom } from './lib/token-manifest.mjs';
import { readPackageVersion } from './lib/version-stamp.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/** The previous build's manifest (its own output). Read lazily, never at import. */
const readSystemManifest = () =>
  JSON.parse(readFileSync(join(ROOT, 'public', 'hds-manifest.json'), 'utf8'));

/** lib/token-manifest.mjs buildManifest, reading the previous manifest when none is passed. */
export function buildManifest(
  allTokens,
  raw,
  systemManifest = readSystemManifest(),
  packageVersion = readPackageVersion(ROOT),
) {
  return buildManifestFrom(allTokens, raw, systemManifest, packageVersion);
}

// ── CLI entry (runs only when invoked directly) ───────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = readTokenSource(join(ROOT, 'hirobius.tokens.json'));

  // Run structural validation before compiling
  const validationErrors = validateTokens(raw);
  if (validationErrors.length > 0) {
    console.error('\nâœ— Token validation failed:\n');
    validationErrors.forEach((e) => console.error(`  ${e}`));
    console.error('\nFix the above errors in hirobius.tokens.json before compiling.\n');
    process.exit(1);
  }

  const allTokens = [...walkTokens(raw)];
  const deprecationNotes = buildDeprecationNotes(allTokens);
  const primitives = allTokens.filter((t) => t.path[0] === 'primitive');

  const css = renderTokensCSS(raw, allTokens);
  const ts = renderTokensTS(allTokens, deprecationNotes);
  const tokenValuesTs = renderTokenValuesTS(primitives, raw);
  const tokenDescriptionsTs = renderTokenDescriptionsTS(allTokens);
  const tokenVarsDts = renderTokenVarsDts(allTokens, deprecationNotes);
  const tokenRefsTs = renderTokenRefsTS(allTokens, deprecationNotes);

  mkdirSync(join(ROOT, 'src', 'styles'), { recursive: true });
  mkdirSync(join(ROOT, 'src', 'app', 'design-system'), { recursive: true });
  mkdirSync(join(ROOT, 'public'), { recursive: true });

  // The one CSS-variables file (hds#641). Written raw, not through writeGenerated:
  // it is in .prettierignore (the generator owns its format), and Prettier would
  // reflow it and change the bytes dist/tokens.css and dist/variables.css derive from.
  writeFileSync(join(ROOT, 'src', 'styles', 'tokens.generated.css'), css);
  writeFileSync(join(ROOT, 'src', 'app', 'design-system', 'generated-tokens.ts'), ts);
  writeFileSync(
    join(ROOT, 'src', 'app', 'design-system', 'generated-token-values.ts'),
    tokenValuesTs,
  );
  writeFileSync(
    join(ROOT, 'src', 'app', 'design-system', 'generated-token-descriptions.ts'),
    tokenDescriptionsTs,
  );
  writeFileSync(
    join(ROOT, 'src', 'app', 'design-system', 'generated-token-vars.d.ts'),
    tokenVarsDts,
  );
  writeFileSync(join(ROOT, 'src', 'app', 'design-system', 'generated-token-refs.ts'), tokenRefsTs);
  const manifest = buildManifest(allTokens, raw);
  // Stable write: the `generated` ISO timestamp is volatile — only rewrite the
  // manifest when its substantive content changes, so unchanged builds don't
  // churn the git tree (default volatileRe matches ISO dates).
  writeStableArtifact(
    join(ROOT, 'public', 'hds-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );

  const tailwindConfigCjs = renderTailwindConfig(allTokens, deprecationNotes);
  // Format before writing, or this file can never match what is committed.
  // JSON.stringify quotes every key (`'colors':`); lint-staged runs Prettier on
  // commit, which strips those quotes. So the generated bytes and the committed
  // bytes differed by construction, and check-token-rebake-needed — which
  // compares them byte-for-byte — reported "REBAKE REQUIRED" on every run
  // forever, no matter how current the tokens were. Emitting Prettier-formatted
  // output makes `pnpm tokens` produce a commit-ready file and the gate's
  // comparison meaningful.
  await writeGenerated(join(ROOT, 'tailwind.config.tokens.cjs'), tailwindConfigCjs);

  // The deprecation table the hds/no-deprecated-token rule reads (it ships;
  // the token file is not read at lint time).
  await writeGenerated(
    join(ROOT, 'scripts', 'eslint-plugin-hds', 'rules', 'deprecated-tokens.json'),
    `${JSON.stringify(
      {
        $comment:
          'Generated by scripts/build-tokens.mjs from the $deprecated tokens in hirobius.tokens.json. Do not edit.',
        tokens: collectDeprecations(raw),
      },
      null,
      2,
    )}\n`,
  );

  // ── Per-tenant CSS (ADR-0001: [data-tenant="slug"] selectors) ─────────────
  // ── Per-direction CSS (ADR-0001: [data-tenant="slug"] selectors; ADR-035) ─
  const directionsDir = join(ROOT, 'directions');
  const tenantResult = buildTenantCSS(directionsDir, raw, {
    strict: false,
    exclude: DOCS_ONLY_DIRECTIONS,
  });

  if (tenantResult.errors.length > 0) {
    console.warn('\n⚠ Direction overlay validation warnings:');
    tenantResult.errors.forEach((e) => console.warn('  ' + e));
    console.warn('');
  }

  // Write the generated tenant CSS (overwrites the hand-authored tenants.css).
  // tenants.css is imported in theme.css after tokens.generated.css so the
  // [data-tenant] selectors (specificity 0,1,0) beat :root (specificity 0,0,1).
  const tenantsCssPath = join(ROOT, 'src', 'styles', 'tenants.css');
  await writeGenerated(
    tenantsCssPath,
    // A minimal placeholder keeps the import in theme.css from breaking.
    tenantResult.css ||
      '/* Generated by scripts/build-tokens.mjs — no direction overlays found */\n',
  );

  // The design-explorations demos (hds#628) never ship (hds#1205): their own
  // stylesheet, which theme.css does not import. docs-site/app/globals.css and
  // the tests that render them load it after the tokens.
  const docsOnlyResult = buildTenantCSS(directionsDir, raw, {
    strict: false,
    include: DOCS_ONLY_DIRECTIONS,
  });
  await writeGenerated(
    join(ROOT, 'src', 'styles', 'tenants-docs-only.css'),
    docsOnlyResult.css ||
      '/* Generated by scripts/build-tokens.mjs — no docs-only direction overlays found */\n',
  );

  // ── Accent themes (data-accent="<name>"): same overlay format as tenants ──
  const accentResult = buildTenantCSS(join(ROOT, 'accents'), raw, {
    attributes: ['data-accent'],
    header: ACCENT_HEADER,
  });
  if (accentResult.errors.length > 0) {
    console.error('\n✗ Accent overlay validation failed:');
    accentResult.errors.forEach((e) => console.error('  ' + e));
    process.exit(1);
  }
  await writeGenerated(join(ROOT, 'src', 'styles', 'accents.css'), accentResult.css);

  console.log('âœ“ src/styles/tokens.generated.css');
  console.log('âœ“ src/app/design-system/generated-tokens.ts');
  console.log('âœ“ src/app/design-system/generated-token-values.ts');
  console.log('âœ“ src/app/design-system/generated-token-descriptions.ts');
  console.log('âœ“ src/app/design-system/generated-token-vars.d.ts');
  console.log('âœ“ src/app/design-system/generated-token-refs.ts');
  console.log('âœ“ public/hds-manifest.json');
  console.log('âœ“ tailwind.config.tokens.cjs');
  console.log(`âœ“ src/styles/accents.css (${accentResult.tenants.join(', ')})`);
  console.log(
    `âœ“ src/styles/tenants.css (${tenantResult.tenants.length} direction(s): ${tenantResult.tenants.join(', ') || 'none'})`,
  );
}
