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
 * CSS facts (hds#449) come from the snapshots' css sections when both have
 * one (cssFacts below): a variable removed or changed per context, a public
 * class or a utility removed, an @font-face removed, and a key the Tailwind
 * preset (./tailwind-preset, hds#466) no longer has.
 *
 * Prop facts (hds#461) come from the snapshots' props sections when both have
 * one (propFacts below): a prop removed or renamed, a prop now required, an
 * allowed value removed, a default changed.
 *
 * Type facts (hds#467) come from the snapshots' types section when both have
 * one (typeFacts below): a value now exported as a type only, a callable's
 * signature changed, a static member (Menu.Item) or an object key removed.
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

/** The CSS fact kinds (hds#449), read from both snapshots' `css` section. */
const CSS_FACT_KINDS = [
  'css-var-removed',
  'css-var-changed',
  'class-removed',
  'utility-removed',
  'font-face-removed',
  'preset-key-removed',
];

/** True for the id of a CSS fact: only a snapshot with a `css` section can have it. */
export const isCssFactId = (id) => CSS_FACT_KINDS.some((kind) => id.startsWith(`${kind}:`));

/** The prop fact kinds (hds#461), read from both snapshots' `props` section. */
const PROP_FACT_KINDS = [
  'prop-removed',
  'prop-required',
  'prop-value-removed',
  'prop-default-changed',
];

/** The type fact kinds (hds#467), read from both snapshots' `types` section. */
const TYPE_FACT_KINDS = ['export-type-only', 'signature-changed', 'member-removed', 'key-removed'];

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
  ...CSS_FACT_KINDS,
  ...PROP_FACT_KINDS,
  ...TYPE_FACT_KINDS,
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
    case 'css-var-changed':
      return `${fact.kind}:${fact.name}:${fact.context}`;
    case 'font-face-removed':
      return `${fact.kind}:${fact.family}/${fact.weight}/${fact.style}`;
    case 'prop-removed':
    case 'prop-required':
    case 'prop-default-changed':
      return `${fact.kind}:${fact.component}.${fact.prop}`;
    case 'prop-value-removed':
      return `${fact.kind}:${fact.component}.${fact.prop}:${fact.value}`;
    case 'export-type-only':
    case 'signature-changed':
      return `${fact.kind}:${fact.entry}:${fact.name}`;
    case 'member-removed':
      return `${fact.kind}:${fact.entry}:${fact.name}.${fact.member}`;
    case 'key-removed':
      return `${fact.kind}:${fact.entry}:${fact.name}.${fact.path}`;
    default:
      return `${fact.kind}:${fact.name}`;
  }
}

function sortKey(fact) {
  if (fact.kind === 'removed' || fact.kind === 'added') return [fact.entry, fact.name];
  if (fact.kind === 'moved') return [fact.from, fact.name];
  if (fact.kind === 'css-var-changed') return [fact.name, fact.context];
  if (fact.kind === 'font-face-removed') return [fact.family, fact.weight, fact.style];
  if (PROP_FACT_KINDS.includes(fact.kind)) return [fact.component, fact.prop, fact.value ?? ''];
  if (TYPE_FACT_KINDS.includes(fact.kind)) {
    return [fact.entry, fact.name, fact.member ?? fact.path ?? ''];
  }
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

/** Tailwind's own `--tw-*` plumbing: internal to the utilities, no consumer contract. */
const isTailwindInternal = (name) => name.startsWith('--tw-');

const fontKey = (face) => `${face.family}/${face.weight}/${face.style}`;

/** The tenant slug of a `[data-brand=<slug>]` context, or null for a base context. */
function brandOf(context) {
  const match = /\[data-brand=["']?([^\]"']+)["']?\]/.exec(context);
  return match ? match[1] : null;
}

/** The tenants whose `[data-brand]` contexts declare a variable, from each contexts map given. */
function overridingTenants(...contextMaps) {
  const slugs = new Set();
  for (const contexts of contextMaps) {
    for (const context of Object.keys(contexts ?? {})) {
      const slug = brandOf(context);
      if (slug) slugs.add(slug);
    }
  }
  return [...slugs].sort();
}

/**
 * The CSS facts between two `css` sections (scripts/build-css-contract.mjs),
 * stylesheet by stylesheet, for each stylesheet both releases ship (a
 * stylesheet whose exports key left is an exports-key-removed fact):
 *
 *   - css-var-removed: a custom property that left a stylesheet, with every
 *     stylesheet it left;
 *   - css-var-changed: a property both have, whose value in one context
 *     changed, appeared (`from` null) or went (`to` null); `from` and `to` are
 *     the first stylesheet's that changed, and `bundles` lists every one;
 *   - class-removed: an hds-* class, or one either manifest lists in
 *     publicClasses, that left a stylesheet; utility-removed: any other class
 *     (a Tailwind utility), which a consumer should not depend on;
 *   - font-face-removed: an @font-face (family, weight, style) that left;
 *   - preset-key-removed: a theme key of the Tailwind preset that left, when
 *     both contracts record the preset (tailwindPreset, hds#466).
 *
 * A variable fact a tenant can see carries `tenants`, the slugs it touches:
 * the slug of its `[data-brand=<slug>]` context, or, for a base context or a
 * removal, every tenant that overrides the variable. A pilot tenant's site
 * re-themes when either changes, so its upgrade needs a tenant step.
 *
 * `--tw-*` properties are Tailwind's internals and never a fact.
 */
function cssFacts(prev, next) {
  const before = prev.bundles ?? {};
  const after = next.bundles ?? {};
  const shared = Object.keys(before)
    .filter((key) => Object.hasOwn(after, key))
    .sort();
  const publicClasses = new Set([...(prev.publicClasses ?? []), ...(next.publicClasses ?? [])]);
  const isPublic = (name) => name.startsWith('hds-') || publicClasses.has(name);
  /** id -> fact, accumulating bundles in sorted order. */
  const found = new Map();
  const note = (body, key, tenants = []) => {
    const id = factId(body);
    const held = found.get(id);
    if (held) {
      held.bundles.push(key);
      if (tenants.length > 0) {
        held.tenants = [...new Set([...(held.tenants ?? []), ...tenants])].sort();
      }
    } else {
      found.set(id, { ...body, bundles: [key], ...(tenants.length > 0 ? { tenants } : {}) });
    }
  };

  for (const key of shared) {
    const [was, now] = [before[key], after[key]];
    for (const name of Object.keys(was.variables ?? {})) {
      if (isTailwindInternal(name)) continue;
      const nowContexts = now.variables?.[name];
      const wasContexts = was.variables[name];
      if (!nowContexts) {
        note({ kind: 'css-var-removed', name }, key, overridingTenants(wasContexts));
        continue;
      }
      const overriders = overridingTenants(wasContexts, nowContexts);
      const contexts = [
        ...new Set([...Object.keys(wasContexts), ...Object.keys(nowContexts)]),
      ].sort();
      for (const context of contexts) {
        const [from, to] = [wasContexts[context] ?? null, nowContexts[context] ?? null];
        if (from === to) continue;
        const slug = brandOf(context);
        note({ kind: 'css-var-changed', name, context, from, to }, key, slug ? [slug] : overriders);
      }
    }
    const nowClasses = new Set(now.classes ?? []);
    for (const name of was.classes ?? []) {
      if (nowClasses.has(name)) continue;
      note({ kind: isPublic(name) ? 'class-removed' : 'utility-removed', name }, key);
    }
    const nowFaces = new Set((now.fontFaces ?? []).map(fontKey));
    for (const face of was.fontFaces ?? []) {
      if (nowFaces.has(fontKey(face))) continue;
      const { family, weight, style } = face;
      note({ kind: 'font-face-removed', family, weight, style }, key);
    }
  }
  if (Array.isArray(prev.tailwindPreset) && Array.isArray(next.tailwindPreset)) {
    const kept = new Set(next.tailwindPreset);
    for (const name of prev.tailwindPreset) {
      if (!kept.has(name))
        found.set(`preset-key-removed:${name}`, { kind: 'preset-key-removed', name });
    }
  }
  return [...found].map(([id, body]) => ({ id, ...body }));
}

/**
 * The prop facts between two `props` sections (scripts/upgrade/props.mjs), for
 * each component both have (a component that left is a removed export):
 *
 *   - prop-removed: a prop that left, renamed or not (a diff sees no rename;
 *     a prop-renamed step names the survivor);
 *   - prop-required: a prop that was optional or absent and is now required;
 *   - prop-value-removed: an allowed value that left a prop both list values for;
 *   - prop-default-changed: a prop both have whose default changed.
 */
function propFacts(prev, next) {
  const facts = [];
  for (const component of Object.keys(prev).sort()) {
    const now = next[component];
    if (!now) continue;
    const was = prev[component];
    for (const prop of Object.keys(was).sort()) {
      const [before, after] = [was[prop], now[prop]];
      if (!after) {
        facts.push(fact({ kind: 'prop-removed', component, prop }));
        continue;
      }
      if (before.optional && !after.optional) {
        facts.push(fact({ kind: 'prop-required', component, prop }));
      }
      if (before.values && after.values) {
        const kept = new Set(after.values);
        for (const value of before.values.filter((v) => !kept.has(v)).sort()) {
          facts.push(fact({ kind: 'prop-value-removed', component, prop, value }));
        }
      }
      const [from, to] = [before.default ?? null, after.default ?? null];
      if (from !== to) {
        facts.push(fact({ kind: 'prop-default-changed', component, prop, from, to }));
      }
    }
    for (const prop of Object.keys(now).sort()) {
      if (!was[prop] && !now[prop].optional) {
        facts.push(fact({ kind: 'prop-required', component, prop }));
      }
    }
  }
  return facts;
}

/**
 * The type facts between two `types` sections (scripts/upgrade/types.mjs),
 * for each export both have in the same entry (one that left is a removed or
 * moved export):
 *
 *   - export-type-only: a value now exported as a type only;
 *   - signature-changed: a callable value whose call or construct signatures
 *     changed (a hook's parameters or return type);
 *   - member-removed: a static member that left a callable value (Menu.Item);
 *   - key-removed: a key path that left an object value (hds.color.x), only
 *     the top one: a removed group is one fact, not one per key under it.
 */
function typeFacts(prev, next) {
  const facts = [];
  for (const entry of Object.keys(prev).sort()) {
    const now = next[entry];
    if (!now) continue;
    for (const name of Object.keys(prev[entry]).sort()) {
      const [before, after] = [prev[entry][name], now[name]];
      if (!after || before.kind !== 'value') continue;
      if (after.kind !== 'value') {
        facts.push(fact({ kind: 'export-type-only', entry, name }));
        continue;
      }
      if (before.signatures && !same(before.signatures, after.signatures)) {
        const [from, to] = [before.signatures, after.signatures ?? []];
        facts.push(fact({ kind: 'signature-changed', entry, name, from, to }));
      }
      const members = new Set(after.members ?? []);
      for (const member of before.members ?? []) {
        if (!members.has(member)) facts.push(fact({ kind: 'member-removed', entry, name, member }));
      }
      const keys = new Set(after.keys ?? []);
      const gone = new Set((before.keys ?? []).filter((path) => !keys.has(path)));
      const parentGone = (path) => gone.has(path.slice(0, path.lastIndexOf('.')));
      for (const path of gone) {
        if (!parentGone(path)) facts.push(fact({ kind: 'key-removed', entry, name, path }));
      }
    }
  }
  return facts;
}

/**
 * Every fact between two snapshots, sorted by kind and then by entry and name.
 * CSS facts only when both carry a `css` section: a snapshot read from source
 * (snapshotFromSource) has none, because the stylesheets exist only after a
 * build. Prop facts only when both carry a `props` section.
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
    ...(prev.css && next.css ? cssFacts(prev.css, next.css) : []),
    ...(prev.props && next.props ? propFacts(prev.props, next.props) : []),
    ...(prev.types && next.types ? typeFacts(prev.types, next.types) : []),
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
