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
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STYLES = resolve(ROOT, 'src/styles');
/** Every hand-written stylesheet in src/styles (the generated ones are the source of truth). */
export const handFiles = () =>
  readdirSync(STYLES).filter((f) => f.endsWith('.css') && !f.includes('.generated.'));

const norm = (v) => v.replace(/\s+/g, ' ').trim();

/**
 * Custom properties a :root rule declares outside any conditional block. Counts a selector
 * list that names :root (`:root, [data-hds]`) and a :root inside @layer or @supports; a
 * rule inside @media or @container is a deliberate responsive step and is skipped.
 * Values compare as text (whitespace folded), so an equal value written another way
 * (a literal for a var) reads as an override: write the token reference.
 */
export function topLevelRootDecls(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Map();
  const stack = [];
  let selStart = 0;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '{') {
      const selector = src.slice(selStart, i).trim();
      const conditional = stack.some((s) => /^@(media|container)\b/.test(s));
      const isRoot =
        !selector.startsWith('@') && selector.split(',').some((part) => part.trim() === ':root');
      if (isRoot && !conditional) {
        const end = src.indexOf('}', i);
        for (const m of src.slice(i + 1, end).matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) {
          out.set(m[1], norm(m[2]));
        }
        i = end;
        selStart = i + 1;
        continue;
      }
      stack.push(selector);
      selStart = i + 1;
    } else if (ch === '}') {
      stack.pop();
      selStart = i + 1;
    } else if (ch === ';' && stack.length === 0) {
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
  const read = (f) => readFileSync(resolve(STYLES, f), 'utf8');
  const overrides = findRootOverrides(
    read('tokens.generated.css'),
    handFiles().map((file) => ({ file, css: read(file) })),
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
