#!/usr/bin/env node
/**
 * hds-token-aliases codemod
 *
 * 0.33.0 removes `semantic.color.border.subdued` and seven spacing aliases
 * deprecated since hds#206 (hds#625). This rewrites each to the token that
 * replaces it:
 *
 *   space.component.gap     -> space.scale.xs
 *   space.component.padding -> space.surface.padding
 *   space.layout.gutter     -> space.region.gutter
 *   space.layout.tight      -> space.scale.sm      (normal -> md, inset -> lg,
 *                                                   spacious -> xl)
 *   color.border.subdued    -> color.border.default
 *
 * in every form a consumer reads them:
 *
 *   - CSS var   `--semantic-space-layout-tight`   -> `--semantic-space-scale-sm`
 *   - JS / DTCG `hds.semantic.space.component.gap` -> `hds.semantic.space.scale.xs`,
 *               also inside a `{semantic.color.border.subdued}` reference
 *   - Tailwind  `p-layout-tight` -> `p-scale-sm`, `md:gap-component-gap` ->
 *               `md:gap-scale-xs` on every utility that reads theme.spacing (padding,
 *               margin, gap, space, inset, width, height, size, basis, translate,
 *               scroll, indent, border-spacing), and `theme(spacing.layout-tight)`
 *   - Box sx    `'border.subdued'` -> `'border.default'` (a quoted color key)
 *
 * The scale steps are what the aliases already resolved to at the default
 * density, so nothing moves there. border.default is the same color in Light
 * and two steps darker in Dark (neutral.600, was neutral.800).
 *
 * A declaration is renamed too: an override of `--semantic-space-layout-tight`
 * becomes one of `--semantic-space-scale-sm`, which reaches every reader of
 * that step, so check each override it reports.
 *
 * A plain text rewrite on whole tokens, so `space.component.medium`,
 * `--semantic-space-layout-gap` and `border-subdued-x` stay as written.
 * Running it twice changes nothing. This file is never rewritten, so its own
 * examples stay put.
 *
 *   node codemods/token-aliases.mjs [--root <dir>] [--check] [--dry-run]
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

/** Removed alias -> its replacement, as `<group>.<name>` under `semantic.space` / `semantic.color`. */
export const SPACE = Object.freeze({
  'component.gap': 'scale.xs',
  'component.padding': 'surface.padding',
  'layout.gutter': 'region.gutter',
  'layout.tight': 'scale.sm',
  'layout.normal': 'scale.md',
  'layout.inset': 'scale.lg',
  'layout.spacious': 'scale.xl',
});
export const COLOR = Object.freeze({ 'border.subdued': 'border.default' });

/** A table's aliases as a regex alternation, each written with `sep` ('.' or '-'). */
const keys = (table, sep) =>
  Object.keys(table)
    .map((k) => k.replace('.', sep))
    .join('|');
const withSep = (k, sep) => k.replace('.', sep);
const unsep = (k) => k.replace('-', '.');

// Every Tailwind utility that reads theme.spacing, so each one a removed key drove.
const UTILS = [
  'gap-x|gap-y|gap|space-x|space-y',
  'px|py|pt|pr|pb|pl|ps|pe|p|mx|my|mt|mr|mb|ml|ms|me|m',
  'scroll-px|scroll-py|scroll-pt|scroll-pr|scroll-pb|scroll-pl|scroll-ps|scroll-pe|scroll-p',
  'scroll-mx|scroll-my|scroll-mt|scroll-mr|scroll-mb|scroll-ml|scroll-ms|scroll-me|scroll-m',
  'inset-x|inset-y|inset|top|right|bottom|left|start|end',
  'min-w|min-h|max-w|max-h|size|w|h|basis|indent|translate-x|translate-y',
  'border-spacing-x|border-spacing-y|border-spacing',
].join('|');

// Each rule: a pattern over one token, the table its alias indexes and the
// separator the token uses. Group 1 is the text kept before the alias (a
// utility prefix, '--semantic-space-', or '' for an sx key), group 2 the alias.
const RULES = [
  // --semantic-space-layout-tight, --semantic-color-border-subdued
  [new RegExp(`(?<![\\w-])(--semantic-space-)(${keys(SPACE, '-')})(?![\\w-])`, 'g'), SPACE, '-'],
  [new RegExp(`(?<![\\w-])(--semantic-color-)(${keys(COLOR, '-')})(?![\\w-])`, 'g'), COLOR, '-'],
  // semantic.space.layout.tight: hds.semantic..., a DTCG path or {reference}
  [
    new RegExp(`(?<![\\w$])(semantic\\.space\\.)(${keys(SPACE, '\\.')})(?![\\w$-])`, 'g'),
    SPACE,
    '.',
  ],
  [
    new RegExp(`(?<![\\w$])(semantic\\.color\\.)(${keys(COLOR, '\\.')})(?![\\w$-])`, 'g'),
    COLOR,
    '.',
  ],
  // p-layout-tight, -mt-component-gap, md:w-layout-gutter, hover:!px-layout-inset
  [new RegExp(`(?<![\\w-])([-!]*(?:${UTILS})-)(${keys(SPACE, '-')})(?![\\w-])`, 'g'), SPACE, '-'],
  // theme(spacing.layout-tight) in CSS, theme('spacing.layout-tight') in a config
  [new RegExp(`(?<![\\w-])(spacing\\.)(${keys(SPACE, '-')})(?![\\w-])`, 'g'), SPACE, '-'],
  // Box sx: borderColor: 'border.subdued', a quoted color key
  [/(?<=['"`])()(border\.subdued)(?=['"`])/g, COLOR, '.'],
];

/** Cheap test before the rules run: every rule's match holds an alias, dotted or dashed. */
const PREFILTER = new RegExp(`${keys(SPACE, '[.-]')}|${keys(COLOR, '[.-]')}`);

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
  for (const [re, table, sep] of RULES) {
    out = out.replace(re, (m, prefix, alias) => {
      sites++;
      names.add(unsep(alias));
      return `${prefix}${withSep(table[unsep(alias)], sep)}`;
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
    if (!PREFILTER.test(src)) continue;
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
        `unknown argument: ${argv[i]}\nusage: hds-token-aliases [--root <dir>] [--check] [--dry-run]`,
      );
      return 2;
    }
  }
  const write = !args.check && !args.dryRun;
  const res = runCodemod({ root: args.root, write });
  const summary = `${res.files.length} files, ${res.sites} sites (${res.names.join(', ') || 'none'})`;
  if (args.check) {
    if (res.files.length > 0) {
      console.error(`hds-token-aliases: rewrite needed: ${summary}`);
      for (const f of res.files) console.error(`  ${f.file}: ${f.sites} sites`);
      return 1;
    }
    console.log('hds-token-aliases: nothing to rewrite');
    return 0;
  }
  console.log(`hds-token-aliases: ${write ? 'rewrote' : 'would rewrite'} ${summary}`);
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
