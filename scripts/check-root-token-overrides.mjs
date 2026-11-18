#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Fails when a hand-written top-level :root in src/styles re-declares a generated token with a different value.
 *
 * Why (folio #429): theme.css re-declared semantic.space.section.inset (128px against
 * the token's 96px) and three sidebar spacings in :root. dist/tokens.css,
 * styles.css and variables.css then disagreed, the token lost once styles.css
 * loaded, and a consumer that loads styles.css lazily saw a layout shift. The
 * token in hirobius.tokens.json must be the only winner: change the token, not CSS.
 *
 * Allowed: a rule inside @media (a responsive step) or under another selector
 * (such as [data-density] or [data-brand]); a top-level :root declaration with the
 * same value; a custom property that is not a generated token.
 *
 * Exit 0 when clean, 1 on any override.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HAND_FILES = ['theme.css', 'accents.css', 'tenants.css'];

const norm = (v) => v.replace(/\s+/g, ' ').trim();

/** Custom properties declared in a :root rule at the top level of `css` (not nested in @media etc.). */
export function topLevelRootDecls(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Map();
  let depth = 0;
  let selStart = 0;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '{') {
      const selector = src.slice(selStart, i).trim();
      if (depth === 0 && selector === ':root') {
        const end = src.indexOf('}', i);
        for (const m of src.slice(i + 1, end).matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) {
          out.set(m[1], norm(m[2]));
        }
        i = end;
        selStart = i + 1;
        continue;
      }
      depth += 1;
      selStart = i + 1;
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
      selStart = i + 1;
    } else if (ch === ';' && depth === 0) {
      selStart = i + 1;
    }
  }
  return out;
}

/** Each top-level :root declaration in `files` that gives a generated token another value. */
export function findRootOverrides(generatedCss, files) {
  const tokens = topLevelRootDecls(generatedCss);
  const found = [];
  for (const { file, css } of files) {
    for (const [name, value] of topLevelRootDecls(css)) {
      if (tokens.has(name) && tokens.get(name) !== value) {
        found.push({ file, name, token: tokens.get(name), found: value });
      }
    }
  }
  return found;
}

function main() {
  const read = (f) => readFileSync(resolve(ROOT, 'src/styles', f), 'utf8');
  const overrides = findRootOverrides(
    read('tokens.generated.css'),
    HAND_FILES.map((file) => ({ file, css: read(file) })),
  );
  if (overrides.length === 0) {
    console.log('✓ check-root-token-overrides — no hand-written :root overrides a generated token');
    return 0;
  }
  console.error(
    `✗ check-root-token-overrides — ${overrides.length} token(s) re-declared in a top-level :root:`,
  );
  for (const o of overrides) {
    console.error(`  - src/styles/${o.file}: ${o.name} is ${o.found}, the token says ${o.token}`);
  }
  console.error(
    '  fix: change the token in hirobius.tokens.json and run pnpm tokens, then delete the :root line. A responsive step goes in @media.',
  );
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
