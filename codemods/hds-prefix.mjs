#!/usr/bin/env node
/**
 * hds-prefix codemod (hds#389 R1, follows hds#315)
 *
 * 0.20.0 removed the six `Hds*` aliases from the package root. This rewrites
 * `import { HdsCheckbox } from '@hirobius/design-system'` to
 * `import { Checkbox } from '@hirobius/design-system'` and renames the uses in
 * the same file, for HdsCheckbox, HdsRadio, HdsSelect, HdsSlider, HdsToggle and
 * HdsTooltip. Each is the same component under its bare name. Only code
 * changes; text that spells an `Hds*` name keeps it (codemods/scan.mjs tells the
 * two apart), and the rewrite keeps every name the file exports and every
 * object key.
 *
 *   - `import { HdsCheckbox }`: imports `Checkbox` and renames every reference
 *     to the binding (JSX tags, values, `typeof`, member access on the binding,
 *     `${HdsCheckbox}` in a template). Strings (`data-testid="HdsCheckbox-row"`),
 *     template text, comments, JSX text and JSX attribute names stay as written,
 *     so selectors in other files still match.
 *   - It imports `Checkbox as HdsCheckbox` instead, and leaves the uses alone,
 *     when renaming would change behaviour or collide: the name is an export
 *     name (`export { HdsCheckbox }`), a shorthand property or destructured key
 *     (`{ HdsCheckbox }`, which also covers a JSX `{HdsCheckbox}` expression), an
 *     object or type key (`HdsCheckbox:`), a method (`{ HdsCheckbox() {} }`), or a
 *     whole string (`'HdsCheckbox'`); `Checkbox` is already an identifier in the
 *     file; or the file does not scan, so code and text cannot be told apart.
 *   - `import { HdsSelect as Pick }`: becomes `Select as Pick`.
 *   - `export { HdsToggle } from '…'`: becomes `Toggle as HdsToggle`, so the
 *     file's own export name does not change.
 *   - `import * as HDS`: `HDS.HdsSlider` becomes `HDS.Slider`.
 *   - `type` modifiers, other named imports and multi-line layout are kept. A
 *     property of another object (`cfg.HdsToggle`) is not renamed.
 *
 *   node codemods/hds-prefix.mjs [--root <dir>] [--check] [--dry-run]
 *
 *   --root <dir>  directory to scan (default: current directory)
 *   --check       write nothing; exit 1 when a rewrite is needed or a root star
 *                 re-export, a dynamic `import()` or `require()` of the root that names
 *                 an Hds* alias, or another Hds* use the codemod cannot see needs a
 *                 manual look
 *   --dry-run     write nothing; print each changed line before (-) and after (+), exit 0
 */
import { readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { moduleCalls, scanSource } from './scan.mjs';

const ROOT_PKG = '@hirobius/design-system';
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

/** The aliases 0.19.1 exported from the root, and the bare name each pointed at. */
export const RENAMES = Object.freeze({
  HdsCheckbox: 'Checkbox',
  HdsRadio: 'Radio',
  HdsSelect: 'Select',
  HdsSlider: 'Slider',
  HdsToggle: 'Toggle',
  HdsTooltip: 'Tooltip',
});

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ID = '[A-Za-z_$][\\w$]*';
// import|export, type?, default?, { body }, quote, from the root package only
const namedRe = () =>
  new RegExp(
    `^[ \\t]*(import|export)(?:\\s+type)?\\s*(?:${ID}\\s*,\\s*)?\\{([^}]*)\\}\\s*from\\s*(['"])${esc(ROOT_PKG)}\\3;?`,
    'gm',
  );
const namespaceRe = () =>
  new RegExp(
    `^[ \\t]*import\\s+(?:${ID}\\s*,\\s*)?\\*\\s*as\\s+(${ID})\\s*from\\s*['"]${esc(ROOT_PKG)}['"]`,
    'gm',
  );
const starExportRe = () =>
  new RegExp(`^[ \\t]*export\\s+\\*(?:\\s*as\\s+${ID})?\\s*from\\s*['"]${esc(ROOT_PKG)}['"]`, 'gm');
// One specifier inside the braces: `type`? name, then `as alias`?
const specRe = () => new RegExp(`(\\btype\\s+)?\\b(${ID})(\\s+as\\s+${ID})?`, 'g');
// A use of the binding: not a property of another object (`cfg.HdsToggle`).
const binding = (name) => new RegExp(`(?<![\\w$.])${name}(?![\\w$])`, 'g');

/**
 * True when renaming the code references of `name` would change what the file
 * exports or looks up: an export-list entry or shorthand property (`{ name }`,
 * `{ a, name = x }`), an object or type key (`name:`, `name?:`), a method
 * (`{ name() {} }`), or a whole string elsewhere in the file (`'name'`). A
 * ternary branch (`c ? name : x`) also matches; the alias that follows is
 * merely conservative there.
 */
function usedAsName(source, name, refs, scan) {
  if (scan.strings.some((s) => s.value === name)) return true;
  for (const at of refs) {
    const prev = source.slice(0, at).trimEnd().slice(-1);
    const next = source.slice(at + name.length).trimStart();
    if ((prev === '{' || prev === ',') && /^(?:[,}(]|=(?![=>]))/.test(next)) return true;
    if (/^\??\s*:(?!:)/.test(next)) return true;
  }
  return false;
}

/**
 * Pure transform of one file's source. Only code changes: an import or export
 * specifier, and identifiers bound to the imported alias (JSX tags, values,
 * `typeof`, member access on the binding). Strings, template text, comments, JSX
 * text and JSX attribute names keep every `Hds*` they spell. When the file does
 * not scan (codemods/scan.mjs), it imports `Checkbox as HdsCheckbox` and changes
 * no use.
 * @param {string} source
 * @param {Record<string, string>} [renames]
 * @returns {{ source: string, changed: boolean, sites: number, renamed: string[],
 *   edits: { line: number, before: string, after: string }[] }}
 */
export function transformSource(source, renames = RENAMES) {
  const scan = scanSource(source);
  const renamed = new Set();
  const renameLocal = new Set();
  const changes = [];
  let sites = 0;
  // A statement inside a string or comment is text, unless the scan gave up.
  const statements = [...source.matchAll(namedRe())].filter(
    (m) => !scan.ok || scan.isCode(m.index + m[0].indexOf(m[1])),
  );
  const inImport = (at) => statements.some((m) => at >= m.index && at < m.index + m[0].length);
  const refs = (name) =>
    [...source.matchAll(binding(name))]
      .map((m) => m.index)
      .filter((at) => scan.isCode(at) && !inImport(at));
  const taken = (name) => scan.identifiers().has(name);

  for (const m of statements) {
    const [stmt, kw, body] = m;
    let touched = false;
    const next = body.replace(specRe(), (spec, typeKw = '', name, asPart) => {
      const bare = renames[name];
      if (!bare) return spec;
      touched = true;
      renamed.add(name);
      if (asPart) return `${typeKw}${bare}${asPart}`;
      // A re-export keeps the name it gives its own importers.
      if (kw === 'export') return `${typeKw}${bare} as ${name}`;
      if (!scan.ok || taken(bare) || usedAsName(source, name, refs(name), scan))
        return `${typeKw}${bare} as ${name}`;
      renameLocal.add(name);
      return `${typeKw}${bare}`;
    });
    if (!touched) continue;
    sites++;
    const bodyAt = m.index + stmt.indexOf(`{${body}}`) + 1;
    changes.push({ start: bodyAt, end: bodyAt + body.length, text: next });
  }

  for (const name of renameLocal)
    for (const at of refs(name))
      changes.push({ start: at, end: at + name.length, text: renames[name] });

  if (scan.ok)
    for (const ns of [...source.matchAll(namespaceRe())].map((m) => m[1]))
      for (const [name, bare] of Object.entries(renames)) {
        const member = new RegExp(`(?<![\\w$.])(${esc(ns)}\\s*\\.\\s*)${name}(?![\\w$])`, 'g');
        for (const mm of source.matchAll(member)) {
          const at = mm.index + mm[1].length;
          if (!scan.isCode(mm.index) || !scan.isCode(at)) continue;
          renamed.add(name);
          changes.push({ start: at, end: at + name.length, text: bare });
        }
      }

  let out = source;
  for (const r of changes.sort((a, b) => b.start - a.start))
    out = out.slice(0, r.start) + r.text + out.slice(r.end);

  if (out === source) return { source, changed: false, sites: 0, renamed: [], edits: [] };
  const before = source.split('\n');
  const after = out.split('\n');
  const edits = [];
  before.forEach((line, i) => {
    if (line !== after[i]) edits.push({ line: i + 1, before: line, after: after[i] });
  });
  return { source: out, changed: true, sites, renamed: [...renamed].sort(), edits };
}

/**
 * Statements the codemod cannot rewrite: a star re-export of the root (its
 * importers are in other files); in a file with a namespace import of the root,
 * any Hds* identifier left that is not a plain member access; and a dynamic
 * `import()` or `require()` of the root (codemods/scan.mjs `moduleCalls`) in a
 * file whose code names an Hds* alias (`m.HdsToggle`, `const { HdsRadio } =`).
 * Text that spells an Hds* name does not count.
 */
export function findUnrewritable(source, renames = RENAMES) {
  const scan = scanSource(source);
  const used = Object.keys(renames).filter((name) => scan.identifiers().has(name));
  const found = [...source.matchAll(starExportRe())].map((m) => m[0].trim());
  const namespaces = [...source.matchAll(namespaceRe())];
  if (namespaces.length > 0)
    for (const name of used) found.push(`${namespaces[0][0].trim()} (uses ${name})`);
  if (used.length > 0)
    for (const call of new Set(moduleCalls(source, ROOT_PKG, scan)))
      found.push(`${call} (uses ${used.join(', ')})`);
  return found;
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
export function runCodemod({ root, write = false, renames = RENAMES }) {
  const files = [];
  const manual = [];
  const renamed = new Set();
  let sites = 0;
  for (const file of walk(root)) {
    const src = readFileSync(file, 'utf8');
    if (!src.includes(ROOT_PKG)) continue;
    const r = transformSource(src, renames);
    for (const stmt of findUnrewritable(r.source, renames))
      manual.push({ file: relative(root, file), stmt });
    if (!r.changed) continue;
    files.push({ file: relative(root, file), sites: r.sites, renamed: r.renamed, edits: r.edits });
    r.renamed.forEach((n) => renamed.add(n));
    sites += r.sites;
    if (write) writeFileSync(file, r.source);
  }
  return { files, sites, manual, names: [...renamed].sort() };
}

function main(argv) {
  const args = { root: process.cwd(), check: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') args.root = resolve(argv[++i] ?? '');
    else if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else {
      console.error(
        `unknown argument: ${argv[i]}\nusage: hds-prefix [--root <dir>] [--check] [--dry-run]`,
      );
      return 2;
    }
  }
  const write = !args.check && !args.dryRun;
  const res = runCodemod({ root: args.root, write });
  const names = res.names.map((n) => `${n} -> ${RENAMES[n]}`).join(', ') || 'none';
  const summary = `${res.files.length} files, ${res.sites} import sites, ${res.names.length} names (${names})`;
  const manualLines = res.manual.map((m) => `  ${m.file}: ${m.stmt} (rename Hds* names by hand)`);
  if (args.check) {
    if (res.files.length > 0 || res.manual.length > 0) {
      console.error(`hds-prefix: rewrite needed: ${summary}`);
      for (const f of res.files) console.error(`  ${f.file}: ${f.renamed.join(', ')}`);
      for (const l of manualLines) console.error(l);
      return 1;
    }
    console.log('hds-prefix: nothing to rewrite');
    return 0;
  }
  console.log(`hds-prefix: ${write ? 'rewrote' : 'would rewrite'} ${summary}`);
  for (const f of res.files) {
    console.log(`  ${f.file}: ${f.renamed.join(', ')}`);
    if (args.dryRun)
      for (const e of f.edits) {
        console.log(`- ${e.before}`);
        console.log(`+ ${e.after}`);
      }
  }
  if (res.manual.length > 0) {
    console.warn('hds-prefix: cannot rewrite these, do them by hand:');
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
