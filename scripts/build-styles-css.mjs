/**
 * build-styles-css — emit dist/styles.css: a RESET-FREE component stylesheet.
 *
 * Derives from the fully-built dist/tokens.css (tokens + component/utility CSS +
 * embedded fonts + HDS's own [data-hds]-scoped base) and removes ONLY Tailwind's
 * global preflight — the unscoped element reset inside `@layer base` that would
 * otherwise restyle a host app's `*`, `html`, `body`, headings, `button`, `a`,
 * and form controls.
 *
 * What stays: every `@layer` except the preflight rules — the token vars, the
 * `--tw-*` property defaults, the component/utility classes, the embedded
 * @font-face, and HDS's own base rules (which are all `:where([data-hds])`
 * scoped, so they only touch HDS's own subtree, never host elements). The
 * scoped box-model reset added in theme.css means HDS components keep their
 * border-box model without the global preflight.
 *
 * Result: `import '@hirobius/design-system/styles.css'` styles every HDS
 * component and changes ZERO host-element styles. See docs/CONSUMING.md and
 * docs/adr/016-scoped-base-styles.md.
 *
 * Part of `pnpm build:lib` (runs after embed-fonts, so fonts are inlined here
 * too). Idempotent: reads tokens.css, never mutates it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'dist', 'tokens.css');
const OUT = path.join(ROOT, 'dist', 'styles.css');

const banner =
  '/* @hirobius/design-system/styles.css — tokens + components + utilities +\n' +
  ' * embedded fonts, with NO global reset/preflight. HDS base styles are\n' +
  ' * scoped to [data-hds]; importing this changes zero host-element styles.\n' +
  ' * For the batteries-included bundle (adds a global reset) use tokens.css. */\n';

/**
 * Return [startIndex, endIndexExclusive) of a top-level `@layer <name>{ ... }`
 * block via brace matching, or null if absent.
 */
function findLayer(src, name) {
  const marker = `@layer ${name}{`;
  const start = src.indexOf(marker);
  if (start < 0) return null;
  let i = start + marker.length;
  let depth = 1;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return { start, bodyStart: start + marker.length, bodyEnd: i, end: i + 1 };
}

/**
 * Split a layer body into top-level rules (selector/at-rule prelude + brace
 * block) and keep only those whose text references `[data-hds]` — i.e. HDS's
 * own scoped base — dropping the unscoped Tailwind preflight. Preflight rules
 * never contain `[data-hds]`; HDS scoped rules always do (even when nested in
 * an `@media`/`@supports` prelude), so the substring test is exact here.
 */
function keepScopedOnly(body) {
  let out = '';
  let depth = 0;
  let prelude = '';
  let block = '';
  let inBlock = false;
  let dropped = 0;
  let kept = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (!inBlock) {
      if (c === '{') {
        inBlock = true;
        depth = 1;
        block = '{';
      } else {
        prelude += c;
      }
    } else {
      block += c;
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          const rule = prelude + block;
          if (rule.includes('[data-hds]')) {
            out += rule;
            kept++;
          } else {
            dropped++;
          }
          prelude = '';
          block = '';
          inBlock = false;
        }
      }
    }
  }
  return { css: out, kept, dropped };
}

const tokens = readFileSync(SRC, 'utf8');
const base = findLayer(tokens, 'base');
if (!base) {
  console.error(
    'build-styles-css: no `@layer base` found in dist/tokens.css — did the build change?',
  );
  process.exit(1);
}

const filtered = keepScopedOnly(tokens.slice(base.bodyStart, base.bodyEnd));
const rebuiltBase = `@layer base{${filtered.css}}`;
const out = banner + tokens.slice(0, base.start) + rebuiltBase + tokens.slice(base.end);

// ── Guards: fail loudly if the strip left preflight behind or nuked components ─
const preflightSignatures = [
  '*,:after,:before,::backdrop{box-sizing',
  '*,:before,:after,::backdrop{box-sizing',
  'html,:host{',
  'h1,h2,h3,h4,h5,h6{font-size:inherit',
];
const leaked = preflightSignatures.filter((sig) => out.includes(sig));
if (leaked.length > 0) {
  console.error('build-styles-css: refusing to emit — global preflight still present:');
  for (const s of leaked) console.error('  ' + s);
  process.exit(1);
}
if (!out.includes(':where([data-hds])')) {
  console.error('build-styles-css: refusing to emit — scoped [data-hds] base was lost.');
  process.exit(1);
}
if (!out.includes('@layer utilities')) {
  console.error(
    'build-styles-css: refusing to emit — utilities layer missing (components would be unstyled).',
  );
  process.exit(1);
}
if (filtered.kept === 0) {
  console.error(
    'build-styles-css: refusing to emit — kept 0 scoped base rules (extractor mismatch).',
  );
  process.exit(1);
}

writeFileSync(OUT, out);
console.log(
  `build-styles-css — wrote dist/styles.css (${out.length} bytes; base layer: kept ${filtered.kept} scoped rule(s), dropped ${filtered.dropped} preflight rule(s))`,
);
