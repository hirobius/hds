/**
 * Parity gate for the Style Dictionary multi-format emitter.
 *
 * Verifies that every scalar CSS variable produced by scripts/tokens-sd/config.mjs
 * appears — with a byte-identical value — in the canonical generator's on-disk
 * output (src/styles/tokens.generated.css, written by scripts/build-tokens.mjs).
 *
 * This is a LIVE check against the real generated file, not a frozen snapshot,
 * so it can never drift the way the POC's expected.css did (it silently fell
 * behind when the `stone` ramp was added). Run build-tokens first if the source
 * has changed.
 *
 *   SD-covered scalar vars  ⊆  tokens.generated.css :root   (values must match)
 *
 * Vars present in tokens.generated.css but not in the SD output are EXPECTED —
 * they are the deferred composites (typography/motion/elevation/shadow) and the
 * dark-mode / tenant blocks this emitter intentionally does not cover.
 *
 * Exit 0 = parity holds. Exit 1 = a covered var is missing or mismatched.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { generateCss } from './config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

/** Parse `--name: value;` declarations from the FIRST :root { … } block. */
function parseRootVars(css) {
  const start = css.indexOf(':root {');
  if (start === -1) throw new Error('no :root block found');
  const end = css.indexOf('}', start);
  const body = css.slice(start + ':root {'.length, end);
  const map = new Map();
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*(--[A-Za-z0-9-]+)\s*:\s*(.+?);\s*$/);
    if (m) map.set(m[1], m[2].trim());
  }
  return map;
}

async function main() {
  const canonical = parseRootVars(
    readFileSync(join(ROOT, 'src/styles/tokens.generated.css'), 'utf8'),
  );
  const sd = parseRootVars(await generateCss());

  const missing = [];
  const mismatched = [];
  for (const [name, value] of sd) {
    if (!canonical.has(name)) {
      missing.push(name);
    } else if (canonical.get(name) !== value) {
      mismatched.push({ name, sd: value, canonical: canonical.get(name) });
    }
  }

  console.log('=== Style Dictionary ↔ build-tokens parity ===');
  console.log(`SD covered vars:        ${sd.size}`);
  console.log(`Canonical :root vars:   ${canonical.size} (incl. deferred composites + dark refs)`);
  console.log(`Deferred (in canonical, not SD): ${canonical.size - (sd.size - missing.length)}`);

  if (missing.length) {
    console.log(`\n✗ ${missing.length} SD var(s) absent from tokens.generated.css:`);
    missing.slice(0, 20).forEach((n) => console.log(`    ${n}`));
  }
  if (mismatched.length) {
    console.log(`\n✗ ${mismatched.length} value mismatch(es):`);
    mismatched.slice(0, 20).forEach((m) =>
      console.log(`    ${m.name}\n        SD:        ${m.sd}\n        canonical: ${m.canonical}`),
    );
  }

  if (missing.length || mismatched.length) {
    console.log('\nRESULT: FAIL');
    process.exit(1);
  }
  console.log(`\nRESULT: PASS — all ${sd.size} covered scalar vars match the canonical generator.`);
}

main().catch((err) => {
  console.error('parity check errored:', err);
  process.exit(1);
});
