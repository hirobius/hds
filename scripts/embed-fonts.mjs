#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/embed-fonts.mjs
 *
 * LIBRARY post-build step. The app build serves fonts from `public/fonts` via
 * the `/fonts/...` URLs in src/styles/fonts.css (unchanged, preloadable — no
 * effect on the docs site's render / CLS). The published package has no web
 * root, so those `/fonts/...` URLs would 404 for consumers.
 *
 * This step rewrites the `/fonts/<family>/<file>.woff2` URLs in dist/tokens.css
 * into base64 `data:` URIs, so importing `@hirobius/design-system/tokens.css`
 * ships self-contained fonts with zero consumer setup (P0.3, option a).
 *
 * Runs ONLY after `build:lib` — never against the app build. Idempotent. Fails
 * loudly if a referenced font file is missing or no `/fonts/` URL is found
 * (catches a fonts.css ↔ this-script drift).
 *
 * Exit codes: 0 = embedded, 1 = a font file missing or nothing to embed.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_CSS = join(ROOT, 'dist', 'tokens.css');
const PUBLIC = join(ROOT, 'public');

// Keep in sync with the @font-face URLs in src/styles/fonts.css.
const FONTS = [
  '/fonts/satoshi/satoshi-500.woff2',
  '/fonts/clash-display/clash-display-500.woff2',
  '/fonts/geist-mono/geist-mono-400.woff2',
];

function log(msg) {
  console.log(`[embed-fonts] ${msg}`);
}

if (!existsSync(TOKENS_CSS)) {
  console.error(`[embed-fonts] FAIL — ${TOKENS_CSS} not found. Run build:lib first.`);
  process.exit(1);
}

let css = readFileSync(TOKENS_CSS, 'utf8');
let embedded = 0;

for (const url of FONTS) {
  const file = join(PUBLIC, url.replace(/^\//, ''));
  if (!existsSync(file)) {
    console.error(`[embed-fonts] FAIL — font file missing: ${file}`);
    process.exit(1);
  }
  const b64 = readFileSync(file).toString('base64');
  const dataUri = `data:font/woff2;base64,${b64}`;
  // Match url('/fonts/..'), url("/fonts/.."), and url(/fonts/..).
  const pattern = new RegExp(`url\\((['"]?)${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1\\)`, 'g');
  const before = css;
  css = css.replace(pattern, `url(${dataUri})`);
  if (css === before) {
    console.error(`[embed-fonts] FAIL — URL not found in dist/tokens.css: ${url}`);
    console.error('  fonts.css and this script have drifted, or the build did not emit the URL.');
    process.exit(1);
  }
  embedded += 1;
  log(`embedded ${url} (${Math.round(b64.length / 1024)}KB base64)`);
}

writeFileSync(TOKENS_CSS, css);
log(`done — ${embedded}/${FONTS.length} fonts inlined into dist/tokens.css`);
