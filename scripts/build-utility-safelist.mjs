#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * build-utility-safelist.mjs — writes src/styles/utility-safelist.generated.css,
 * the Tailwind utilities the last release shipped, kept emitted (hds#449).
 *
 * Why: Tailwind emits only the utilities it finds in scanned files, so
 * deleting the last file that named one drops it from ./styles.css and
 * ./tokens.css with no note. 0.20.0 lost about 124 that way, and a hand-kept
 * `@source inline(...)` list in theme.css only ever caught the 16 someone
 * noticed. A consumer that uses ./tokens.css as its only compiled Tailwind
 * (ops: pt-1) breaks when one goes.
 *
 * The list is every class the newest release snapshot at or below
 * package.json's version (docs/api/releases/<v>.json, css section) records in
 * any stylesheet, less the public ones (hds-* and the manifest's
 * publicClasses, which are not Tailwind's to emit), less each utility a step
 * lists as removed (`utility-removed:<name>` in its facts) in a pending note
 * (upgrade/pending/*.json) or in the ledger of package.json's version
 * (upgrade/releases/<version>.json, between `changeset version` and the next
 * snapshot). Dropping a utility is therefore opt-in: list its fact in a step,
 * rerun this, and the next build no longer has it.
 *
 * One `@source inline("<class>");` per line, so a diff shows each utility. A
 * class Tailwind cannot read back from an inline source (a quote, a
 * backslash, or braces, which it expands) is left out and reported.
 *
 *   node scripts/build-utility-safelist.mjs [--root <dir>]           # write it
 *   node scripts/build-utility-safelist.mjs [--root <dir>] --check   # exit 1 when it is stale
 *
 * `--check` runs in pretest; `compile.mjs --release` rewrites it after it
 * records a release's snapshot, so the new release's utilities join the list.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGenerator } from './lib/generated-check.mjs';
import { compareVersions } from './upgrade/schema.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SAFELIST_FILE = 'src/styles/utility-safelist.generated.css';
const RELEASES = 'docs/api/releases';
const FIX = 'node scripts/build-utility-safelist.mjs';

const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** The newest release snapshot with a css section at or below `version`, or null. */
function lastRelease(root, version) {
  const dir = join(root, RELEASES);
  if (!existsSync(dir)) return null;
  const versions = readdirSync(dir)
    .filter((file) => /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\.json$/.test(file))
    .map((file) => file.slice(0, -'.json'.length))
    .filter((v) => compareVersions(v, version) <= 0)
    .sort(compareVersions)
    .reverse();
  for (const v of versions) {
    const snapshot = readJson(join(dir, `${v}.json`));
    if (snapshot.css) return { version: v, css: snapshot.css };
  }
  return null;
}

/** Each `utility-removed:<name>` a step lists in `file`'s steps. */
function removedIn(file) {
  if (!existsSync(file)) return [];
  let steps;
  try {
    steps = readJson(file).steps;
  } catch {
    return []; // a broken note is the upgrade gate's to report
  }
  return (Array.isArray(steps) ? steps : [])
    .flatMap((step) => (Array.isArray(step?.facts) ? step.facts : []))
    .filter((id) => typeof id === 'string' && id.startsWith('utility-removed:'))
    .map((id) => id.slice('utility-removed:'.length));
}

/** Utilities a ledger step lists as removed: pending notes, and the ledger of `version`. */
function documentedRemovals(root, version) {
  const pending = join(root, 'upgrade/pending');
  const notes = existsSync(pending)
    ? readdirSync(pending)
        .filter((file) => file.endsWith('.json'))
        .map((file) => join(pending, file))
    : [];
  return new Set([...notes, join(root, 'upgrade/releases', `${version}.json`)].flatMap(removedIn));
}

/** True for a class Tailwind reads back unchanged from `@source inline("...")`. */
const inlinable = (name) => !/["\\{}\s]/.test(name);

/**
 * The safelist of the tree at `root`: its text, the utilities it keeps, and
 * the classes it had to leave out.
 * @param {string} [root]
 */
export function utilitySafelist(root = REPO) {
  const { version } = readJson(join(root, 'package.json'));
  const release = lastRelease(root, version);
  const css = release?.css ?? { bundles: {}, publicClasses: [] };
  const publicClasses = new Set(css.publicClasses ?? []);
  const removed = documentedRemovals(root, version);
  const classes = new Set(
    Object.values(css.bundles ?? {})
      .flatMap((bundle) => bundle.classes ?? [])
      .filter((name) => !name.startsWith('hds-') && !publicClasses.has(name))
      .filter((name) => !removed.has(name)),
  );
  const sorted = [...classes].sort(byCodeUnit);
  const utilities = sorted.filter(inlinable);
  const skipped = sorted.filter((name) => !inlinable(name));
  const from = release
    ? `${RELEASES}/${release.version}.json`
    : `no release snapshot in ${RELEASES}`;
  const text = [
    '/* GENERATED FILE — do not edit. Written by scripts/build-utility-safelist.mjs (hds#449)',
    `   from ${from}: every Tailwind utility that release shipped stays emitted,`,
    '   so deleting the last file that names one never drops it from ./styles.css or',
    '   ./tokens.css by accident. To drop one, list utility-removed:<class> in a step',
    `   (upgrade/pending/<changeset>.json), then run ${FIX}. */`,
    ...utilities.map((name) => `@source inline("${name}");`),
    '',
  ].join('\n');
  return { text, utilities, skipped };
}

async function main(argv) {
  let root = REPO;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') root = resolve(argv[++i] ?? '.');
    else if (argv[i] !== '--check') {
      console.error(`build-utility-safelist: unknown argument ${argv[i]}`);
      console.error('usage: build-utility-safelist.mjs [--root <dir>] [--check]');
      return 2;
    }
  }
  const { text, utilities, skipped } = utilitySafelist(root);
  const result = await runGenerator({
    root,
    outputs: { [SAFELIST_FILE]: text },
    label: 'build-utility-safelist',
    fix: FIX,
    argv,
  });
  if (!result.check) {
    console.log(`  ${utilities.length} utilities kept`);
    if (skipped.length > 0) {
      console.log(`  left out (Tailwind cannot read them inline): ${skipped.join(' ')}`);
    }
  }
  return result.exitCode;
}

/** Writes the safelist of `root` (compile.mjs --release, after it records a snapshot). */
export const writeUtilitySafelist = (root = REPO) =>
  runGenerator({
    root,
    outputs: { [SAFELIST_FILE]: utilitySafelist(root).text },
    label: 'build-utility-safelist',
    fix: FIX,
    argv: [],
  });

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    console.error(`build-utility-safelist: ${error?.message ?? error}`);
    process.exitCode = 2;
  }
}
