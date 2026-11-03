#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/generate-spec-sheets.mjs (hds#598)
 *
 * Builds the data behind each core component's Figma spec sheet: anatomy,
 * sizes (with the token behind each value), states and their colour tokens,
 * props mapped to Figma variant properties, usage rules and the docs link.
 * Everything comes from code, never typed by hand:
 *   public/hds-manifest.json          componentSpecs (core, states, usage, anatomy, Figma mapping)
 *   component-api props               via the manifest's componentSpecs.props (its committed
 *                                     projection; src/app/data/component-api.json is gitignored,
 *                                     so reading it would make output machine-dependent)
 *   hirobius.tokens.json              component.<name>.* bindings, resolved to values
 * Writes figma/spec-sheets/<Component>.json. Drawing the sheets in Figma waits on hds#595.
 *
 * Usage: node scripts/generate-spec-sheets.mjs [--check]
 *   --check  exit 1 when a committed sheet differs from the generated one.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'figma/spec-sheets');

const REF = /^\{([^}]+)\}$/;
const COLOR_STATE = [
  [/Hover$/, 'hover'],
  [/Pressed$|Active$/, 'active'],
  [/Focus$|^focusRing$/, 'focus'],
  [/Disabled$/, 'disabled'],
];

function lookup(tree, dotted) {
  let node = tree;
  for (const key of dotted.split('.')) {
    if (node == null || typeof node !== 'object' || !(key in node)) return undefined;
    node = node[key];
  }
  return node;
}

function formatValue(v) {
  if (v && typeof v === 'object' && 'value' in v && 'unit' in v) return `${v.value}${v.unit}`;
  return v;
}

/** Resolve a token path to its first reference (if any) and its final value. */
export function resolveToken(tree, dotted, seen = new Set()) {
  if (seen.has(dotted)) throw new Error(`spec-sheets: circular token reference at ${dotted}`);
  seen.add(dotted);
  const node = lookup(tree, dotted);
  if (!node || !('$value' in node)) throw new Error(`spec-sheets: token ${dotted} not found`);
  const raw = node.$value;
  if (typeof raw === 'string' && REF.test(raw)) {
    const target = raw.match(REF)[1];
    if (!lookup(tree, target))
      throw new Error(`spec-sheets: ${dotted} references missing token ${target}`);
    return { ref: raw, value: resolveToken(tree, target, seen).value };
  }
  return { ref: null, value: formatValue(raw) };
}

function groupKey(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function leaves(node, prefix = []) {
  const out = [];
  for (const [k, v] of Object.entries(node ?? {})) {
    if (k.startsWith('$') || !v || typeof v !== 'object') continue;
    if ('$value' in v) out.push({ path: [...prefix, k], node: v });
    else out.push(...leaves(v, [...prefix, k]));
  }
  return out;
}

function stateOf(leafName) {
  for (const [re, state] of COLOR_STATE) if (re.test(leafName)) return state;
  return 'default';
}

export function buildSpecSheet(name, spec, tree) {
  const group = groupKey(name);
  const base = `component.${group}`;
  const all = leaves(lookup(tree, base));

  const sizeMap = new Map();
  for (const { path: p } of all) {
    if (p[0] !== 'size' || p.length !== 3) continue;
    const [, size, prop] = p;
    if (!sizeMap.has(size)) sizeMap.set(size, {});
    const token = `${base}.${p.join('.')}`;
    sizeMap.get(size)[prop] = { token, value: resolveToken(tree, token).value };
  }
  const sizes = [...sizeMap].map(([size, values]) => ({ size, values }));

  const colorTokens = all
    .filter(({ path: p, node }) => p.length === 1 && node.$type === 'color')
    .map(({ path: p }) => {
      const token = `${base}.${p[0]}`;
      return { name: p[0], token, value: resolveToken(tree, token).value, state: stateOf(p[0]) };
    });
  const states = (spec.states ?? ['default']).map((state) => ({
    state,
    tokens: colorTokens.filter((t) => t.state === state).map(({ state: _s, ...t }) => t),
  }));

  const mapping = spec.figmaPropertyMapping ?? {};
  const props = Object.entries(spec.props ?? {}).map(([propName, p]) => ({
    name: propName,
    ...p,
    ...(mapping[propName] ? { figmaProperty: mapping[propName] } : {}),
  }));

  const anatomy = [
    { part: 'Root' },
    ...(spec.componentProperties ?? []).map((cp) => ({
      part: cp.targetSelector ?? cp.name,
      figmaProperty: cp.name,
      sourceProp: cp.sourceProp,
      type: cp.type,
    })),
  ];

  return {
    component: name,
    description: spec.description ?? '',
    docsPage: spec.docsPage ?? null,
    figmaLink: spec.figmaLink ?? spec.figmaUrl ?? null,
    anatomy,
    sizes,
    states,
    props,
    roleTokens: spec.tokens ?? {},
    usage: spec.usage ?? null,
  };
}

export function buildSpecSheets(manifest, tree) {
  const sheets = {};
  for (const [name, spec] of Object.entries(manifest.componentSpecs ?? {})) {
    if (!spec.core) continue;
    sheets[name] = buildSpecSheet(name, spec, tree);
  }
  return sheets;
}

function readJson(rel) {
  return JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
}

function main() {
  const check = process.argv.includes('--check');
  const sheets = buildSpecSheets(
    readJson('public/hds-manifest.json'),
    readJson('hirobius.tokens.json'),
  );
  mkdirSync(OUT_DIR, { recursive: true });
  const drift = [];
  for (const [name, sheet] of Object.entries(sheets)) {
    const file = path.join(OUT_DIR, `${name}.json`);
    const text = `${JSON.stringify(sheet, null, 2)}\n`;
    if (check) {
      if (!existsSync(file) || readFileSync(file, 'utf8') !== text) drift.push(name);
    } else writeFileSync(file, text);
  }
  if (check) {
    const extra = readdirSync(OUT_DIR).filter(
      (f) => f.endsWith('.json') && !sheets[f.slice(0, -5)],
    );
    if (drift.length || extra.length) {
      console.error(
        `spec-sheets: out of date: ${[...drift, ...extra].join(', ')}. Run node scripts/generate-spec-sheets.mjs`,
      );
      process.exit(1);
    }
    console.log(`spec-sheets: ${Object.keys(sheets).length} sheets up to date`);
  } else
    console.log(`spec-sheets: wrote ${Object.keys(sheets).length} sheets to figma/spec-sheets/`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
