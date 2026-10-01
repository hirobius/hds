#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * snapshot.mjs — the public surface of one built or published release of
 * @hirobius/design-system (hds#447), the input the upgrade ledger is diffed from.
 *
 * Why not docs/api/api-baseline.json: that file is the surface of the working
 * tree, refreshed whenever `pnpm api:update` runs, so it cannot be trusted as
 * history (at tag v0.19.1 it said "version": "0.18.0" and had no subpaths). A
 * snapshot is read from what a consumer actually installs: the package.json and
 * the `.d.ts` file each package.json#exports entry's `types` condition points
 * at. Export names come from scripts/lib/check-public-api.mjs's extractor, so
 * they are the names `pnpm api:check` sees.
 *
 * A snapshot records, sorted and stable:
 *   - entries: the export names of every JS entry (`.`, `./patterns`, ...),
 *     each with the module that declares it (relative to dist/types, so
 *     `src/app/components/page`). A name that leaves one entry is a move only
 *     when another entry exports it from a module the first one reached
 *     (scripts/upgrade/diff.mjs): /icons' `Calendar` is lucide's, not the
 *     date picker 0.20.0 removed;
 *   - exportsKeys: every package.json#exports key, stylesheets included;
 *   - dependencies, peerDependencies (with their optional flag), engines,
 *     bin (name -> path) and the package.json `files` list.
 * CSS facts (variables, classes) come later (hds#449). Snapshots of releases
 * are committed at docs/api/releases/<version>.json.
 *
 * Usage:
 *   node scripts/upgrade/snapshot.mjs --from-npm <version>   # writes docs/api/releases/<version>.json
 *   node scripts/upgrade/snapshot.mjs --from-npm <version> --check   # exit 1 if that file differs
 *   node scripts/upgrade/snapshot.mjs --dir <package dir>    # prints a built package's snapshot
 *
 *   --out <file>     write here instead of the default
 *   --check [file]   write nothing; exit 1 when the file is not byte-equal
 *   --stdout         print instead of writing (the default for --dir)
 *
 * --from-npm runs `npm pack @hirobius/design-system@<version>` into a temp
 * directory, extracts it with `tar`, snapshots it and deletes the directory.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectModuleSymbols } from '../lib/check-public-api.mjs';
import { formatJson, sortedObject } from './format.mjs';

export const PACKAGE = '@hirobius/design-system';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const RELEASES_DIR = join(REPO, 'docs/api/releases');

/** A declaring file as a module id: relative to dist/types, without its extension. */
function moduleId(dir, file) {
  const path = relative(dir, file).split(sep).join('/');
  return path.replace(/^dist\/types\//, '').replace(/\.d\.ts$|\.tsx?$/, '');
}

function binMap(pkg) {
  if (typeof pkg.bin === 'string') return { [pkg.name.replace(/^@[^/]+\//, '')]: pkg.bin };
  return sortedObject(pkg.bin);
}

/**
 * The snapshot of an unpacked package directory (a published tarball's
 * `package/`, or the repo after build:lib).
 * @param {string} dir
 */
export function snapshotPackage(dir) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const exportsMap = typeof pkg.exports === 'string' ? { '.': pkg.exports } : (pkg.exports ?? {});
  const entries = {};
  for (const key of Object.keys(exportsMap).sort()) {
    const value = exportsMap[key];
    if (!value || typeof value !== 'object') continue; // stylesheets, ./package.json
    if (typeof value.types !== 'string') {
      throw new Error(`exports["${key}"] has no types condition, so its names cannot be read`);
    }
    const file = join(dir, value.types);
    if (!existsSync(file)) {
      throw new Error(`exports["${key}"].types is ${value.types}, which is not in ${dir}`);
    }
    const origins = new Map();
    const names = collectModuleSymbols(file, new Set(), origins);
    entries[key] = Object.fromEntries(
      names.map((name) => [name, moduleId(dir, origins.get(name))]),
    );
  }
  const meta = pkg.peerDependenciesMeta ?? {};
  return {
    format: 1,
    name: pkg.name,
    version: pkg.version,
    entries,
    exportsKeys: Object.keys(exportsMap).sort(),
    dependencies: sortedObject(pkg.dependencies),
    peerDependencies: sortedObject(pkg.peerDependencies, (range, name) => ({
      range,
      optional: meta[name]?.optional === true,
    })),
    engines: sortedObject(pkg.engines),
    bin: binMap(pkg),
    files: [...(pkg.files ?? [])].sort(),
  };
}

/** `npm pack <spec>` into `destination`; returns the tarball path. */
function npmPack(spec, destination) {
  const out = execFileSync('npm', ['pack', spec, '--pack-destination', destination, '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const [{ filename }] = JSON.parse(out);
  return join(destination, filename);
}

/**
 * The snapshot of a published version, read from its npm tarball.
 * @param {string} version
 * @param {{ pack?: (spec: string, destination: string) => string }} [options]
 *   `pack` replaces `npm pack` (tests pass one that builds the tarball locally)
 */
export function snapshotFromNpm(version, { pack = npmPack } = {}) {
  const work = mkdtempSync(join(tmpdir(), 'hds-snapshot-'));
  try {
    const tarball = pack(`${PACKAGE}@${version}`, work);
    execFileSync('tar', ['-xzf', tarball, '-C', work]);
    const snapshot = snapshotPackage(join(work, 'package'));
    if (snapshot.version !== version) {
      throw new Error(`npm pack returned ${snapshot.version}, not ${version}`);
    }
    return snapshot;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const USAGE =
  'usage: snapshot.mjs (--from-npm <version> | --dir <package dir>) [--out <file> | --check [<file>] | --stdout]';

function parseArgs(argv) {
  const args = {
    fromNpm: null,
    dir: null,
    out: null,
    check: false,
    checkFile: null,
    stdout: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--from-npm') args.fromNpm = argv[++i] ?? null;
    else if (arg === '--dir') args.dir = argv[++i] ? resolve(argv[i]) : null;
    else if (arg === '--out') args.out = argv[++i] ? resolve(argv[i]) : null;
    else if (arg === '--stdout') args.stdout = true;
    else if (arg === '--check') {
      args.check = true;
      if (argv[i + 1] && !argv[i + 1].startsWith('--')) args.checkFile = resolve(argv[++i]);
    } else return { error: `unknown argument: ${arg}` };
  }
  if (Boolean(args.fromNpm) === Boolean(args.dir)) return { error: 'pass --from-npm or --dir' };
  return { args };
}

function main(argv) {
  const { args, error } = parseArgs(argv);
  if (error) {
    console.error(`snapshot.mjs: ${error}\n${USAGE}`);
    return 2;
  }
  const snapshot = args.fromNpm ? snapshotFromNpm(args.fromNpm) : snapshotPackage(args.dir);
  const text = formatJson(snapshot);
  const fallback = args.fromNpm ? join(RELEASES_DIR, `${args.fromNpm}.json`) : null;

  if (args.check) {
    const file = args.checkFile ?? args.out ?? fallback;
    if (!file) {
      console.error(`snapshot.mjs: --check needs a file with --dir\n${USAGE}`);
      return 2;
    }
    const committed = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (committed !== text) {
      const redo = args.fromNpm
        ? `node scripts/upgrade/snapshot.mjs --from-npm ${args.fromNpm}`
        : `node scripts/upgrade/snapshot.mjs --dir <dir> --out ${file}`;
      console.error(
        `snapshot.mjs: ${file} is not the snapshot of ${snapshot.version}; run ${redo}`,
      );
      return 1;
    }
    console.log(`snapshot.mjs: ${file} matches ${snapshot.version}`);
    return 0;
  }

  const target = args.stdout ? null : (args.out ?? fallback);
  if (!target) {
    process.stdout.write(text);
    return 0;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
  console.log(`snapshot.mjs: wrote ${target}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`snapshot.mjs: ${error?.message ?? error}`);
    process.exitCode = 2;
  }
}
