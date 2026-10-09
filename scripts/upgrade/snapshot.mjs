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
 *   - css (hds#449): the CSS contract of the stylesheets the package ships
 *     (scripts/build-css-contract.mjs): every custom property with its value
 *     per context, the class names, the @font-face entries and the @layer
 *     names, per stylesheet. A package that ships dist/css-contract.json is
 *     read from it; an older tarball's contract is built from its stylesheets
 *     with the same code, so `--from-npm <v> --check` reproduces either.
 * Snapshots of releases are committed at docs/api/releases/<version>.json.
 *
 * The source path has no css section. The stylesheets are what Tailwind
 * writes when the library builds (vite.config.lib.ts, then build-styles-css
 * and the other build-*-css steps), and nothing short of that build gives
 * the same minified bytes: a second CSS pipeline run without vite would
 * drift from the published tarball, and every pull request would then carry
 * value facts nobody made. So the CSS facts are read from a built tree:
 * scripts/check-upgrade-css.mjs runs after build:lib in smoke:consumer (CI,
 * the Version PR and `pnpm release`), and `pnpm changeset:version` builds
 * before compile.mjs --release records the release, which then takes its css
 * section from dist/css-contract.json. diff.mjs reports CSS facts only when
 * both snapshots have one, so the source-path gate (check-upgrade-ledger,
 * pretest, no build) sees exactly the facts it did before.
 *
 * From source (hds#448): pretest never builds, so the upgrade gate
 * (scripts/check-upgrade-ledger.mjs) reads the working tree instead. Each
 * exports entry's `types` path (`./dist/types/<stem>.d.ts`) maps back to the
 * `<stem>.ts(x)` tsc emits it from (scripts/lib/package-entries.mjs, as `pnpm
 * api:check` does), and a declaring module's id is that file relative to the
 * repo without its extension: the same id the built file has relative to
 * dist/types. So a source snapshot and a release snapshot diff with no
 * normalization: at the 0.20.0 tree the source snapshot equals
 * docs/api/releases/0.20.0.json in every field. The release compiler (hds#451)
 * writes the next release's snapshot this way at `changeset version` time.
 *
 * Tooling entries (TOOLING_EXPORTS, such as ./eslint-plugin since 0.21.0) are
 * read too, on both paths. Their types are hand-written and ship as written,
 * so the source tree holds the very file the tarball does, at the same path;
 * the source path reads it there. They count because a consumer imports them
 * like any other entry (AGENTS.md tells every consumer to load
 * `@hirobius/design-system/eslint-plugin`), so dropping their default export
 * breaks a consumer's lint config and is a fact the ledger must report. The
 * API surface gates leave them out (package-entries.mjs) because they read the
 * TypeScript built from src/, which these entries are not. Before this, the
 * source path skipped them while the tarball path read them, so every tree
 * after 0.21.0 diffed to removed:./eslint-plugin:default, a fact nobody made.
 *
 * Usage:
 *   node scripts/upgrade/snapshot.mjs --from-npm <version>   # writes docs/api/releases/<version>.json
 *   node scripts/upgrade/snapshot.mjs --from-npm <version> --check   # exit 1 if that file differs
 *   node scripts/upgrade/snapshot.mjs --dir <package dir>    # prints a built package's snapshot
 *   node scripts/upgrade/snapshot.mjs --source [<repo>]      # prints the snapshot of a source tree
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
import { TOOLING_EXPORTS, readJsExportEntries } from '../lib/package-entries.mjs';
import { buildCssContract, readCssContract } from '../lib/css-contract.mjs';
import { formatJson, sortedObject } from './format.mjs';

export const PACKAGE = '@hirobius/design-system';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const RELEASES_DIR = join(REPO, 'docs/api/releases');

/**
 * A declaring file as a module id: relative to dist/types (or, for a file
 * that ships as written, to the package root), without its extension.
 */
function moduleId(dir, file) {
  const path = relative(dir, file).split(sep).join('/');
  return path.replace(/^dist\/types\//, '').replace(/\.d\.[cm]?ts$|\.[cm]?ts$|\.tsx$/, '');
}

function binMap(pkg) {
  if (typeof pkg.bin === 'string') return { [pkg.name.replace(/^@[^/]+\//, '')]: pkg.bin };
  return sortedObject(pkg.bin);
}

/** An entry's export names, each with the id of the module that declares it. */
function entryNames(root, file) {
  const origins = new Map();
  const names = collectModuleSymbols(file, new Set(), origins);
  return Object.fromEntries(names.map((name) => [name, moduleId(root, origins.get(name))]));
}

/** Everything a snapshot reads from package.json alone. */
function packageFacts(pkg, exportsMap, entries) {
  const meta = pkg.peerDependenciesMeta ?? {};
  return {
    format: 1,
    name: pkg.name,
    version: pkg.version,
    entries: sortedObject(entries),
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

const exportsOf = (pkg) =>
  typeof pkg.exports === 'string' ? { '.': pkg.exports } : (pkg.exports ?? {});

const readPackageJson = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));

/**
 * The css section of a built package: its dist/css-contract.json, else the
 * contract built from its stylesheets; none when it ships no stylesheet.
 */
function cssSection(dir) {
  return readCssContract(dir) ?? buildCssContract(dir);
}

/** `snapshot` with its css section last, when there is one. */
const withCss = (snapshot, css) => (css ? { ...snapshot, css } : snapshot);

/**
 * The snapshot of an unpacked package directory (a published tarball's
 * `package/`, or the repo after build:lib).
 * @param {string} dir
 */
export function snapshotPackage(dir) {
  const pkg = readPackageJson(dir);
  const exportsMap = exportsOf(pkg);
  const entries = {};
  for (const key of Object.keys(exportsMap)) {
    const value = exportsMap[key];
    if (!value || typeof value !== 'object') continue; // stylesheets, ./package.json
    if (typeof value.types !== 'string') {
      throw new Error(`exports["${key}"] has no types condition, so its names cannot be read`);
    }
    const file = join(dir, value.types);
    if (!existsSync(file)) {
      throw new Error(`exports["${key}"].types is ${value.types}, which is not in ${dir}`);
    }
    entries[key] = entryNames(dir, file);
  }
  return withCss(packageFacts(pkg, exportsMap, entries), cssSection(dir));
}

/**
 * A tooling entry's types file in the source tree: it ships as written, so it
 * is at the path its `types` condition names.
 */
function shippedTypesFile(root, key, value) {
  const file = typeof value.types === 'string' ? join(root, value.types) : null;
  if (!file || !existsSync(file)) {
    throw new Error(
      `exports["${key}"].types is ${JSON.stringify(value.types)}, which is not in ${root}; a tooling entry ships its types as written`,
    );
  }
  return file;
}

/**
 * The snapshot of a source tree (this repo, or a test's copy of its layout),
 * read without building: each built exports entry from the source file its
 * `types` declarations are emitted from, and each tooling entry from the types
 * file it ships as written. Same shape, entries and module ids as
 * snapshotPackage gives for the tarball built from this tree, less its css
 * section (see the header): pass `css` (a contract, such as the
 * dist/css-contract.json build:lib wrote) to add one.
 * @param {string} root the directory holding package.json and src/
 * @param {{ css?: object | null }} [options]
 */
export function snapshotFromSource(root, { css = null } = {}) {
  const pkg = readPackageJson(root);
  const exportsMap = exportsOf(pkg);
  const built = new Map(readJsExportEntries(root).map(({ key, file }) => [key, file]));
  const entries = {};
  for (const [key, value] of Object.entries(exportsMap)) {
    if (!value || typeof value !== 'object') continue; // stylesheets, ./package.json
    const file = built.get(key) ?? (TOOLING_EXPORTS.has(key) && shippedTypesFile(root, key, value));
    if (!file) throw new Error(`exports["${key}"] has no source snapshot.mjs can read`);
    entries[key] = entryNames(root, file);
  }
  return withCss(packageFacts(pkg, exportsMap, entries), css);
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
  'usage: snapshot.mjs (--from-npm <version> | --dir <package dir> | --source [<repo>]) [--out <file> | --check [<file>] | --stdout]';

function parseArgs(argv) {
  const args = {
    fromNpm: null,
    dir: null,
    source: null,
    out: null,
    check: false,
    checkFile: null,
    stdout: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--from-npm') args.fromNpm = argv[++i] ?? null;
    else if (arg === '--dir') args.dir = argv[++i] ? resolve(argv[i]) : null;
    else if (arg === '--source') {
      args.source = argv[i + 1] && !argv[i + 1].startsWith('--') ? resolve(argv[++i]) : REPO;
    } else if (arg === '--out') args.out = argv[++i] ? resolve(argv[i]) : null;
    else if (arg === '--stdout') args.stdout = true;
    else if (arg === '--check') {
      args.check = true;
      if (argv[i + 1] && !argv[i + 1].startsWith('--')) args.checkFile = resolve(argv[++i]);
    } else return { error: `unknown argument: ${arg}` };
  }
  if ([args.fromNpm, args.dir, args.source].filter(Boolean).length !== 1) {
    return { error: 'pass one of --from-npm, --dir or --source' };
  }
  return { args };
}

function main(argv) {
  const { args, error } = parseArgs(argv);
  if (error) {
    console.error(`snapshot.mjs: ${error}\n${USAGE}`);
    return 2;
  }
  const snapshot = args.fromNpm
    ? snapshotFromNpm(args.fromNpm)
    : args.source
      ? snapshotFromSource(args.source)
      : snapshotPackage(args.dir);
  const text = formatJson(snapshot);
  const fallback = args.fromNpm ? join(RELEASES_DIR, `${args.fromNpm}.json`) : null;

  if (args.check) {
    const file = args.checkFile ?? args.out ?? fallback;
    if (!file) {
      console.error(`snapshot.mjs: --check needs a file with --dir or --source\n${USAGE}`);
      return 2;
    }
    const committed = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (committed !== text) {
      const redo = args.fromNpm
        ? `node scripts/upgrade/snapshot.mjs --from-npm ${args.fromNpm}`
        : args.source
          ? `node scripts/upgrade/snapshot.mjs --source ${args.source} --out ${file}`
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
