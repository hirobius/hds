#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/build-fonts-css.mjs (hds#479)
 *
 * LIBRARY post-build step. Replaces the old embed-fonts step, which base64-
 * inlined the faces into dist/tokens.css. Fonts are now an opt-in export:
 *
 *   dist/fonts.css                 the @font-face blocks, URLs relative to it
 *   dist/fonts/<face>.woff2        the font files
 *
 * `import '@hirobius/design-system/fonts.css'` makes a bundler (Vite, Next,
 * webpack) resolve and hash the files. A consumer that brings its own fonts
 * skips the import and pays nothing; tokens.css keeps the font-family
 * variables, so it falls back to the family stack.
 *
 * The app build is untouched: src/styles/fonts.css keeps its absolute
 * `/fonts/...` URLs, served from public/. This reads that file as the single
 * source of the declarations, so there is no second list to drift.
 *
 * Runs ONLY after `build:lib`. Idempotent. Fails loudly when a font file is
 * missing, a face is not declared in src/styles/fonts.css, or tokens.css still
 * carries a @font-face.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_CSS = join(ROOT, 'src', 'styles', 'fonts.css');
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');

// Keep in sync with the @font-face URLs in src/styles/fonts.css (checked below).
export const FONTS = [
  'fonts/satoshi/satoshi-400.woff2',
  'fonts/satoshi/satoshi-500.woff2',
  'fonts/satoshi/satoshi-700.woff2',
  'fonts/ibm-plex-mono/ibm-plex-mono-400.woff2',
];

const banner =
  '/* @hirobius/design-system/fonts.css — OPTIONAL brand fonts: Satoshi 400/500/700\n' +
  ' * and IBM Plex Mono 400. tokens.css and styles.css do not include them. Import this\n' +
  ' * once at the app root for the HDS faces, or skip it and load your own; the\n' +
  ' * font-family variables in tokens.css fall back to the family stack either way.\n' +
  ' * The woff2 URLs are relative to this file so your bundler resolves and hashes them. */\n';

/** Rewrite each `/fonts/<family>/<file>` URL to `./fonts/<file>`; throws if one is absent. */
export function buildFontsCss(src) {
  let css = src;
  for (const font of FONTS) {
    const abs = `/${font}`;
    const pattern = new RegExp(
      `url\\((['"]?)${abs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1\\)`,
      'g',
    );
    const next = css.replace(pattern, `url('./fonts/${basename(font)}')`);
    if (next === css) throw new Error(`font URL not found in src/styles/fonts.css: ${abs}`);
    css = next;
  }
  if (/url\(['"]?\//.test(css)) {
    throw new Error('src/styles/fonts.css declares a face that FONTS does not list');
  }
  // Drop the app-build comment about /fonts/ paths; it is wrong for the package.
  css = css.replace(/\s*\/\* App build: served from public\/fonts[\s\S]*?\*\//, '');
  return banner + css;
}

function main() {
  const log = (m) => console.log(`[build-fonts-css] ${m}`);
  const fail = (m) => {
    console.error(`[build-fonts-css] FAIL — ${m}`);
    process.exit(1);
  };
  const tokens = join(DIST, 'tokens.css');
  if (!existsSync(tokens)) fail(`${tokens} not found. Run build:lib first.`);
  const t = readFileSync(tokens, 'utf8');
  if (t.includes('@font-face') || t.includes('data:font')) {
    fail('dist/tokens.css still carries @font-face or data:font; fonts must live in fonts.css.');
  }

  mkdirSync(join(DIST, 'fonts'), { recursive: true });
  for (const font of FONTS) {
    const file = join(PUBLIC, font);
    if (!existsSync(file)) fail(`font file missing: ${file}`);
    copyFileSync(file, join(DIST, 'fonts', basename(font)));
  }
  try {
    writeFileSync(join(DIST, 'fonts.css'), buildFontsCss(readFileSync(SRC_CSS, 'utf8')));
  } catch (e) {
    fail(e.message);
  }
  log(`done — dist/fonts.css + ${FONTS.length} woff2 in dist/fonts/`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
