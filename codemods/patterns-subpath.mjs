#!/usr/bin/env node
/**
 * patterns-subpath codemod (hds#316, follows hds#254)
 *
 * Rewrites `import { Page } from '@hirobius/design-system'` to
 * `import { Page } from '@hirobius/design-system/patterns'` for every name the
 * root stopped exporting in 0.20.0 (hds#389 R1): the 21 pattern components and
 * their props types, parts, hooks and `*Variants`. The list also holds the five
 * modules that were only ever on `/patterns` (PageHeader, MetricTiles,
 * FormActions, DestructiveSection, DataTableSection); no root import of those
 * ever resolved, so including them changes nothing. StatusTile (with
 * StatusTileProps and StatusTileTone) left the root for `/patterns` in the same
 * release (hds#389 D5, hds#395), so it moves the same way. Names removed outright in
 * 0.20.0 are in removed-0.20.json and are reported, not moved. Other named imports
 * stay on the root. Aliases, `type` modifiers and multi-line layout
 * are preserved; an existing `/patterns` import of the same kind is extended
 * instead of duplicated. Imports are read with comments, strings and templates
 * masked (codemods/unrewritable.mjs), so a statement after `;` or a comment on
 * its line is found, and a comment in the braces moves with the specifier it
 * sits next to (hds#434).
 *
 *   node codemods/patterns-subpath.mjs [--root <dir>] [--check] [--dry-run]
 *
 *   --root <dir>  directory to scan (default: current directory)
 *   --check       write nothing; exit 1 when a rewrite is needed, or when a root
 *                 star re-export, or a namespace import or dynamic `import()`,
 *                 `require()` or `vi.mock`/`jest.mock` of the root that reads a
 *                 pattern name off the module, or a file that cannot be read to
 *                 its end (codemods/unrewritable.mjs), needs a manual look
 *   --dry-run     write nothing; print each import line before (-) and after (+), exit 0
 *
 * The name list is codemods/patterns-subpath.names.json: what
 * `@hirobius/design-system/patterns` exports and the root does not, generated
 * by `pnpm codemod:names` (scripts/build-codemod-pattern-names.mjs).
 *
 * A name 0.20.0 removed with no replacement (codemods/removed-0.20.json, hds#394)
 * has nowhere to move: an import of one from the root or `/patterns` is reported
 * for a manual edit ("removed in 0.20.0, no replacement") and `--check` exits 1.
 * A removed name that folded into a survivor (`replaced` in that file, hds#394
 * wave 4b) is reported the same way, naming the survivor instead
 * ("removed in 0.20.0, use Button iconOnly"). NotFoundPattern and TileGrid
 * (hds#395) have codemods of their own: hds-not-found-pattern and hds-tile-grid.
 */
import { readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findUnrewritable as findHidden, maskSource } from './unrewritable.mjs';

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

/** Names 0.20.0 removed (codemods/removed-0.20.json `modules` and `replaced`): reported, never moved. */
export function loadRemovedNames() {
  const { modules, replaced = {} } = JSON.parse(
    readFileSync(join(HERE, 'removed-0.20.json'), 'utf8'),
  );
  return new Set([
    ...Object.values(modules).flat(),
    ...Object.values(replaced).flatMap(Object.keys),
  ]);
}

/** What replaces a removed name that has a survivor (removed-0.20.json `replaced`), by name. */
export function loadReplacements() {
  const { replaced = {} } = JSON.parse(readFileSync(join(HERE, 'removed-0.20.json'), 'utf8'));
  return new Map(Object.values(replaced).flatMap((names) => Object.entries(names)));
}

const ID = '[A-Za-z_$][\\w$]*';
const BOM = '\uFEFF';
// Matched on the masked source (codemods/unrewritable.mjs), where comments are
// blank and the specifier is a run of spaces between its quotes. At a line start
// or after `;`: indent, import|export, type?, default?, { body }, quote, semicolon.
const namedRe = (pkg) =>
  new RegExp(
    `(?:^|(?<=;))([ \\t]*)(import|export)(\\s+type)?\\s*(?:(${ID})\\s*,\\s*)?\\{([^}]*)\\}\\s*from\\s*(['"]) {${pkg.length}}\\6(;?)`,
    'gm',
  );
const specName = (spec) =>
  spec
    .replace(/^type\s+/, '')
    .split(/\s+as\s+/)[0]
    .trim();

/**
 * The specifiers of one `{ … }` body. The masked body (comments blank) says where
 * each specifier and comma is; the text, comments included, comes from the source.
 * A comment rides with the specifier next to it: before it (`lead`), or after it
 * up to the end of the comma's line (`tail`). Comments on their own lines after
 * the last specifier are `endComment`.
 */
function parseSpecs(source, code, from, to) {
  const specs = [];
  let endComment = '';
  let segStart = from;
  for (let k = from; k <= to; k++) {
    if (k < to && code[k] !== ',') continue;
    const seg = code.slice(segStart, k);
    const a = seg.search(/\S/);
    const prev = specs[specs.length - 1];
    let leadFrom = segStart;
    // The rest of the previous comma's line belongs to the specifier before it.
    const nl = seg.indexOf('\n');
    if (prev && nl >= 0 && (a < 0 || nl < a)) {
      const sameLine = source.slice(segStart, segStart + nl).trim();
      if (sameLine) prev.tail = prev.tail ? `${prev.tail} ${sameLine}` : sameLine;
      leadFrom = segStart + nl;
    }
    if (a < 0) endComment = source.slice(leadFrom, k).trim();
    else {
      const specStart = segStart + a;
      const specEnd = segStart + seg.trimEnd().length;
      const masked = code.slice(specStart, specEnd);
      specs.push({
        name: specName(masked),
        key: masked.replace(/\s+/g, ' '),
        lead: source.slice(leadFrom, specStart).trim(),
        text: source.slice(specStart, specEnd),
        tail: source.slice(specEnd, k).trim(),
      });
    }
    segStart = k + 1;
  }
  return { specs, endComment };
}

/** Each named import or re-export of `pkg` in the masked `code`, in source order. */
function* statements(source, code, pkg) {
  for (const m of code.matchAll(namedRe(pkg))) {
    const to = m.index + m[0].length;
    if (!source.startsWith(pkg, to - m[7].length - pkg.length - 1)) continue;
    const bodyAt = m.index + m[0].indexOf('{') + 1;
    yield {
      from: m.index + m[1].length,
      to,
      kw: m[2],
      typeKw: !!m[3],
      def: m[4],
      quote: m[6],
      semi: m[7],
      multiline: m[5].includes('\n'),
      ...parseSpecs(source, code, bodyAt, bodyAt + m[5].length),
    };
  }
}

/** The leading whitespace of the line `at` is on. */
function indentOf(source, at) {
  const lineStart = source.lastIndexOf('\n', at - 1) + 1;
  return /^[ \t]*/.exec(source.slice(lineStart, at).replace(BOM, ''))[0];
}

/**
 * What to delete for a statement that folds away entirely: its whole line when
 * nothing else is on it, so no blank line or stray indent is left; otherwise the
 * statement and the spaces that set it apart.
 */
function removal(source, from, to) {
  const lineStart = source.lastIndexOf('\n', from - 1) + 1;
  const bol = lineStart === 0 && source.startsWith(BOM) ? 1 : lineStart;
  let end = to;
  while (source[end] === ' ' || source[end] === '\t') end++;
  if (/^[ \t]*$/.test(source.slice(bol, from))) {
    const eol = source.startsWith('\r\n', end) ? 2 : source[end] === '\n' ? 1 : 0;
    return eol > 0 || end === source.length ? [bol, end + eol] : [from, end];
  }
  let start = from;
  while (start > bol && (source[start - 1] === ' ' || source[start - 1] === '\t')) start--;
  return [start, to];
}

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

/** Each named import or re-export of a removed name from the root or `/patterns`, in source order. */
export function findRemoved(source, removed = loadRemovedNames(), use = loadReplacements()) {
  const { code } = maskSource(source);
  const found = [];
  for (const pkg of [ROOT_PKG, SUBPATH])
    for (const st of statements(source, code, pkg))
      for (const { name } of st.specs)
        if (removed.has(name))
          found.push({
            at: st.from,
            text: `${name} from '${pkg}' (removed in 0.20.0, ${use.has(name) ? `use ${use.get(name)}` : 'no replacement'})`,
          });
  return found.sort((a, b) => a.at - b.at).map((f) => f.text);
}

/**
 * Renders one import/export statement; each line after the first starts with
 * `indent`. A list goes on one line when its source did and no comment in it
 * needs a line break.
 */
function render({ kw, typeKw, def, quote, semi }, { specs, endComment, multiline, pkg, indent }) {
  const head = `${kw}${typeKw ? ' type' : ''} `;
  const tail = ` from ${quote}${pkg}${quote}${semi}`;
  if (specs.length === 0) return `${head}${def}${tail}`;
  const d = def ? `${def}, ` : '';
  const parts = [endComment, ...specs.flatMap((s) => [s.lead, s.text, s.tail])];
  if (multiline || parts.some((part) => /\n|\/\//.test(part))) {
    const pad = `${indent}  `;
    const lines = specs.flatMap((s) => [
      ...(s.lead ? [`${pad}${s.lead}`] : []),
      `${pad}${s.text},${s.tail ? ` ${s.tail}` : ''}`,
    ]);
    if (endComment) lines.push(`${pad}${endComment}`);
    return `${head}${d}{\n${lines.join('\n')}\n${indent}}${tail}`;
  }
  const items = specs.map((s) => [s.lead, s.text, s.tail].filter(Boolean).join(' '));
  return `${head}${d}{ ${items.join(', ')}${endComment ? ` ${endComment}` : ''} }${tail}`;
}

/**
 * Pure transform of one file's source.
 * @returns {{ source: string, changed: boolean, sites: number, moved: string[],
 *   edits: {before: string, after: string}[] }}
 */
export function transformSource(source, names) {
  const { code } = maskSource(source);
  const moved = [];
  const edits = [];

  // An existing `import { … } from '/patterns'` of each kind absorbs moved names.
  const targets = {};
  for (const st of statements(source, code, SUBPATH)) {
    if (st.kw !== 'import' || st.def) continue;
    targets[st.typeKw ? 'type' : 'value'] ??= { st, add: [], endComments: [] };
  }

  const replacements = [];
  for (const st of statements(source, code, ROOT_PKG)) {
    const go = st.specs.filter((s) => names.has(s.name));
    if (go.length === 0) continue;
    moved.push(...go.map((s) => s.name));
    const keep = st.specs.filter((s) => !go.includes(s));
    const indent = indentOf(source, st.from);
    const target = st.kw === 'import' && targets[st.typeKw ? 'type' : 'value'];
    // A comment before the closing brace stays with the root list while it has names.
    const endComment = keep.length > 0 ? '' : st.endComment;
    const lines = [];
    if (keep.length > 0 || st.def)
      lines.push(render(st, { ...st, specs: keep, pkg: ROOT_PKG, indent }));
    if (target) {
      target.add.push(...go);
      if (endComment) target.endComments.push(endComment);
    } else
      lines.push(
        render({ ...st, def: undefined }, { ...st, specs: go, endComment, pkg: SUBPATH, indent }),
      );
    replacements.push({ from: st.from, to: st.to, indent, lines });
  }

  if (replacements.length === 0) return { source, changed: false, sites: 0, moved: [], edits: [] };

  const sites = replacements.length;
  for (const { st, add, endComments } of Object.values(targets)) {
    if (add.length === 0) continue;
    const specs = [...st.specs];
    for (const s of add) if (!specs.some((h) => h.key === s.key)) specs.push(s);
    const indent = indentOf(source, st.from);
    const endComment = [st.endComment, ...endComments].filter(Boolean).join(`\n${indent}  `);
    replacements.push({
      from: st.from,
      to: st.to,
      indent,
      lines: [
        render({ ...st, def: undefined }, { ...st, specs, endComment, pkg: SUBPATH, indent }),
      ],
    });
  }

  let out = source;
  for (const r of replacements.sort((x, y) => y.from - x.from)) {
    const after = r.lines.join(`\n${r.indent}`);
    // A statement folded entirely into an existing import leaves nothing behind, not a blank line.
    const [from, to] = after === '' ? removal(source, r.from, r.to) : [r.from, r.to];
    out = out.slice(0, from) + after + out.slice(to);
    // --dry-run shows the whole line the statement starts on.
    const prefix = source.slice(source.lastIndexOf('\n', r.from - 1) + 1, r.from).replace(BOM, '');
    edits.unshift({
      before: prefix + source.slice(r.from, r.to),
      after: after === '' ? prefix.trimEnd() : prefix + after,
    });
  }
  return { source: out, changed: out !== source, sites, moved, edits };
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
export function runCodemod({
  root,
  write = false,
  names = loadPatternNames(),
  removed = loadRemovedNames(),
  replacements = loadReplacements(),
  skip = [],
}) {
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
    for (const stmt of findUnrewritable(src, names))
      manual.push({ file: relative(root, file), stmt });
    for (const stmt of findRemoved(src, removed, replacements))
      manual.push({ file: relative(root, file), stmt, removed: true });
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
  // An unreadable file names its own fix; the rest need the names moved by hand.
  const manualLines = res.manual.map(
    (m) =>
      `  ${m.file}: ${m.stmt}${m.removed || m.stmt.startsWith('unreadable ') ? '' : ` (move pattern names to '${SUBPATH}' by hand)`}`,
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
