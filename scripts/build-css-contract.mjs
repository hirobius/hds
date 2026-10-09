#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * build-css-contract.mjs — writes dist/css-contract.json, the CSS surface a
 * consumer can rely on (hds#449).
 *
 * Why: the release snapshot (scripts/upgrade/snapshot.mjs) recorded the JS
 * surface only. From 0.19.1 to 0.20.0 the stylesheets lost 148 class names
 * (24 hds-*, about 124 Tailwind utilities), 0.17.0 changed ten primitive type
 * sizes, and nothing compared them: a consumer that used `hds-focus` or a
 * token value had no step to read. This contract is what the snapshot, the
 * diff and the CSS gate (scripts/check-upgrade-css.mjs) read.
 *
 * For each stylesheet package.json#exports names (./tokens.css, ./styles.css,
 * ./fonts.css, ./variables.css, ./static.css), keyed by its exports key:
 *
 *   - variables: every custom property declared in a context rule, with the
 *     value that wins in that context (the last declaration, unless an earlier
 *     one is !important). A context is the rule's selector with its enclosing
 *     at-rules in front, as written in the minified bundle: `:root`,
 *     `[data-theme=dark]`, `[data-density=compact]`, each
 *     `[data-brand=<slug>],[data-tenant=<slug>]`, `@media (max-width:639px)
 *     :root`, `@layer theme :root,:host`. A rule whose selector names a class
 *     (other than `.dark`) is a component or utility, not a context: the
 *     `--tw-*` plumbing a utility sets is not part of the contract, and
 *     neither are @property registrations;
 *   - classes: every class name a selector names, unescaped as a consumer
 *     writes it in className (`sm:inline-block`, `text-muted-foreground/70`), sorted;
 *   - fontFaces: each @font-face as { family, weight, style, src }, src being
 *     each url() basename (`satoshi-400.woff2`), `data:<type>` for an inlined
 *     face, or `local(<name>)`;
 *   - layers: the @layer names in the order they are declared (the order is
 *     the cascade, so it is not sorted).
 *
 * Plus publicClasses: the classes the manifest (public/hds-manifest.json)
 * declares public beyond the hds-* prefix rule (empty for a package whose
 * manifest predates the field).
 *
 * The values are the minified text of the built bundle, the same bytes on
 * every path that reads it: build:lib writes this file from dist/, and
 * `snapshot.mjs --from-npm` reads it from a tarball, or, for a release that
 * shipped before it, builds it from that tarball's stylesheets with this same
 * code. Deterministic: sorted keys, no timestamps.
 *
 *   node scripts/build-css-contract.mjs [--root <package dir>]           # write dist/css-contract.json
 *   node scripts/build-css-contract.mjs [--root <package dir>] --check   # exit 1 when it is stale
 *
 * Part of `pnpm build:lib`, after every stylesheet is written.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTRACT_FILE, buildCssContract, formatContract } from './lib/css-contract.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function main(argv) {
  let root = REPO;
  let check = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') root = resolve(argv[++i] ?? '.');
    else if (argv[i] === '--check') check = true;
    else {
      console.error(`build-css-contract: unknown argument ${argv[i]}`);
      console.error('usage: build-css-contract.mjs [--root <package dir>] [--check]');
      return 2;
    }
  }
  const contract = buildCssContract(root);
  if (!contract) {
    console.error(
      `build-css-contract: ${root} has none of the stylesheets its package.json#exports names; run pnpm build:lib first`,
    );
    return 1;
  }
  const text = formatContract(contract);
  const file = join(root, CONTRACT_FILE);
  if (check) {
    const committed = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (committed !== text) {
      console.error(
        `build-css-contract: ${CONTRACT_FILE} is not the contract of the stylesheets beside it; run node scripts/build-css-contract.mjs (pnpm build:lib does)`,
      );
      return 1;
    }
    console.log(`build-css-contract: ${CONTRACT_FILE} is current`);
    return 0;
  }
  writeFileSync(file, text);
  const counts = Object.entries(contract.bundles).map(
    ([key, b]) => `${key} ${Object.keys(b.variables).length} vars, ${b.classes.length} classes`,
  );
  console.log(`build-css-contract — wrote ${CONTRACT_FILE} (${counts.join('; ')})`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`build-css-contract: ${error?.message ?? error}`);
    process.exitCode = 2;
  }
}
