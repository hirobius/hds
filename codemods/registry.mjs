/**
 * registry — the codemods this package ships, behind one interface (hds#452).
 *
 * A ledger step names its codemod by bin (`auto.codemod`, such as
 * hds-patterns-subpath). The upgrade command looks it up here and runs it
 * in-process, so it can skip nested workspace importers and read back which
 * files changed; `child: true` runs the bin's file as a child process with
 * --root/--check/--dry-run instead, exactly as a person would.
 *
 *   await runCodemod('hds-prefix', { root, write: true, skip: [nestedDir] })
 *   → { files: ['src/a.tsx'], sites: 1, manual: [{ file, stmt, removed? }] }
 *
 *   await runCodemod('hds-prefix', { root, check: true, child: true })
 *   → { status: 1, output: '…' }
 *
 * Node builtins only. Each entry's file is the one package.json#bin points at
 * (a test holds them equal).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** bin name → the file in codemods/ that implements it. */
export const CODEMODS = Object.freeze({
  'hds-patterns-subpath': { file: 'patterns-subpath.mjs' },
  'hds-prefix': { file: 'hds-prefix.mjs' },
  'hds-not-found-pattern': { file: 'not-found-pattern.mjs' },
  'hds-tile-grid': { file: 'tile-grid.mjs' },
});

export const hasCodemod = (name) => Object.hasOwn(CODEMODS, name);

const toPosix = (p) => p.split(sep).join('/');

/**
 * Run one codemod over `root`.
 * @param {string} name a bin name from CODEMODS
 * @param {{ root: string, write?: boolean, skip?: string[], child?: boolean, check?: boolean, dryRun?: boolean }} options
 *   In-process: `write` writes the edits, `skip` lists absolute directories not
 *   to enter. As a child: `check` / `dryRun` pass the flags of the same name.
 */
export async function runCodemod(name, options) {
  if (!hasCodemod(name)) {
    throw new Error(
      `Unknown codemod ${name}: this package ships ${Object.keys(CODEMODS).join(', ')}`,
    );
  }
  const file = join(HERE, CODEMODS[name].file);
  if (options.child) {
    const args = [file, '--root', options.root];
    if (options.check) args.push('--check');
    if (options.dryRun) args.push('--dry-run');
    const res = spawnSync(process.execPath, args, { encoding: 'utf8' });
    return { status: res.status, output: `${res.stdout ?? ''}${res.stderr ?? ''}` };
  }
  const mod = await import(pathToFileURL(file).href);
  const res = mod.runCodemod({
    root: options.root,
    write: options.write === true,
    skip: options.skip ?? [],
  });
  const files = res.files.map((f) => toPosix(f.file));
  const manual = res.manual.map((m) => ({ ...m, file: toPosix(m.file) }));
  return { files, sites: res.sites, manual };
}
