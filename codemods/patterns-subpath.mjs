#!/usr/bin/env node
/**
 * patterns-subpath codemod (hds#316, follows hds#254)
 *
 * Rewrites `import { Page } from '@hirobius/design-system'` to
 * `import { Page } from '@hirobius/design-system/patterns'` for every name the
 * root stopped exporting in 0.20.0 (hds#389 R1): the 21 pattern components and
 * their props types, parts, hooks and `*Variants`. The list also holds the six
 * modules that were only ever on `/patterns` (StackedCardRail, PageHeader,
 * MetricTiles, FormActions, DestructiveSection, DataTableSection); no root import
 * of those ever resolved, so including them changes nothing. Other named imports
 * stay on the root. Aliases, `type` modifiers and multi-line layout
 * are preserved; an existing `/patterns` import of the same kind is extended
 * instead of duplicated.
 *
 *   node codemods/patterns-subpath.mjs [--root <dir>] [--check] [--dry-run]
 *
 *   --root <dir>  directory to scan (default: current directory)
 *   --check       write nothing; exit 1 when a rewrite is needed, or when a root
 *                 star re-export, or a namespace import or dynamic `import()`,
 *                 `require()` or `vi.mock`/`jest.mock` of the root that reads a
 *                 pattern name off the module (codemods/unrewritable.mjs), needs
 *                 a manual look
 *   --dry-run     write nothing; print each import line before (-) and after (+), exit 0
 *
 * The name list is codemods/patterns-subpath.names.json: what
 * `@hirobius/design-system/patterns` exports and the root does not, generated
 * by `pnpm codemod:names` (scripts/build-codemod-pattern-names.mjs).
 */
import { readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findUnrewritable as findHidden } from './unrewritable.mjs';

const ROOT_PKG = '@hirobius/design-system';
const SUBPATH = `${ROOT_PKG}/patterns`;
const HERE = dirname(fileURLToPath(import.meta.url));
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  '.vercel',
  'coverage',
  'storybook-static',
]);

export function loadPatternNames() {
  const { names } = JSON.parse(readFileSync(join(HERE, 'patterns-subpath.names.json'), 'utf8'));
  return new Set(names);
}

const esc = (pkg) => pkg.replace(/[/@]/g, '\\$&');
// indent, import|export, type?, default?, { body }, quote, semicolon
const namedRe = (pkg) =>
  new RegExp(
    `^([ \\t]*)(import|export)(\\s+type)?\\s*(?:([\\w$]+)\\s*,\\s*)?\\{([^}]*)\\}\\s*from\\s*(['"])${esc(pkg)}\\6(;?)`,
    'gm',
  );
const specName = (spec) =>
  spec
    .replace(/^type\s+/, '')
    .split(/\s+as\s+/)[0]
    .trim();
const splitSpecs = (body) =>
  body
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * What the codemod cannot rewrite (codemods/unrewritable.mjs): a star re-export
 * of the root, whose importers are in other files; and a namespace import or a
 * dynamic `import()`, `require()`, `vi.mock` or `jest.mock` of the root in a file
 * that reads a pattern name off something (`HDS.Page`, `m['Page']`,
 * `const { Page } = …`). A bare `Page`, such as the `/patterns` import the
 * codemod writes or a local type, is not a read.
 */
export function findUnrewritable(source, names = loadPatternNames()) {
  return findHidden(source, ROOT_PKG, names);
}

/** Renders one import/export statement. */
function render({ indent, kw, typeKw, def, list, pkg, multiline, quote, semi }) {
  const head = `${indent}${kw}${typeKw ? ' type' : ''} `;
  const tail = ` from ${quote}${pkg}${quote}${semi}`;
  if (list.length === 0) return `${head}${def}${tail}`;
  const d = def ? `${def}, ` : '';
  if (multiline)
    return `${head}${d}{\n${list.map((s) => `${indent}  ${s},`).join('\n')}\n${indent}}${tail}`;
  return `${head}${d}{ ${list.join(', ')} }${tail}`;
}

/**
 * Pure transform of one file's source.
 * @returns {{ source: string, changed: boolean, sites: number, moved: string[],
 *   edits: {before: string, after: string}[] }}
 */
export function transformSource(source, names) {
  const moved = [];
  const edits = [];
  const isType = (m) => !!m[3];
  const parse = (m) => ({
    indent: m[1],
    kw: m[2],
    typeKw: m[3],
    def: m[4],
    body: m[5],
    quote: m[6],
    semi: m[7],
  });

  // An existing `import { … } from '/patterns'` of each kind absorbs moved names.
  const targets = {};
  for (const m of source.matchAll(namedRe(SUBPATH))) {
    if (m[2] !== 'import' || m[4]) continue;
    targets[isType(m) ? 'type' : 'value'] ??= { m, add: [] };
  }

  const replacements = [];
  for (const m of source.matchAll(namedRe(ROOT_PKG))) {
    const p = parse(m);
    const specs = splitSpecs(p.body);
    const go = specs.filter((s) => names.has(specName(s)));
    if (go.length === 0) continue;
    moved.push(...go.map(specName));
    const keep = specs.filter((s) => !go.includes(s));
    const multiline = p.body.includes('\n');
    const lines = [];
    if (keep.length > 0 || p.def)
      lines.push(render({ ...p, list: keep, pkg: ROOT_PKG, multiline }));
    const target = p.kw === 'import' && targets[p.typeKw ? 'type' : 'value'];
    if (target) target.add.push(...go);
    else lines.push(render({ ...p, def: undefined, list: go, pkg: SUBPATH, multiline }));
    replacements.push({ start: m.index, end: m.index + m[0].length, before: m[0], lines });
  }

  if (replacements.length === 0) return { source, changed: false, sites: 0, moved: [], edits: [] };

  const sites = replacements.length;
  for (const { m, add } of Object.values(targets)) {
    if (add.length === 0) continue;
    const p = parse(m);
    const have = splitSpecs(p.body);
    const merged = [...have, ...add.filter((n) => !have.includes(n))];
    replacements.push({
      start: m.index,
      end: m.index + m[0].length,
      before: m[0],
      lines: [
        render({
          ...p,
          def: undefined,
          list: merged,
          pkg: SUBPATH,
          multiline: p.body.includes('\n'),
        }),
      ],
    });
  }

  let out = source;
  for (const r of replacements.sort((x, y) => y.start - x.start)) {
    const after = r.lines.join('\n');
    // A statement folded entirely into an existing import leaves nothing behind, not a blank line.
    const end = after === '' && out[r.end] === '\n' ? r.end + 1 : r.end;
    out = out.slice(0, r.start) + after + out.slice(end);
    edits.unshift({ before: r.before, after });
  }
  return { source: out, changed: out !== source, sites, moved, edits };
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (EXTS.has(full.slice(full.lastIndexOf('.')))) yield full;
  }
}

/** Scan a directory. Writes only when `write` is true. */
export function runCodemod({ root, write = false, names = loadPatternNames() }) {
  const files = [];
  const manual = [];
  const moved = new Set();
  let sites = 0;
  for (const file of walk(root)) {
    const src = readFileSync(file, 'utf8');
    if (!src.includes(ROOT_PKG)) continue;
    for (const stmt of findUnrewritable(src, names))
      manual.push({ file: relative(root, file), stmt });
    const r = transformSource(src, names);
    if (!r.changed) continue;
    files.push({ file: relative(root, file), sites: r.sites, moved: r.moved, edits: r.edits });
    r.moved.forEach((n) => moved.add(n));
    sites += r.sites;
    if (write) writeFileSync(file, r.source);
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
        `unknown argument: ${argv[i]}\nusage: patterns-subpath [--root <dir>] [--check] [--dry-run]`,
      );
      return 2;
    }
  }
  const write = !args.check && !args.dryRun;
  const res = runCodemod({ root: args.root, write });
  const summary = `${res.files.length} files, ${res.sites} import sites, ${res.names.length} names (${res.names.join(', ') || 'none'})`;
  const manualLines = res.manual.map(
    (m) => `  ${m.file}: ${m.stmt} (move pattern names to '${SUBPATH}' by hand)`,
  );
  if (args.check) {
    if (res.sites > 0 || res.manual.length > 0) {
      console.error(`patterns-subpath: rewrite needed: ${summary}`);
      for (const f of res.files) console.error(`  ${f.file}: ${f.moved.join(', ')}`);
      for (const l of manualLines) console.error(l);
      return 1;
    }
    console.log('patterns-subpath: nothing to rewrite');
    return 0;
  }
  console.log(`patterns-subpath: ${write ? 'rewrote' : 'would rewrite'} ${summary}`);
  for (const f of res.files) {
    console.log(`  ${f.file}: ${f.moved.join(', ')}`);
    if (args.dryRun)
      for (const e of f.edits) {
        for (const l of e.before.split('\n')) console.log(`- ${l}`);
        for (const l of e.after.split('\n')) console.log(`+ ${l}`);
      }
  }
  if (res.manual.length > 0) {
    console.warn('patterns-subpath: cannot rewrite these, do them by hand:');
    for (const l of manualLines) console.warn(l);
  }
  return 0;
}

// Compare real paths: npm/yarn link the bin and pnpm links the package directory, so
// argv[1] is a symlink while import.meta.url is already resolved.
const isEntry = (() => {
  try {
    return (
      !!process.argv[1] &&
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
})();
if (isEntry) {
  process.exit(main(process.argv.slice(2)));
}
