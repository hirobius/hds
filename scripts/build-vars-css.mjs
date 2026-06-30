/**
 * build-vars-css — emit dist/variables.css: a VARS-ONLY stylesheet.
 *
 * Ships the design-token CSS custom properties (`src/styles/tokens.generated.css`)
 * with NO Tailwind preflight, NO @layer base reset, NO utilities — only
 * `:root` / `[data-theme]` / `.dark` custom-property declarations. Importing it
 * cannot restyle a host app's elements, so it is the safe path for embedding HDS
 * tokens inside another design system (e.g. MUI). See docs/CONSUMING.md.
 *
 * Part of `pnpm build:lib`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src', 'styles', 'tokens.generated.css');
const OUT = path.join(ROOT, 'dist', 'variables.css');

const banner =
  '/* @hirobius/design-system/variables.css — design tokens as CSS custom\n' +
  ' * properties ONLY (no reset, no preflight, no utilities). Safe to import\n' +
  ' * alongside another design system; cannot restyle host elements. */\n';

const css = readFileSync(SRC, 'utf8');

// Guard: this file must stay host-safe — only :root / [data-theme] / .dark
// selectors are permitted (no bare element/`*` selectors that could reach host).
const offending = css
  .split('\n')
  .filter((line) => /^[^\s/}@][^{]*\{/.test(line))
  .filter((line) => !/(:root|\[data-theme|\.dark)/.test(line));
if (offending.length > 0) {
  console.error('build-vars-css: refusing to emit — non-vars selectors found:');
  for (const l of offending.slice(0, 5)) console.error('  ' + l.trim());
  process.exit(1);
}

writeFileSync(OUT, banner + css);
console.log(`build-vars-css — wrote dist/variables.css (${css.length} bytes, vars-only)`);
