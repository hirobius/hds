#!/usr/bin/env node
/**
 * hds-prefix codemod (hds#389 R1, follows hds#315)
 *
 * 0.20.0 removed the six `Hds*` aliases from the package root: HdsCheckbox,
 * HdsRadio, HdsSelect, HdsSlider, HdsToggle and HdsTooltip. Each is the same
 * component under its bare name. This rewrites the import specifier only, and
 * keeps the name the file already uses:
 *
 *   - `import { HdsCheckbox } from '@hirobius/design-system'` becomes
 *     `import { Checkbox as HdsCheckbox } from '@hirobius/design-system'`;
 *   - `HdsSelect as Pick` becomes `Select as Pick`; `type` modifiers stay;
 *   - `export { HdsToggle } from '…'` becomes `export { Toggle as HdsToggle } from '…'`,
 *     so the file's own export name does not change.
 *
 * No other text in the file changes: JSX, values, `typeof`, spreads, string
 * keys, comments (including comments inside the import braces) and imports from
 * any other module stay as written, so every reference still resolves to the
 * same component. Renaming the local binding to the bare name afterwards is
 * optional and a manual edit. Only named imports and re-exports whose source is
 * exactly the package root are rewritten, and running it twice changes nothing.
 *
 *   node codemods/hds-prefix.mjs [--root <dir>] [--check] [--dry-run]
 *
 *   --root <dir>  directory to scan (default: current directory)
 *   --check       write nothing; exit 1 when a rewrite is needed, or when a root
 *                 star re-export, or a namespace import or dynamic `import()`,
 *                 `require()` or `vi.mock`/`jest.mock` of the root that reads an
 *                 Hds* name off the module, or a file that cannot be read to its
 *                 end (codemods/unrewritable.mjs), needs a manual look
 *   --dry-run     write nothing; print each changed line before (-) and after (+), exit 0
 */
import { readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findUnrewritable as findHidden, maskSource } from './unrewritable.mjs';

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

const ID = '[A-Za-z_$][\\w$]*';
// Matched on the masked source (codemods/unrewritable.mjs), where comments are
// blank and the specifier is a run of spaces between its quotes:
// at a line start or after `;`: import|export, type?, default?, { body }, from, quote.
const namedRe = () =>
  new RegExp(
    `(?:^|(?<=;))[ \\t]*(?:import|export)(?:\\s+type)?\\s*(?:${ID}\\s*,\\s*)?\\{([^}]*)\\}\\s*from\\s*(['"]) {${ROOT_PKG.length}}\\2`,
    'gm',
  );
// One specifier, between commas: `type`? name, then `as alias`?
const specRe = new RegExp(`^(\\s*(?:type\\s+)?)(${ID})(\\s+as\\s+${ID})?\\s*$`);

/**
 * Pure transform of one file's source: rewrites the Hds* specifiers of each
 * named import or re-export from the package root, and nothing else.
 * @param {string} source
 * @param {Record<string, string>} [renames]
 * @returns {{ source: string, changed: boolean, sites: number, renamed: string[],
 *   edits: { line: number, before: string, after: string }[] }}
 */
export function transformSource(source, renames = RENAMES) {
  const { code } = maskSource(source);
  const renamed = new Set();
  const changes = [];
  let sites = 0;

  for (const m of code.matchAll(namedRe())) {
    const quoteAt = m.index + m[0].length - ROOT_PKG.length - 2;
    if (!source.startsWith(ROOT_PKG, quoteAt + 1)) continue;
    const bodyAt = m.index + m[0].indexOf('{') + 1;
    let touched = false;
    let at = bodyAt;
    for (const spec of m[1].split(',')) {
      const s = specRe.exec(spec);
      const bare = s && Object.hasOwn(renames, s[2]) ? renames[s[2]] : undefined;
      if (bare) {
        const name = s[2];
        const nameAt = at + s[1].length;
        // Keep the name the file uses: `HdsCheckbox` -> `Checkbox as HdsCheckbox`.
        changes.push({
          start: nameAt,
          end: nameAt + name.length,
          text: s[3] ? bare : `${bare} as ${name}`,
        });
        renamed.add(name);
        touched = true;
      }
      at += spec.length + 1;
    }
    if (touched) sites++;
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
 * What the codemod cannot rewrite (codemods/unrewritable.mjs): a star re-export
 * of the root, whose importers are in other files; and a namespace import or a
 * dynamic `import()`, `require()`, `vi.mock` or `jest.mock` of the root in a file
 * that reads an Hds* name off something (`HDS.HdsSlider`, `m['HdsToggle']`,
 * `const { HdsRadio } = …`). The alias binding the codemod writes is not a read.
 */
export function findUnrewritable(source, renames = RENAMES) {
  return findHidden(source, ROOT_PKG, Object.keys(renames));
}

/** `skip`: absolute directories not to enter (the upgrade command's nested importers). */
function* walk(dir, skip = new Set()) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!skip.has(full)) yield* walk(full, skip);
    } else if (EXTS.has(full.slice(full.lastIndexOf('.')))) yield full;
  }
}

/** Scan a directory. Writes only when `write` is true; `skip` lists directories not to enter. */
export function runCodemod({ root, write = false, renames = RENAMES, skip = [] }) {
  const files = [];
  const manual = [];
  const renamed = new Set();
  let sites = 0;
  for (const file of walk(root, new Set(skip.map((d) => resolve(d))))) {
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
  // An unreadable file names its own fix; the rest need the bare names by hand.
  const manualLines = res.manual.map(
    (m) =>
      `  ${m.file}: ${m.stmt}${m.stmt.startsWith('unreadable ') ? '' : ' (use the bare names by hand)'}`,
  );
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
