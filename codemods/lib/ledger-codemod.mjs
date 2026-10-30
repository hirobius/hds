/**
 * What the ledger-driven codemods share (hds-prop-map hds#460, hds-token-keys
 * hds#955): rules from steps in release order, the steps this package ships,
 * the changed lines for --dry-run, and one CLI.
 *
 *   node codemods/<bin>.mjs [--root <dir>] [--ledger <file>] [--check] [--dry-run]
 *
 * Node builtins only.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { shippedSteps, stepVersion as releaseOf } from './removals.mjs';
import { compareVersions, isVersion } from './semver.mjs';

// The shipped steps have one home, lib/removals.mjs (hds#956), which reads them once.
export { shippedSteps };

/**
 * The release a step's id names; a pending note's ids leave out the version,
 * so its steps take `fallback`.
 */
export function stepVersion(step, fallback = 'the next release') {
  return releaseOf(step) ?? fallback;
}

/** Sort rules by `version`: a pending one (no version yet) after every released one; stable. */
export function byRelease(a, b) {
  const [x, y] = [isVersion(a.version), isVersion(b.version)];
  return x && y ? compareVersions(a.version, b.version) : Number(y) - Number(x);
}

/**
 * The changed lines between `before` and `after`, as hunks for `--dry-run`
 * (the shape of jsx-fold's editHunks). The edits never add or drop a line,
 * so line i of one is line i of the other.
 */
export function lineHunks(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  const hunks = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const last = hunks[hunks.length - 1];
    if (last && last.line + last.before.length === i + 1) {
      last.before.push(a[i]);
      last.after.push(b[i]);
    } else hunks.push({ line: i + 1, before: [a[i]], after: [b[i]] });
  }
  return hunks;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The CLI of a ledger-driven codemod: `run` is its runCodemod. Returns the exit code.
 *   --root <dir>     directory to scan (default: current directory)
 *   --ledger <file>  read the steps from this ledger (upgrade/releases/<v>.json or
 *                    a pending note) instead of every release this package ships
 *   --check          write nothing; exit 1 while a rewrite or a manual edit remains
 *   --dry-run        write nothing; print each changed line before (-) and after (+), exit 0
 */
export function ledgerMain(bin, run, argv) {
  const args = { root: process.cwd(), check: false, dryRun: false, ledger: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') args.root = resolve(argv[++i] ?? '');
    else if (argv[i] === '--ledger') args.ledger = resolve(argv[++i] ?? '');
    else if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else {
      console.error(
        `unknown argument: ${argv[i]}\nusage: ${bin} [--root <dir>] [--ledger <file>] [--check] [--dry-run]`,
      );
      return 2;
    }
  }
  let steps;
  let fallback;
  if (args.ledger) {
    const ledger = JSON.parse(readFileSync(args.ledger, 'utf8'));
    steps = ledger.steps ?? [];
    fallback = ledger.version;
  }
  const write = !args.check && !args.dryRun;
  const res = run({ root: args.root, write, steps, fallback });
  const summary = `${plural(res.files.length, 'file')}, ${plural(res.sites, 'site')}`;
  const manualLines = res.manual.map((m) => `  ${m.file}: ${m.stmt}`);
  if (args.check) {
    if (res.files.length > 0 || res.manual.length > 0) {
      console.error(`${bin}: rewrite needed: ${summary}`);
      for (const f of res.files) console.error(`  ${f.file}: ${plural(f.sites, 'site')}`);
      for (const l of manualLines) console.error(l);
      return 1;
    }
    console.log(`${bin}: nothing to rewrite`);
    return 0;
  }
  console.log(`${bin}: ${write ? 'rewrote' : 'would rewrite'} ${summary}`);
  for (const f of res.files) {
    console.log(`  ${f.file}: ${plural(f.sites, 'site')}`);
    if (args.dryRun)
      for (const h of f.edits) {
        console.log(`@@ line ${h.line}`);
        for (const l of h.before) console.log(`- ${l}`);
        for (const l of h.after) console.log(`+ ${l}`);
      }
  }
  if (res.manual.length > 0) {
    console.warn(`${bin}: cannot rewrite these, do them by hand:`);
    for (const l of manualLines) console.warn(l);
  }
  return 0;
}
