/**
 * build-static-css — emit dist/static.css: the CSS-only static-primitive layer.
 *
 * Ships the hand-authored `src/styles/static.css` (semantic `.hds-badge`,
 * `.hds-card`, `.hds-alert`, `.hds-divider`, `.hds-tag` classes + modifiers,
 * bound to HDS semantic/component custom properties) so a static Astro page
 * (or any zero-React consumer) can render the 5 static primitives with plain
 * HTML. Pair with `@hirobius/design-system/variables.css` for the token
 * spine. See docs/CONSUMING.md §14 and ADR-020 §6 / #64.
 *
 * Part of `pnpm build:lib`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src', 'styles', 'static.css');
const OUT = path.join(ROOT, 'dist', 'static.css');

const banner =
  '/* @hirobius/design-system/static.css — CSS-only classes for the 5 static\n' +
  ' * primitives (Badge, Card, Alert, Divider, Tag). No React, no reset, no\n' +
  ' * preflight — pair with variables.css for the token spine. See\n' +
  ' * docs/CONSUMING.md §14. */\n';

const css = readFileSync(SRC, 'utf8');

/**
 * Returns true if a selector contains anything other than `.hds-*` classes,
 * pseudo-classes/elements, and combinators — i.e. a bare element/id/`*`
 * selector that could reach outside HDS's own classes into host markup.
 */
function hasHostUnsafeSelector(selector) {
  let s = selector;
  s = s.replace(/:{1,2}[a-zA-Z-]+(\([^)]*\))?/g, ''); // :hover, ::before, :not(...)
  s = s.replace(/\.hds-[a-zA-Z0-9_-]+/g, ''); // .hds-* classes
  s = s.replace(/[\s,>+~]/g, ''); // combinators/whitespace/commas
  return s.length > 0;
}

// Guard: every rule in this file must be scoped to a `.hds-*` class — no bare
// element/id/`*` selectors that could restyle a consumer's own markup.
const offending = css
  .split('\n')
  .filter((line) => /^[^\s/}@][^{]*\{/.test(line))
  .filter((line) => hasHostUnsafeSelector(line.slice(0, line.indexOf('{')).trim()));
if (offending.length > 0) {
  console.error('build-static-css: refusing to emit — host-unsafe selector(s) found:');
  for (const l of offending.slice(0, 5)) console.error('  ' + l.trim());
  process.exit(1);
}

writeFileSync(OUT, banner + css);
console.log(`build-static-css — wrote dist/static.css (${css.length} bytes, .hds-* scoped)`);
