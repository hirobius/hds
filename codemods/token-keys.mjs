#!/usr/bin/env node
/**
 * token-keys codemod (hds#955): rewrites the `hds.a.b` token paths a consumer
 * reads in JS, as the upgrade ledger says. Like hds-prop-map it is driven by
 * data: its rules are the ledger steps whose `auto.codemod` is hds-token-keys,
 * each with `tokens`, the old path under `hds.` mapped to the new one, so a
 * release that moves a token ships a ledger step, not a bin.
 *
 *   step tokens { 'density.md': 'semantic.space.scale.sm' }
 *     hds.density.md                hds.semantic.space.scale.sm
 *     hds.density.md.length         hds.semantic.space.scale.sm.length
 *
 * It follows the name a file binds `hds` to from the package root or a
 * subpath: an alias (`hds as t`) and a namespace import (`H.hds.density.md`).
 * A comment or string is left alone, and so is a file that does not import
 * hds from the package. Listed for a manual edit, naming the release from the
 * step: a computed read of a group a step maps (`hds.density[k]`), since it
 * may read any of its paths. A path the step does not map (`hds.density.xs`)
 * and destructuring (`const { density } = hds`) stay as written; the step's
 * `detect` still finds them, so the upgrade command lists them. Steps apply in release order, so a later step can move a path
 * an earlier one wrote. It reads .mdx as well as code. Running it twice
 * changes nothing.
 *
 *   node codemods/token-keys.mjs [--root <dir>] [--ledger <file>] [--check] [--dry-run]
 *
 * Flags as hds-prop-map (codemods/lib/ledger-codemod.mjs).
 */
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { writeFileAtomic } from './lib/atomic-write.mjs';
import {
  byRelease,
  ledgerMain,
  lineHunks,
  shippedSteps,
  stepVersion,
} from './lib/ledger-codemod.mjs';
import { namedImports, namespaceImports } from './lib/scan.mjs';
import { CODE_EXTS, ROOT_PKG, isEntry, walk } from './jsx-fold.mjs';
import { maskSource } from './unrewritable.mjs';

const BIN = 'hds-token-keys';
const EXTS = new Set([...CODE_EXTS, '.mdx']);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @typedef {{ version: string, plain: string, paths: Record<string, string> }} TokenRule */

/**
 * The rules in a ledger's steps: each token step this codemod applies, in
 * release order. A pending note's ids leave out the version, so its steps
 * take `fallback`.
 * @returns {TokenRule[]}
 */
export function rulesFromSteps(steps, fallback) {
  return steps
    .filter((s) => s.auto?.codemod === BIN && s.tokens && Object.keys(s.tokens).length > 0)
    .map((s) => ({ version: stepVersion(s, fallback), plain: s.plain, paths: s.tokens }))
    .sort(byRelease);
}

const isHds = (from) => from === ROOT_PKG || from.startsWith(`${ROOT_PKG}/`);

/** The names a file reads the token object as: its import locals and `Ns.hds`. */
function hdsNames(source) {
  const named = namedImports(source)
    .filter((i) => isHds(i.from) && i.name === 'hds')
    .map((i) => i.local);
  const spaced = namespaceImports(source)
    .filter((i) => isHds(i.from))
    .map((i) => `${i.local}.hds`);
  return [...new Set([...named, ...spaced])];
}

const lineOf = (source, at) => source.slice(0, at).split('\n').length;

/** One rule over one source: the edits it makes and what it cannot do. */
function applyRule(source, rule) {
  const names = hdsNames(source);
  if (names.length === 0) return { edits: [], sites: 0, manual: [] };
  // A group is the parent of a mapped path.
  const groups = new Set(Object.keys(rule.paths).map((k) => k.slice(0, k.lastIndexOf('.'))));
  const { code } = maskSource(source);
  const re = new RegExp(
    `(?<![\\w$.])(${names.map(esc).join('|')})((?:\\.[A-Za-z_$][\\w$]*)+)(?![\\w$])`,
    'g',
  );
  const edits = [];
  const manual = [];
  let sites = 0;
  for (const m of code.matchAll(re)) {
    const segs = m[2].slice(1).split('.');
    let hit = -1;
    for (let n = segs.length; n > 0 && hit < 0; n--)
      if (Object.hasOwn(rule.paths, segs.slice(0, n).join('.'))) hit = n;
    if (hit > 0) {
      const key = segs.slice(0, hit).join('.');
      const start = m.index + m[1].length + 1;
      edits.push({ start, end: start + key.length, text: rule.paths[key] });
      sites++;
      continue;
    }
    // `hds.density[k]` may read any path the step maps, so it cannot be rewritten.
    const path = segs.join('.');
    if (groups.has(path) && code[m.index + m[0].length] === '[')
      manual.push(
        `${m[0]}[…] at line ${lineOf(source, m.index)}: ${rule.version} moves paths under ${path} (${rule.plain.replace(/\.$/, '')}); the codemod cannot tell which this reads, so edit it by hand`,
      );
  }
  return { edits, sites, manual };
}

/**
 * Pure transform of one file's source: every rule, in order, each over the
 * output of the one before.
 * @param {string} source
 * @param {TokenRule[]} rules
 */
export function transformSource(source, rules) {
  let out = source;
  let sites = 0;
  const manual = [];
  const { unterminated } = maskSource(source);
  if (unterminated)
    manual.push(
      `unreadable from line ${unterminated.line} (an unclosed ${unterminated.kind}, or a lone backtick or /* in prose); check its token paths by hand`,
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

if (isEntry(import.meta.url)) {
  process.exit(ledgerMain(BIN, runCodemod, process.argv.slice(2)));
}
