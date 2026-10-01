#!/usr/bin/env node
/**
 * hds-prefix codemod (hds#389 R1, follows hds#315)
 *
 * 0.20.0 removed the six `Hds*` aliases from the package root. This rewrites
 * `import { HdsCheckbox } from '@hirobius/design-system'` to
 * `import { Checkbox } from '@hirobius/design-system'` and renames the uses in
 * the same file, for HdsCheckbox, HdsRadio, HdsSelect, HdsSlider, HdsToggle and
 * HdsTooltip. Each is the same component under its bare name. The rewrite keeps
 * every name the file exports, every object key and every whole-string value;
 * only the binding and text that mentions it change.
 *
 *   - `import { HdsCheckbox }`: imports `Checkbox` and renames every
 *     `HdsCheckbox` identifier in the file (JSX tags, `typeof`, member access on
 *     the binding), plus mentions in comments and inside longer strings.
 *   - It imports `Checkbox as HdsCheckbox` instead, and leaves the uses alone,
 *     when renaming would change behaviour or collide: the name is an export
 *     name (`export { HdsCheckbox }`), a shorthand property or destructured key
 *     (`{ HdsCheckbox }`, which also covers a JSX `{HdsCheckbox}` expression), an
 *     object or type key (`HdsCheckbox:`), or a whole string (`'HdsCheckbox'`);
 *     or `Checkbox` is already a word in the file.
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
 *                 re-export (or an Hds* use the codemod cannot see) needs a manual look
 *   --dry-run     write nothing; print each changed line before (-) and after (+), exit 0
 */
import { readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const word = (name) => new RegExp(`(?<![\\w$])${name}(?![\\w$])`);
// A use of the binding: not a property of another object (`cfg.HdsToggle`).
const binding = (name) => new RegExp(`(?<![\\w$.])${name}(?![\\w$])`, 'g');

/**
 * True when renaming `name` outside the given import spans would change what the
 * file exports or looks up: an export-list entry or shorthand property
 * (`{ name }`, `{ a, name = x }`), an object or type key (`name:`, `name?:`), or a
 * whole string (`'name'`). A ternary branch (`c ? name : x`) also matches; the
 * alias that follows is merely conservative there.
 */
function usedAsName(source, name, spans) {
  for (const m of source.matchAll(binding(name))) {
    const at = m.index;
    if (spans.some(([a, b]) => at >= a && at < b)) continue;
    const prev = source.slice(0, at).trimEnd().slice(-1);
    const rest = source.slice(at + name.length);
    const next = rest.trimStart();
    if ((prev === '{' || prev === ',') && /^(?:[,}]|=(?![=>]))/.test(next)) return true;
    if (/^\??\s*:(?!:)/.test(next)) return true;
    const quote = source[at - 1];
    if ((quote === "'" || quote === '"' || quote === '`') && rest[0] === quote) return true;
  }
  return false;
}

/**
 * Pure transform of one file's source.
 * @param {string} source
 * @param {Record<string, string>} [renames]
 * @returns {{ source: string, changed: boolean, sites: number, renamed: string[],
 *   edits: { line: number, before: string, after: string }[] }}
 */
export function transformSource(source, renames = RENAMES) {
  const renamed = new Set();
  const renameLocal = new Set();
  const spans = [];
  const importSpans = [...source.matchAll(namedRe())].map((m) => [m.index, m.index + m[0].length]);

  for (const m of source.matchAll(namedRe())) {
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
      if (word(bare).test(source) || usedAsName(source, name, importSpans))
        return `${typeKw}${bare} as ${name}`;
      renameLocal.add(name);
      return `${typeKw}${bare}`;
    });
    if (!touched) continue;
    const start = m.index;
    const bodyAt = stmt.indexOf(`{${body}}`) + 1;
    spans.push({
      start,
      end: start + stmt.length,
      text: stmt.slice(0, bodyAt) + next + stmt.slice(bodyAt + body.length),
    });
  }

  const namespaces = [...source.matchAll(namespaceRe())].map((m) => m[1]);
  const rewriteUses = (text) => {
    let out = text;
    for (const name of renameLocal) out = out.replace(binding(name), renames[name]);
    for (const ns of namespaces)
      for (const [name, bare] of Object.entries(renames)) {
        const member = new RegExp(`(?<![\\w$.])(${esc(ns)}\\s*\\.\\s*)${name}(?![\\w$])`, 'g');
        out = out.replace(member, (_, head) => {
          renamed.add(name);
          return `${head}${bare}`;
        });
      }
    return out;
  };

  let out = '';
  let at = 0;
  for (const s of spans.sort((a, b) => a.start - b.start)) {
    out += rewriteUses(source.slice(at, s.start)) + s.text;
    at = s.end;
  }
  out += rewriteUses(source.slice(at));

  if (out === source) return { source, changed: false, sites: 0, renamed: [], edits: [] };
  const before = source.split('\n');
  const after = out.split('\n');
  const edits = [];
  before.forEach((line, i) => {
    if (line !== after[i]) edits.push({ line: i + 1, before: line, after: after[i] });
  });
  return { source: out, changed: true, sites: spans.length, renamed: [...renamed].sort(), edits };
}

/**
 * Statements the codemod cannot rewrite: a star re-export of the root (its
 * importers are in other files) and, in a file with a namespace import of the
 * root, any Hds* name left that is not a plain member access.
 */
export function findUnrewritable(source, renames = RENAMES) {
  const found = [...source.matchAll(starExportRe())].map((m) => m[0].trim());
  const namespaces = [...source.matchAll(namespaceRe())];
  if (namespaces.length > 0)
    for (const name of Object.keys(renames))
      if (word(name).test(source)) found.push(`${namespaces[0][0].trim()} (uses ${name})`);
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
