/**
 * build-static-css — emit dist/static.css: the CSS-only static-primitive layer (#64).
 *
 * Copies the hand-authored src/styles/static.css (Badge/Card/Alert/Divider/Tag
 * as plain `.hds-*` classes, no React, no build step needed to author it) into
 * dist/static.css with a banner, exactly as build-vars-css.mjs does for
 * variables.css. Unlike styles.css/variables.css (both DERIVED from the
 * Tailwind-built dist/tokens.css), static.css is source-of-truth-authored —
 * there's no Tailwind/cva layer to strip, so this step is a copy + host-safety
 * guard, not an extraction.
 *
 * Guard: every rule (including inside @media/@supports) must be scoped with a
 * `.hds-` class somewhere in its selector — no bare element selectors, no `*`,
 * no `:root`. Mirrors build-vars-css.mjs's host-safety guard and
 * build-styles-css.mjs's brace-aware rule scanner.
 *
 * Part of `pnpm build:lib`. Idempotent: reads static.css, never mutates it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src', 'styles', 'static.css');
const OUT = path.join(ROOT, 'dist', 'static.css');

const banner =
  '/* @hirobius/design-system/static.css — CSS-only static-primitive layer.\n' +
  ' * Plain `.hds-badge` / `.hds-card` / `.hds-alert` / `.hds-divider` / `.hds-tag`\n' +
  ' * classes for Badge/Card/Alert/Divider/Tag with NO React and NO reset — every\n' +
  ' * rule is scoped to `.hds-*` and bound to the same design tokens the React\n' +
  ' * components use, so it stays theme-aware via [data-theme]/[data-brand]. Pair\n' +
  ' * with @hirobius/design-system/variables.css for the token vars themselves.\n' +
  ' * See docs/CONSUMING.md §14. */\n';

/**
 * Split `css` into top-level rules — { prelude, body } pairs via brace
 * matching — so nested @media/@supports blocks can be recursed into.
 */
function splitTopLevelRules(css) {
  const rules = [];
  let depth = 0;
  let prelude = '';
  let bodyStart = -1;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (depth === 0) {
      if (c === '{') {
        depth = 1;
        bodyStart = i + 1;
      } else {
        prelude += c;
      }
    } else {
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          rules.push({ prelude: prelude.trim(), body: css.slice(bodyStart, i) });
          prelude = '';
        }
      }
    }
  }
  return rules;
}

/**
 * Recursively collect selector/at-rule preludes that are NOT scoped to
 * `.hds-` anywhere in their text. @media/@supports preludes are exempt (they
 * carry no selector) but their bodies are recursed into.
 */
function findUnscopedRules(css, out = []) {
  for (const { prelude, body } of splitTopLevelRules(css)) {
    const isConditional = /^@(media|supports)\b/.test(prelude);
    if (isConditional) {
      findUnscopedRules(body, out);
      continue;
    }
    if (!prelude || prelude.startsWith('/*')) continue; // stray comment-only prelude
    if (!prelude.includes('.hds-')) out.push(prelude);
  }
  return out;
}

const css = readFileSync(SRC, 'utf8');

// Guard 1: every rule must be `.hds-*` scoped (strip comments first so a
// `.hds-` mention inside a comment doesn't mask an unscoped selector).
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
const unscoped = findUnscopedRules(cssNoComments);
if (unscoped.length > 0) {
  console.error('build-static-css: refusing to emit — unscoped selector(s) found:');
  for (const sel of unscoped.slice(0, 10)) console.error('  ' + sel);
  process.exit(1);
}

// Guard 2: no bare `:root` or universal `*` selector anywhere.
if (/(^|[^.\w-]):root\b/.test(cssNoComments) || /(^|[^.\w-])\*\s*[,{]/.test(cssNoComments)) {
  console.error('build-static-css: refusing to emit — :root or universal `*` selector found.');
  process.exit(1);
}

// Guard 3: sanity — the five primitives must actually be present.
const requiredClasses = ['.hds-badge', '.hds-card', '.hds-alert', '.hds-divider', '.hds-tag'];
const missing = requiredClasses.filter((cls) => !css.includes(cls));
if (missing.length > 0) {
  console.error('build-static-css: refusing to emit — missing primitive class(es):', missing);
  process.exit(1);
}

writeFileSync(OUT, banner + css);
console.log(`build-static-css — wrote dist/static.css (${css.length} bytes, .hds-* scoped)`);
