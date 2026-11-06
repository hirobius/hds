#!/usr/bin/env node
/**
 * tokens-subpath codemod (hds#1205)
 *
 * Rewrites `import { hds, tokens } from '@hirobius/design-system'` to
 * `import { hds, tokens } from '@hirobius/design-system/tokens'`. 0.34.0
 * deprecated the root copies of the token bridge (`hds`) and the raw DTCG
 * tokens (`tokens`); 0.35.0 removes them. Other root names stay on the root.
 * The move is the one patterns-subpath does (`transformSource` there):
 * aliases, `type` modifiers, layout and comments are kept, and an existing
 * `/tokens` import of the same kind is extended instead of duplicated. A
 * namespace import, dynamic `import()`, `require()` or mock of the root that
 * reads `hds` or `tokens` off the module is reported for a manual edit.
 *
 *   node codemods/tokens-subpath.mjs [--root <dir>] [--check] [--dry-run]
 *
 *   --root <dir>  directory to scan (default: current directory)
 *   --check       write nothing; exit 1 when a rewrite or a manual edit is needed
 *   --dry-run     write nothing; print each import line before (-) and after (+), exit 0
 */
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { writeFileAtomic } from './lib/atomic-write.mjs';
import { isEntry, walk } from './jsx-fold.mjs';
import { findUnrewritable, transformSource as moveNames } from './patterns-subpath.mjs';

const ROOT_PKG = '@hirobius/design-system';
export const SUBPATH = `${ROOT_PKG}/tokens`;
/** The root names that moved to `/tokens`. */
export const NAMES = Object.freeze(['hds', 'tokens']);

/** Pure transform of one file's source: `{ source, changed, sites, moved, edits }`. */
export function transformSource(source) {
  return moveNames(source, new Set(NAMES), { from: ROOT_PKG, to: SUBPATH });
}

/** Root uses the rewrite cannot reach (namespace or dynamic imports that read a moved name). */
export function findManual(source) {
  return findUnrewritable(source, new Set(NAMES));
}

/** Scan a directory. Writes only when `write` is true; `skip` lists directories not to enter. */
export function runCodemod({ root, write = false, skip = [] }) {
  const files = [];
  const manual = [];
  const moved = new Set();
  let sites = 0;
  for (const file of walk(root, new Set(skip.map((d) => resolve(d))))) {
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue; // unreadable: nothing to rewrite
    }
    if (!src.includes(ROOT_PKG)) continue;
    for (const stmt of findManual(src)) manual.push({ file: relative(root, file), stmt });
    const r = transformSource(src);
    if (!r.changed) continue;
    files.push({ file: relative(root, file), sites: r.sites, moved: r.moved, edits: r.edits });
    r.moved.forEach((n) => moved.add(n));
    sites += r.sites;
    if (write) writeFileAtomic(file, r.source);
  }
  return { files, sites, manual, names: [...moved].sort() };
}

function main(argv) {
  const args = { root: process.cwd(), check: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') args.root = resolve(argv[++i] ?? '');
    else if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else {
      console.error(
        `unknown argument: ${argv[i]}\nusage: tokens-subpath [--root <dir>] [--check] [--dry-run]`,
      );
      return 2;
    }
  }
  const write = !args.check && !args.dryRun;
  const res = runCodemod({ root: args.root, write });
  const summary = `${res.files.length} files, ${res.sites} import sites`;
  const manualLines = res.manual.map(
    (m) => `  ${m.file}: ${m.stmt} (move to '${SUBPATH}' by hand)`,
  );
  if (args.check) {
    if (res.sites > 0 || res.manual.length > 0) {
      console.error(`tokens-subpath: rewrite needed: ${summary}`);
      for (const f of res.files) console.error(`  ${f.file}: ${f.moved.join(', ')}`);
      for (const l of manualLines) console.error(l);
      return 1;
    }
    console.log('tokens-subpath: nothing to rewrite');
    return 0;
  }
  console.log(`tokens-subpath: ${write ? 'rewrote' : 'would rewrite'} ${summary}`);
  for (const f of res.files) {
    console.log(`  ${f.file}: ${f.moved.join(', ')}`);
    if (args.dryRun)
      for (const e of f.edits) {
        for (const l of e.before.split('\n')) console.log(`- ${l}`);
        for (const l of e.after.split('\n')) console.log(`+ ${l}`);
      }
  }
  if (res.manual.length > 0) {
    console.warn('tokens-subpath: cannot rewrite these, do them by hand:');
    for (const l of manualLines) console.warn(l);
  }
  return 0;
}

if (isEntry(import.meta.url)) process.exit(main(process.argv.slice(2)));
