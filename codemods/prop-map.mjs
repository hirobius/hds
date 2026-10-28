#!/usr/bin/env node
/**
 * prop-map codemod (hds#460): renames a component prop, or maps its removed
 * values, as the upgrade ledger says. It is driven by data, not code: its
 * rules are the ledger's `prop-renamed` and `prop-value-mapped` steps whose
 * `auto.codemod` is hds-prop-map (`prop: { component, name, to | values }`,
 * hds#461), so a release that renames a prop ships a ledger step, not a bin.
 *
 *   step prop { component: 'Button', name: 'tone', to: 'variant' }
 *     <Button tone="primary">            <Button variant="primary">
 *   step prop { component: 'Stack', name: 'direction', values: { vertical: 'column' } }
 *     <Stack direction="vertical">       <Stack direction="column">
 *     <Stack direction={'vertical'}>     <Stack direction={'column'}>
 *
 * It follows the name a file binds the component to from the package root or
 * a subpath: an alias (`Stack as Col`) and a namespace import (`<H.Stack>`).
 * Steps apply in release order, so a rename and a later value map of the same
 * prop chain. Listed for a manual edit, naming the release from the step: a
 * value it cannot read (`direction={dir}`), and a tag that already sets the new
 * prop name. A spread is left alone. It reads .mdx as well as code; MDX prose
 * goes through the same tokenizer (codemods/unrewritable.mjs), so a file it
 * cannot read to its end is listed rather than passed. Running it twice
 * changes nothing.
 *
 *   node codemods/prop-map.mjs [--root <dir>] [--ledger <file>] [--check] [--dry-run]
 *
 *   --root <dir>     directory to scan (default: current directory)
 *   --ledger <file>  read the steps from this ledger (upgrade/releases/<v>.json or
 *                    a pending note) instead of every release this package ships
 *   --check          write nothing; exit 1 while a rewrite or a manual edit remains
 *   --dry-run        write nothing; print each changed line before (-) and after (+), exit 0
 */
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from './lib/atomic-write.mjs';
import { loadRecord } from './lib/record.mjs';
import { compareVersions, isVersion } from './lib/semver.mjs';
import { namedImports, namespaceImports } from './lib/scan.mjs';
import { CODE_EXTS, ROOT_PKG, isEntry, parseTag, walk } from './jsx-fold.mjs';
import { maskSource } from './unrewritable.mjs';

const BIN = 'hds-prop-map';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXTS = new Set([...CODE_EXTS, '.mdx']);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @typedef {{ version: string, component: string, name: string, to?: string,
 *   values?: Record<string, string> }} PropRule
 */

/**
 * The rules in a ledger's steps: each prop step this codemod applies, in
 * release order. A pending note's ids leave out the version, so its steps take
 * `fallback`.
 * @returns {PropRule[]}
 */
export function rulesFromSteps(steps, fallback = 'the next release') {
  return steps
    .filter(
      (s) =>
        s.auto?.codemod === BIN &&
        ((s.kind === 'prop-renamed' && s.prop?.to) ||
          (s.kind === 'prop-value-mapped' && s.prop?.values)),
    )
    .map((s) => {
      const head = s.id.split('/')[0];
      const { component, name, to, values } = s.prop;
      return {
        version: isVersion(head) ? head : fallback,
        component,
        name,
        ...(s.kind === 'prop-renamed' ? { to } : { values }),
      };
    })
    .sort((a, b) => {
      // A pending step (no version yet) comes after every released one; the sort is stable.
      const [x, y] = [isVersion(a.version), isVersion(b.version)];
      return x && y ? compareVersions(a.version, b.version) : Number(y) - Number(x);
    });
}

/** Every step the package ships, from its upgrade record. A broken record throws. */
export function shippedSteps(pkgDir = join(HERE, '..')) {
  return loadRecord(pkgDir).ledgers.flatMap((l) => l.steps ?? []);
}

const isHds = (from) => from === ROOT_PKG || from.startsWith(`${ROOT_PKG}/`);

/** The tag names a file writes `component` as: its import locals and `Ns.Component`. */
function tagNames(source, component) {
  const named = namedImports(source)
    .filter((i) => isHds(i.from) && i.name === component)
    .map((i) => i.local);
  const spaced = namespaceImports(source)
    .filter((i) => isHds(i.from))
    .map((i) => `${i.local}.${component}`);
  return [...new Set([...named, ...spaced])];
}

const lineOf = (source, at) => source.slice(0, at).split('\n').length;
// A string or a template with no `${}`: `'vertical'`, `"vertical"`, `` `vertical` ``.
const STRING_EXPR = /^\s*(['"`])([^'"`\\\n$]*)\1\s*$/;

/** One rule over one source: the edits it makes and what it cannot do. */
function applyRule(source, rule) {
  const names = tagNames(source, rule.component);
  if (names.length === 0) return { edits: [], sites: 0, manual: [] };
  const { code } = maskSource(source);
  const re = new RegExp(`<(${names.map(esc).join('|')})(?=[\\s/>])`, 'g');
  const edits = [];
  const manual = [];
  let sites = 0;
  for (const m of code.matchAll(re)) {
    const nameEnd = m.index + m[0].length;
    const tag = parseTag(source, code, nameEnd);
    if (!tag) continue;
    const attr = tag.attrs.find((a) => a.name === rule.name);
    if (!attr) continue;
    const line = lineOf(source, m.index);
    if (rule.to) {
      if (tag.attrs.some((a) => a.name === rule.to)) {
        manual.push(
          `<${m[1]}> at line ${line} sets both ${rule.name} and ${rule.to} (${rule.version} renamed ${rule.name} to ${rule.to}); keep one by hand`,
        );
        continue;
      }
      edits.push({ start: attr.start, end: attr.start + rule.name.length, text: rule.to });
      sites++;
      continue;
    }
    let from = -1;
    let value;
    if (attr.kind === 'string') {
      from = attr.valueStart + 1;
      value = attr.value;
    } else if (attr.kind === 'expr') {
      const lit = STRING_EXPR.exec(attr.value);
      if (lit) {
        from = attr.valueStart + 1 + attr.value.indexOf(lit[1]) + 1;
        value = lit[2];
      } else {
        const pairs = Object.entries(rule.values)
          .map(([a, b]) => `"${a}" to "${b}"`)
          .join(', ');
        manual.push(
          `<${m[1]} ${source.slice(attr.start, attr.end)}> at line ${line}: ${rule.version} maps ${rule.name} ${pairs}; the codemod cannot read the value, so check it by hand`,
        );
        continue;
      }
    }
    if (from < 0 || !Object.hasOwn(rule.values, value)) continue;
    edits.push({ start: from, end: from + value.length, text: rule.values[value] });
    sites++;
  }
  return { edits, sites, manual };
}

/**
 * The changed lines between `before` and `after`, as hunks for `--dry-run`
 * (the shape of jsx-fold's editHunks). A prop edit never adds or drops a line,
 * so line i of one is line i of the other.
 */
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

/**
 * Pure transform of one file's source: every rule, in order, each over the
 * output of the one before.
 * @param {string} source
 * @param {PropRule[]} rules
 */
export function transformSource(source, rules) {
  let out = source;
  let sites = 0;
  const manual = [];
  const { unterminated } = maskSource(source);
  if (unterminated)
    manual.push(
      `unreadable from line ${unterminated.line} (an unclosed ${unterminated.kind}, or a lone backtick or /* in prose); check its props by hand`,
    );
  for (const rule of rules) {
    const r = applyRule(out, rule);
    manual.push(...r.manual);
    for (const e of r.edits.sort((x, y) => y.start - x.start))
      out = out.slice(0, e.start) + e.text + out.slice(e.end);
    sites += r.sites;
  }
  return { source: out, changed: out !== source, sites, manual, edits: lineHunks(source, out) };
}

/**
 * Scan a directory. Writes only when `write` is true; `skip` lists directories
 * not to enter; `steps` are the ledger steps to apply (default: every release
 * this package ships).
 */
export function runCodemod({ root, write = false, skip = [], steps = shippedSteps(), fallback }) {
  const rules = rulesFromSteps(steps, fallback);
  const files = [];
  const manual = [];
  let sites = 0;
  if (rules.length === 0) return { files, sites, manual };
  for (const file of walk(root, new Set(skip.map((d) => resolve(d))), EXTS)) {
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue; // unreadable: nothing to rewrite
    }
    if (!src.includes(ROOT_PKG)) continue;
    const r = transformSource(src, rules);
    for (const stmt of r.manual) manual.push({ file: relative(root, file), stmt });
    if (!r.changed) continue;
    files.push({ file: relative(root, file), sites: r.sites, edits: r.edits });
    sites += r.sites;
    if (write) writeFileAtomic(file, r.source);
  }
  return { files, sites, manual };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function main(argv) {
  const args = { root: process.cwd(), check: false, dryRun: false, ledger: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') args.root = resolve(argv[++i] ?? '');
    else if (argv[i] === '--ledger') args.ledger = resolve(argv[++i] ?? '');
    else if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else {
      console.error(
        `unknown argument: ${argv[i]}\nusage: ${BIN} [--root <dir>] [--ledger <file>] [--check] [--dry-run]`,
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
  const res = runCodemod({ root: args.root, write, steps, fallback });
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
