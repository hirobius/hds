#!/usr/bin/env node
/**
 * hds-spacing-steps codemod
 *
 * The primitive spacing steps `px6` (6px) and `px10` (10px) sit off the 4px grid.
 * They are deprecated and removed in 0.28.0. This rewrites each to the nearest
 * on-grid step, rounding toward roomier (6px -> 8px, 10px -> 12px):
 *
 *   - CSS var   `--primitive-space-px6`  -> `--primitive-space-2`   (px10 -> -3)
 *   - JS token  `hds.space.px6`          -> `hds.space.px8`         (px10 -> px12);
 *               any `<ident>.space.px6`, but not `.semantic.space.*`
 *   - DTCG path `primitive.space.px6`    -> `primitive.space.2`     (px10 -> 3),
 *               also inside a `{primitive.space.px6}` reference
 *   - Tailwind  `p-px6` -> `p-2`, `-mt-px10` -> `-mt-3`, `md:gap-px6` -> `md:gap-2`
 *               on the padding, margin, gap and space-x/y utilities
 *
 * A plain text rewrite on whole tokens (word boundaries), so `px1`, `px2`,
 * `px60` and `--primitive-space-px6-x` stay as written. Running it twice
 * changes nothing. This file is never rewritten, so its own examples stay put.
 *
 *   node codemods/spacing-steps.mjs [--root <dir>] [--check] [--dry-run]
 *
 *   --root <dir>  directory to scan (default: current directory)
 *   --check       write nothing; exit 1 when a rewrite is needed
 *   --dry-run     write nothing; print each changed line before (-) and after (+), exit 0
 */
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { writeFileAtomic } from './lib/atomic-write.mjs';
import { relative, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '.css',
  '.scss',
  '.less',
  '.html',
  '.vue',
  '.svelte',
  '.json',
]);
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  '.vercel',
  'coverage',
]);
const SELF = fileURLToPath(import.meta.url);

/** Old step key -> the on-grid step it becomes: `scale` (CSS var, DTCG) and `js` (hds.space key). */
export const STEPS = Object.freeze({
  px6: { scale: '2', js: 'px8' },
  px10: { scale: '3', js: 'px12' },
});

const UTILS = 'gap-x|gap-y|gap|space-x|space-y|px|py|pt|pr|pb|pl|ps|pe|p|mx|my|mt|mr|mb|ml|ms|me|m';

// Each rule: a pattern over one token, and the text for a matched step key.
const RULES = [
  // --primitive-space-px6
  [
    /(?<![\w-])--primitive-space-(px6|px10)(?![\w-])/g,
    (m, k) => `--primitive-space-${STEPS[k].scale}`,
  ],
  // primitive.space.px6, with or without braces (a DTCG path or reference)
  [
    /(?<![\w$.])primitive\.space\.(px6|px10)(?![\w$-])/g,
    (m, k) => `primitive.space.${STEPS[k].scale}`,
  ],
  // hds.space.px6, but not hds.semantic.space.px6
  [
    /(?<![\w$.])(?!semantic\.|primitive\.)([A-Za-z_$][\w$]*)\.space\.(px6|px10)(?![\w$-])/g,
    (m, id, k) => `${id}.space.${STEPS[k].js}`,
  ],
  // p-px6, -mt-px10, md:gap-px6, hover:!px-px10
  [
    new RegExp(`(?<![\\w-])([-!]*)(${UTILS})-(px6|px10)(?![\\w-])`, 'g'),
    (m, sign, util, k) => `${sign}${util}-${STEPS[k].scale}`,
  ],
];

/**
 * Pure transform of one file's source.
 * @param {string} source
 * @returns {{ source: string, changed: boolean, sites: number, names: string[],
 *   edits: { line: number, before: string, after: string }[] }}
 */
export function transformSource(source) {
  let out = source;
  let sites = 0;
  const names = new Set();
  for (const [re, fn] of RULES) {
    out = out.replace(re, (...a) => {
      sites++;
      const key = a.find((x) => typeof x === 'string' && Object.hasOwn(STEPS, x));
      names.add(key);
      return fn(...a);
    });
  }
  if (out === source) return { source, changed: false, sites: 0, names: [], edits: [] };
  const before = source.split('\n');
  const after = out.split('\n');
  const edits = [];
  before.forEach((line, i) => {
    if (line !== after[i]) edits.push({ line: i + 1, before: line, after: after[i] });
  });
  return { source: out, changed: true, sites, names: [...names].sort(), edits };
}

/** `skip`: absolute directories not to enter (the upgrade command's nested importers). */
function* walk(dir, skip = new Set()) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // an unreadable directory has nothing to rewrite
  }
  // Symlinks are skipped, never followed: a dangling one cannot be read and a
  // looping one never ends.
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skip.has(full)) yield* walk(full, skip);
    } else if (entry.isFile() && EXTS.has(full.slice(full.lastIndexOf('.')))) yield full;
  }
}

/** Scan a directory. Writes only when `write` is true; `skip` lists directories not to enter. */
export function runCodemod({ root, write = false, skip = [] }) {
  const files = [];
  const names = new Set();
  let sites = 0;
  for (const file of walk(root, new Set(skip.map((d) => resolve(d))))) {
    if (file === SELF) continue;
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue; // unreadable: nothing to rewrite
    }
    if (!src.includes('px6') && !src.includes('px10')) continue;
    const r = transformSource(src);
    if (!r.changed) continue;
    files.push({ file: relative(root, file), sites: r.sites, edits: r.edits });
    r.names.forEach((n) => names.add(n));
    sites += r.sites;
    if (write) writeFileAtomic(file, r.source);
  }
  return { files, sites, manual: [], names: [...names].sort() };
}

function main(argv) {
  const args = { root: process.cwd(), check: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') args.root = resolve(argv[++i] ?? '');
    else if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else {
      console.error(
        `unknown argument: ${argv[i]}\nusage: hds-spacing-steps [--root <dir>] [--check] [--dry-run]`,
      );
      return 2;
    }
  }
  const write = !args.check && !args.dryRun;
  const res = runCodemod({ root: args.root, write });
  const summary = `${res.files.length} files, ${res.sites} sites (${res.names.join(', ') || 'none'})`;
  if (args.check) {
    if (res.files.length > 0) {
      console.error(`hds-spacing-steps: rewrite needed: ${summary}`);
      for (const f of res.files) console.error(`  ${f.file}: ${f.sites} sites`);
      return 1;
    }
    console.log('hds-spacing-steps: nothing to rewrite');
    return 0;
  }
  console.log(`hds-spacing-steps: ${write ? 'rewrote' : 'would rewrite'} ${summary}`);
  for (const f of res.files) {
    console.log(`  ${f.file}: ${f.sites} sites`);
    if (args.dryRun)
      for (const e of f.edits) {
        console.log(`- ${e.before}`);
        console.log(`+ ${e.after}`);
      }
  }
  return 0;
}

// Compare real paths: npm/yarn link the bin and pnpm links the package directory, so
// argv[1] is a symlink while import.meta.url is already resolved.
const isEntry = (() => {
  try {
    return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(SELF);
  } catch {
    return false;
  }
})();
if (isEntry) {
  process.exit(main(process.argv.slice(2)));
}
