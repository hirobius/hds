#!/usr/bin/env node
/**
 * css-vars codemod (hds#459): renames HDS CSS custom properties in a
 * consumer's stylesheets and code, as the upgrade ledger says. Like
 * hds-prop-map it is driven by data: its renames are the ledger steps whose
 * `auto.codemod` is hds-css-vars, with `auto.args` as `[from, to]` pairs.
 *
 *   step auto { codemod: 'hds-css-vars', args: ['--hds-old-gap', '--hds-new-gap'] }
 *     gap: var(--hds-old-gap);          gap: var(--hds-new-gap);
 *     :root { --hds-old-gap: 4px; }     :root { --hds-new-gap: 4px; }
 *
 * A declaration is renamed too, so an override keeps reaching its readers.
 * Every `removed` step's `detect.cssVars` is listed for a manual edit wherever
 * a file names it, with its release. Names are matched whole, so
 * `--hds-old-gap-x` stays as written; running it twice changes nothing.
 * It reads .css, .scss, .sass, .less, .html, .mdx and every code file.
 *
 * With a contract (a release's dist/css-contract.json, default: this
 * package's own), every HDS-namespace name (--hds-, --semantic-,
 * --primitive-, --component-, --role-) a file reads or writes is checked
 * against what that release ships: an unknown or removed one is listed for a
 * manual edit (a write would set a variable nothing reads), and a read of
 * Tailwind's private `--tw-*` plumbing is a warning.
 *
 *   node codemods/css-vars.mjs [--root <dir>] [--ledger <file>] [--contract <file>] [--check] [--dry-run]
 *
 *   --root <dir>     directory to scan (default: current directory)
 *   --ledger <file>  read the steps from this ledger instead of every shipped release
 *   --contract <file> check names against this css-contract.json (default: this package's dist/)
 *   --check          write nothing; exit 1 while a rewrite or a manual edit remains
 *   --dry-run        write nothing; print each changed line before (-) and after (+), exit 0
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from './lib/atomic-write.mjs';
import { shippedSteps } from './lib/removals.mjs';
import { compareVersions, isVersion } from './lib/semver.mjs';
import { CODE_EXTS, isEntry, walk } from './jsx-fold.mjs';

const BIN = 'hds-css-vars';
const EXTS = new Set([...CODE_EXTS, '.css', '.scss', '.sass', '.less', '.html', '.mdx']);
const VAR = /^--[A-Za-z0-9_-]+$/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const whole = (name) => new RegExp(`(?<![\\w-])${esc(name)}(?![\\w-])`, 'g');

/**
 * The renames and removals in a ledger's steps, in release order. A pending
 * note's ids leave out the version, so its steps take `fallback`.
 * @returns {{ renames: { version: string, from: string, to: string }[],
 *   removed: { version: string, name: string }[] }}
 */
export function rulesFromSteps(steps, fallback = 'the next release') {
  const versionOf = (s) => {
    const head = s.id.split('/')[0];
    return isVersion(head) ? head : fallback;
  };
  const order = (a, b) => {
    const [x, y] = [isVersion(a.version), isVersion(b.version)];
    return x && y ? compareVersions(a.version, b.version) : Number(y) - Number(x);
  };
  const renames = [];
  const removed = [];
  for (const s of steps) {
    if (s.auto?.codemod === BIN) {
      const args = s.auto.args ?? [];
      for (let i = 0; i + 1 < args.length; i += 2) {
        if (VAR.test(args[i]) && VAR.test(args[i + 1]))
          renames.push({ version: versionOf(s), from: args[i], to: args[i + 1] });
      }
    } else if (s.kind === 'removed') {
      for (const name of s.detect?.cssVars ?? [])
        if (VAR.test(name)) removed.push({ version: versionOf(s), name });
    }
  }
  return { renames: renames.sort(order), removed: removed.sort(order) };
}

export const CONTRACT_FILE = 'dist/css-contract.json';
const OWN_CONTRACT = join(dirname(fileURLToPath(import.meta.url)), '..', CONTRACT_FILE);
const HDS_NAME = /(?<![\w-])--(?:hds|semantic|primitive|component|role|tw)-[A-Za-z0-9_-]+/g;

/** Every custom property a css-contract.json declares in any bundle, without the --tw-* plumbing. */
export function knownVars(contract) {
  const known = new Set();
  for (const bundle of Object.values(contract?.bundles ?? {}))
    for (const name of Object.keys(bundle?.variables ?? {}))
      if (!name.startsWith('--tw-')) known.add(name);
  return known;
}

/** The css-contract.json at `file`, or null when there is none to read. */
export function readContract(file = OWN_CONTRACT) {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * Each HDS-namespace name in `source` that `known` does not hold, once per
 * line: `unknown` for an HDS name, `private` for a --tw-* read.
 * @returns {{ name: string, line: number, kind: 'unknown' | 'private', write: boolean }[]}
 */
export function contractFindings(source, known) {
  const out = [];
  const seen = new Set();
  for (const m of source.matchAll(HDS_NAME)) {
    const name = m[0];
    const tw = name.startsWith('--tw-');
    if (!tw && known.has(name)) continue;
    const write = /^\s*:/.test(source.slice(m.index + name.length));
    if (tw && write) continue; // a consumer's own Tailwind sets these
    const line = lineOf(source, m.index);
    const key = `${line}:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, line, kind: tw ? 'private' : 'unknown', write });
  }
  return out;
}

const lineOf = (source, at) => source.slice(0, at).split('\n').length;

function lineHunks(before, after) {
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

/** Pure transform of one file's source: every rename in order, then the removal report. */
export function transformSource(source, rules) {
  let out = source;
  let sites = 0;
  for (const { from, to } of rules.renames) {
    out = out.replace(whole(from), () => {
      sites++;
      return to;
    });
  }
  const manual = [];
  for (const { version, name } of rules.removed) {
    for (const m of out.matchAll(whole(name)))
      manual.push(
        `line ${lineOf(out, m.index)} uses ${name}, removed in ${version}; replace it by hand`,
      );
  }
  return { source: out, changed: out !== source, sites, manual, edits: lineHunks(source, out) };
}

/**
 * Scan a directory. Writes only when `write` is true; `skip` lists directories
 * not to enter; `steps` are the ledger steps to apply (default: every release
 * this package ships).
 */
export function runCodemod({
  root,
  write = false,
  skip = [],
  steps = shippedSteps(),
  fallback,
  contract = null,
}) {
  const rules = rulesFromSteps(steps, fallback);
  const known = contract ? knownVars(contract) : null;
  const files = [];
  const manual = [];
  const warnings = [];
  let sites = 0;
  if (rules.renames.length === 0 && rules.removed.length === 0 && !known)
    return { files, sites, manual, warnings };
  for (const file of walk(root, new Set(skip.map((d) => resolve(d))), EXTS)) {
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue; // unreadable: nothing to rewrite
    }
    if (!src.includes('--')) continue;
    const r = transformSource(src, rules);
    for (const stmt of r.manual) manual.push({ file: relative(root, file), stmt });
    if (known) {
      const removedNames = new Set(rules.removed.map((x) => x.name));
      for (const f of contractFindings(r.source, known)) {
        if (removedNames.has(f.name)) continue; // already listed with its release
        const verb = f.write ? 'sets' : 'reads';
        if (f.kind === 'private')
          warnings.push({
            file: relative(root, file),
            stmt: `line ${f.line} reads ${f.name}, a private Tailwind variable that can change in any release`,
          });
        else
          manual.push({
            file: relative(root, file),
            unknown: f.name,
            stmt: `line ${f.line} ${verb} ${f.name}, which the target release does not ship; replace it by hand`,
          });
      }
    }
    if (!r.changed) continue;
    files.push({ file: relative(root, file), sites: r.sites, edits: r.edits });
    sites += r.sites;
    if (write) writeFileAtomic(file, r.source);
  }
  return { files, sites, manual, warnings };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function main(argv) {
  const args = { root: process.cwd(), check: false, dryRun: false, ledger: null, contract: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') args.root = resolve(argv[++i] ?? '');
    else if (argv[i] === '--ledger') args.ledger = resolve(argv[++i] ?? '');
    else if (argv[i] === '--contract') args.contract = resolve(argv[++i] ?? '');
    else if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else {
      console.error(
        `unknown argument: ${argv[i]}\nusage: ${BIN} [--root <dir>] [--ledger <file>] [--contract <file>] [--check] [--dry-run]`,
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
  const contract = args.contract ? JSON.parse(readFileSync(args.contract, 'utf8')) : readContract();
  const res = runCodemod({ root: args.root, write, steps, fallback, contract });
  for (const w of res.warnings) console.warn(`${BIN}: warning: ${w.file}: ${w.stmt}`);
  const summary = `${plural(res.files.length, 'file')}, ${plural(res.sites, 'site')}`;
  const manualLines = res.manual.map((m) => `  ${m.file}: ${m.stmt}`);
  if (args.check) {
    if (res.files.length > 0 || res.manual.length > 0) {
      console.error(`${BIN}: rewrite needed: ${summary}`);
      for (const f of res.files) console.error(`  ${f.file}: ${plural(f.sites, 'site')}`);
      for (const l of manualLines) console.error(l);
      return 1;
    }
    console.log(`${BIN}: nothing to rewrite`);
    return 0;
  }
  console.log(`${BIN}: ${write ? 'rewrote' : 'would rewrite'} ${summary}`);
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
    console.warn(`${BIN}: cannot rewrite these, do them by hand:`);
    for (const l of manualLines) console.warn(l);
  }
  return 0;
}

if (isEntry(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
