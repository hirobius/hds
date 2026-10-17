#!/usr/bin/env node
/**
 * hds-deprecated-tokens codemod
 *
 * Rewrites every `$deprecated` design token that names a replacement to that
 * replacement. The table is scripts/eslint-plugin-hds/rules/deprecated-tokens.json,
 * which the token build writes and the hds/no-deprecated-token lint rule reads,
 * so the lint and the rewrite never disagree. Four forms:
 *
 *   - CSS var   `var(--semantic-space-layout-tight)` -> `var(--semantic-space-scale-sm)`
 *               (a `--x:` declaration is left: it overrides the old token)
 *   - member    `hds.semantic.space.layout.tight`    -> `hds.semantic.space.scale.sm`
 *   - DTCG ref  `{semantic.space.layout.tight}`      -> `{semantic.space.scale.sm}`
 *   - Tailwind  `p-layout-tight`, `md:-mt-layout-inset` -> `p-scale-sm`, `md:-mt-scale-lg`
 *
 * Left for a person: a token with no single replacement ("one per tone"), a
 * member whose replacement is not a dotted identifier chain
 * (`primitive.size.width.280`), and px6 / px10 (hds-spacing-steps owns them).
 * Whole tokens only, so running it twice changes nothing.
 *
 *   node codemods/deprecated-tokens.mjs [--root <dir>] [--check] [--dry-run]
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
  '.md',
  '.mdx',
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
const TABLE = join(
  SELF,
  '..',
  '..',
  'scripts',
  'eslint-plugin-hds',
  'rules',
  'deprecated-tokens.json',
);

const { tokens } = JSON.parse(readFileSync(TABLE, 'utf8'));
/** The deprecations this codemod rewrites (px6 / px10 are hds-spacing-steps'). */
export const ENTRIES = Object.freeze(
  tokens.filter((d) => d.replacement && !d.path.startsWith('primitive.space.')),
);

const SPACING_UTILS =
  'gap-x|gap-y|gap|space-x|space-y|px|py|pt|pr|pb|pl|ps|pe|p|mx|my|mt|mr|mb|ml|ms|me|m|inset-x|inset-y|inset|top|right|bottom|left';
const RADIUS_UTILS = 'rounded-(?:t|r|b|l|s|e|tl|tr|bl|br|ss|se|es|ee)|rounded';
const IDENT_CHAIN = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');

/** One entry -> its [pattern, replacer] rules. A composite keeps its `-<prop>` suffix. */
function rulesFor(d) {
  const composite = d.composite ? '((?:-[A-Za-z]+)*)' : '()';
  const rules = [
    [
      new RegExp(`(var\\(\\s*)${esc(d.cssVar)}${composite}(?![\\w-])`, 'g'),
      (m, pre, suffix = '') => `${pre}${d.replacementCssVar}${suffix}`,
    ],
    [new RegExp(`\\{${esc(d.path)}\\}`, 'g'), () => `{${d.replacement}}`],
  ];
  const member = new RegExp(`(?<=[\\w$\\])]\\.)${esc(d.path)}(?![\\w$])`, 'g');
  if (IDENT_CHAIN.test(d.replacement)) rules.push([member, () => d.replacement]);
  else rules.push([member, null]); // reported, not rewritten
  if (d.tailwind && d.replacementTailwind) {
    const utils = d.path.startsWith('semantic.radius.') ? RADIUS_UTILS : SPACING_UTILS;
    rules.push([
      new RegExp(`(?<![\\w-])([-!]*)(${utils})-${esc(d.tailwind)}(?![\\w-])`, 'g'),
      (m, sign, util) => `${sign}${util}-${d.replacementTailwind}`,
    ]);
  }
  return rules;
}

const RULES = ENTRIES.map((d) => ({ d, rules: rulesFor(d) }));

/**
 * Pure transform of one file's source.
 * @param {string} source
 * @returns {{ source: string, changed: boolean, sites: number, names: string[], manual: string[],
 *   edits: { line: number, before: string, after: string }[] }}
 */
export function transformSource(source) {
  let out = source;
  let sites = 0;
  const names = new Set();
  const manual = new Set();
  for (const { d, rules } of RULES) {
    for (const [re, fn] of rules) {
      if (!fn) {
        if (re.test(out)) manual.add(`${d.path} -> ${d.replacement}`);
        re.lastIndex = 0;
        continue;
      }
      out = out.replace(re, (...a) => {
        sites++;
        names.add(d.path);
        return fn(...a);
      });
    }
  }
  const base = { names: [...names].sort(), manual: [...manual].sort() };
  if (out === source) return { source, changed: false, sites: 0, edits: [], ...base };
  const before = source.split('\n');
  const after = out.split('\n');
  const edits = [];
  before.forEach((line, i) => {
    if (line !== after[i]) edits.push({ line: i + 1, before: line, after: after[i] });
  });
  return { source: out, changed: true, sites, edits, ...base };
}

/** `skip`: absolute directories not to enter (the upgrade command's nested importers). */
function* walk(dir, skip = new Set()) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // an unreadable directory has nothing to rewrite
  }
  // Symlinks are skipped, never followed.
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
  const manual = [];
  let sites = 0;
  for (const file of walk(root, new Set(skip.map((d) => resolve(d))))) {
    if (file === SELF) continue;
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue; // unreadable: nothing to rewrite
    }
    const r = transformSource(src);
    for (const stmt of r.manual) manual.push({ file: relative(root, file), stmt });
    if (!r.changed) continue;
    files.push({ file: relative(root, file), sites: r.sites, edits: r.edits });
    r.names.forEach((n) => names.add(n));
    sites += r.sites;
    if (write) writeFileAtomic(file, r.source);
  }
  return { files, sites, manual, names: [...names].sort() };
}

function main(argv) {
  const args = { root: process.cwd(), check: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') args.root = resolve(argv[++i] ?? '');
    else if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else {
      console.error(
        `unknown argument: ${argv[i]}\nusage: hds-deprecated-tokens [--root <dir>] [--check] [--dry-run]`,
      );
      return 2;
    }
  }
  const write = !args.check && !args.dryRun;
  const res = runCodemod({ root: args.root, write });
  const summary = `${res.files.length} files, ${res.sites} sites (${res.names.join(', ') || 'none'})`;
  for (const m of res.manual) console.error(`  by hand: ${m.file}: ${m.stmt}`);
  if (args.check) {
    if (res.files.length > 0) {
      console.error(`hds-deprecated-tokens: rewrite needed: ${summary}`);
      for (const f of res.files) console.error(`  ${f.file}: ${f.sites} sites`);
      return 1;
    }
    console.log('hds-deprecated-tokens: nothing to rewrite');
    return 0;
  }
  console.log(`hds-deprecated-tokens: ${write ? 'rewrote' : 'would rewrite'} ${summary}`);
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

// Compare real paths: package managers link the bin, so argv[1] can be a symlink.
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
