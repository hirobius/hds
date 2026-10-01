#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * diff.mjs — the facts between two release snapshots (hds#447).
 *
 * A fact is one mechanical difference a consumer may have to act on: an export
 * name that left an entry (removed; or moved, when another entry now exports
 * it from a module the first entry exported from), an export added, an exports key, a runtime dependency, a peer (range or
 * optional flag), an engine or a bin that came or went. Each has a stable `id`
 * (`removed:<entry>:<name>`, `moved:<from>:<name>`, `dependency-removed:<name>`
 * ...) that a ledger step lists in `facts`, so "every fact has a step" is a set
 * comparison (the 0.20.0 ledger test; the hds#448 gate).
 *
 * Renames are not facts: a diff sees `HdsCheckbox` leave and nothing arrive.
 * The ledger names the survivor from the codemod's data.
 *
 *   node scripts/upgrade/diff.mjs <prev> <next>
 *
 * Each argument is a snapshot file, or a version whose snapshot is committed at
 * docs/api/releases/<version>.json. Prints the facts as JSON.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatJson } from './format.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RELEASES_DIR = join(REPO, 'docs/api/releases');

/** Fact kinds, in the order a diff lists them. */
export const FACT_KINDS = [
  'removed',
  'moved',
  'added',
  'exports-key-removed',
  'exports-key-added',
  'dependency-removed',
  'dependency-added',
  'peer-changed',
  'engines-changed',
  'bin-removed',
  'bin-added',
];

/** The stable id of a fact. */
export function factId(fact) {
  switch (fact.kind) {
    case 'removed':
    case 'added':
      return `${fact.kind}:${fact.entry}:${fact.name}`;
    case 'moved':
      return `moved:${fact.from}:${fact.name}`;
    case 'exports-key-removed':
    case 'exports-key-added':
      return `${fact.kind}:${fact.key}`;
    default:
      return `${fact.kind}:${fact.name}`;
  }
}

function sortKey(fact) {
  if (fact.kind === 'removed' || fact.kind === 'added') return [fact.entry, fact.name];
  if (fact.kind === 'moved') return [fact.from, fact.name];
  return [fact.key ?? fact.name];
}

function compareFacts(a, b) {
  const byKind = FACT_KINDS.indexOf(a.kind) - FACT_KINDS.indexOf(b.kind);
  if (byKind !== 0) return byKind;
  const [x, y] = [sortKey(a), sortKey(b)];
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  }
  return 0;
}

const fact = (body) => ({ id: factId(body), ...body });
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function nameFacts(prev, next) {
  const facts = [];
  const moved = new Set();
  const names = (snap, entry) => snap.entries[entry] ?? {};
  const nextEntries = Object.keys(next.entries).sort();

  for (const entry of Object.keys(prev.entries).sort()) {
    const was = names(prev, entry);
    const now = names(next, entry);
    // The modules this entry exported from: a name that leaves it moved only
    // if another entry now exports it from one of them.
    const reached = new Set(Object.values(was));
    for (const name of Object.keys(was)) {
      if (Object.hasOwn(now, name)) continue;
      const elsewhere = nextEntries.filter(
        (e) =>
          e !== entry && Object.hasOwn(names(next, e), name) && reached.has(names(next, e)[name]),
      );
      if (elsewhere.length === 0) {
        facts.push(fact({ kind: 'removed', entry, name }));
        continue;
      }
      // Prefer the entry that gained the name in this release.
      const to = elsewhere.find((e) => !Object.hasOwn(names(prev, e), name)) ?? elsewhere[0];
      moved.add(`${to}\0${name}`);
      facts.push(fact({ kind: 'moved', name, from: entry, to }));
    }
  }
  for (const entry of nextEntries) {
    const was = names(prev, entry);
    for (const name of Object.keys(next.entries[entry])) {
      if (Object.hasOwn(was, name) || moved.has(`${entry}\0${name}`)) continue;
      facts.push(fact({ kind: 'added', entry, name }));
    }
  }
  return facts;
}

function keyFacts(prevKeys, nextKeys, removedKind, addedKind, body) {
  const facts = [];
  const prevSet = new Set(prevKeys);
  const nextSet = new Set(nextKeys);
  for (const key of prevKeys) if (!nextSet.has(key)) facts.push(fact(body(removedKind, key)));
  for (const key of nextKeys) if (!prevSet.has(key)) facts.push(fact(body(addedKind, key)));
  return facts;
}

function changedFacts(prevMap, nextMap, kind) {
  const names = [...new Set([...Object.keys(prevMap), ...Object.keys(nextMap)])].sort();
  return names
    .filter((name) => !same(prevMap[name], nextMap[name]))
    .map((name) => fact({ kind, name, from: prevMap[name] ?? null, to: nextMap[name] ?? null }));
}

/**
 * Every fact between two snapshots, sorted by kind and then by entry and name.
 * @param {object} prev the older release's snapshot
 * @param {object} next the newer release's snapshot
 */
export function diffSnapshots(prev, next) {
  const facts = [
    ...nameFacts(prev, next),
    ...keyFacts(
      prev.exportsKeys,
      next.exportsKeys,
      'exports-key-removed',
      'exports-key-added',
      (kind, key) => ({ kind, key }),
    ),
    ...keyFacts(
      Object.keys(prev.dependencies),
      Object.keys(next.dependencies),
      'dependency-removed',
      'dependency-added',
      (kind, name) => ({
        kind,
        name,
        range: (kind === 'dependency-removed' ? prev : next).dependencies[name],
      }),
    ),
    ...changedFacts(prev.peerDependencies, next.peerDependencies, 'peer-changed'),
    ...changedFacts(prev.engines, next.engines, 'engines-changed'),
    ...keyFacts(
      Object.keys(prev.bin),
      Object.keys(next.bin),
      'bin-removed',
      'bin-added',
      (kind, name) => ({
        kind,
        name,
        path: (kind === 'bin-removed' ? prev : next).bin[name],
      }),
    ),
  ];
  return facts.sort(compareFacts);
}

/** A snapshot file, or the committed snapshot of a version. */
export function readSnapshot(arg) {
  const file = existsSync(arg) ? arg : join(RELEASES_DIR, `${arg}.json`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('usage: diff.mjs <prev snapshot or version> <next snapshot or version>');
    process.exitCode = 2;
  } else {
    process.stdout.write(formatJson(diffSnapshots(readSnapshot(args[0]), readSnapshot(args[1]))));
  }
}
