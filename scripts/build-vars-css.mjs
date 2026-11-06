/**
 * build-vars-css — emit dist/variables.css: a VARS-ONLY stylesheet.
 *
 * Ships the design-token CSS custom properties (`src/styles/tokens.generated.css`)
 * and the opt-in accent themes (`src/styles/accents.css`, `data-accent="cobalt"`,
 * hds#1313) with NO Tailwind preflight, NO @layer base reset, NO utilities — only
 * `:root` / `[data-theme]` / `[data-density]` / `[data-accent]` / `.dark`
 * custom-property declarations. Importing it cannot restyle a host app's
 * elements, so it is the safe path for embedding HDS tokens inside another design
 * system (e.g. MUI), and a token-only consumer can still pick an accent. See
 * docs/CONSUMING.md.
 *
 * Part of `pnpm build:lib`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = path.join(ROOT, 'src', 'styles', 'tokens.generated.css');
const ACCENTS = path.join(ROOT, 'src', 'styles', 'accents.css');
const OUT = path.join(ROOT, 'dist', 'variables.css');

const BANNER =
  '/* @hirobius/design-system/variables.css — design tokens as CSS custom\n' +
  ' * properties ONLY (no reset, no preflight, no utilities). Safe to import\n' +
  ' * alongside another design system; cannot restyle host elements.\n' +
  ' * Accents: set data-accent="<name>" (e.g. cobalt) on <html> or a wrapper. */\n';

/** Selectors a vars-only sheet may use: none can match a host element on its own. */
const HOST_SAFE = /(:root|\[data-theme|\[data-density|\[data-accent|\.dark)/;

/** Rule lines whose selector is not host-safe (empty when the sheet is safe). */
export function offendingSelectors(css) {
  return css
    .split('\n')
    .filter((line) => /^[^\s/}@][^{]*\{/.test(line))
    .filter((line) => !HOST_SAFE.test(line));
}

/**
 * The variables.css text: banner, token vars, then the accent blocks. Accents
 * come last so `[data-accent]` wins over `:root` at equal specificity, the same
 * order theme.css imports them in. Throws when either input is not host-safe.
 */
export function varsCss(tokensCss, accentsCss) {
  const bad = [...offendingSelectors(tokensCss), ...offendingSelectors(accentsCss)];
  if (bad.length > 0) {
    throw new Error(
      `build-vars-css: refusing to emit — non-vars selectors found:\n${bad
        .slice(0, 5)
        .map((l) => `  ${l.trim()}`)
        .join('\n')}`,
    );
  }
  return `${BANNER}${tokensCss}\n${accentsCss}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const css = varsCss(readFileSync(TOKENS, 'utf8'), readFileSync(ACCENTS, 'utf8'));
    writeFileSync(OUT, css);
    console.log(`build-vars-css — wrote dist/variables.css (${css.length} bytes, vars-only)`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
