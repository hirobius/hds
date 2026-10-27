#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * props.mjs — the props baseline (hds#461): every component's props with
 * their type, whether they are optional, their allowed values and their
 * default, the input the upgrade gate draws prop facts from.
 *
 * Why: the release snapshot records export names only, so renaming a prop,
 * removing a variant value, making a prop required or changing a cva default
 * all passed the gate with 0 findings, and values that come from a CMS, from
 * JSON or from LLM output then failed silently.
 *
 * Read from src/app/data/component-api.json (scripts/generate-component-api.mjs:
 * a named literal alias is already expanded by the TypeChecker, hds#406), plus
 * a static read of each component file's cva `defaultVariants`
 * (scripts/lib/component-code-model.mjs extractCva) for a prop docgen gives no
 * default: none of the cva defaults reach the manifest. Shape:
 *
 *   { <Component>: { <prop>: { type, optional, values, default } } }
 *
 * `values` is the literal union's members in declaration order, or null when
 * the type is not only string literals; `default` is a string or null.
 *
 * The baseline is committed at docs/api/props-baseline.json and ships in the
 * package, so `snapshot.mjs --from-npm` reads the very bytes; the snapshot's
 * `props` section (snapshot.mjs) is this, so each release snapshot keeps its
 * own. scripts/check-upgrade-ledger.mjs fails when the committed file no longer
 * matches component-api.json (CI regenerates component-api.json first).
 *
 *   node scripts/upgrade/props.mjs            # write docs/api/props-baseline.json
 *   node scripts/upgrade/props.mjs --check    # exit 1 if it is stale
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCva } from '../lib/component-code-model.mjs';
import { formatJson, sortedObject } from './format.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PROPS_BASELINE = 'docs/api/props-baseline.json';
export const COMPONENT_API = 'src/app/data/component-api.json';

/** Splits a type on its top-level `|`, outside quotes, brackets and generics. */
function unionMembers(type) {
  const members = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < type.length; i++) {
    const ch = type[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if ('([{<'.includes(ch)) depth++;
    else if (')]}'.includes(ch) || (ch === '>' && type[i - 1] !== '=')) depth--;
    else if (ch === '|' && depth === 0) {
      members.push(type.slice(start, i).trim());
      start = i + 1;
    }
  }
  members.push(type.slice(start).trim());
  return members.filter(Boolean);
}

/**
 * The members of a string-literal union, in order, without null and
 * undefined; null when any other member is there.
 * @param {string} type
 * @returns {string[] | null}
 */
export function literalValues(type) {
  const members = unionMembers(String(type ?? '')).filter((m) => m !== 'null' && m !== 'undefined');
  if (members.length === 0) return null;
  const values = [];
  for (const member of members) {
    const literal = /^"((?:[^"\\]|\\.)*)"$|^'((?:[^'\\]|\\.)*)'$/.exec(member);
    if (!literal) return null;
    values.push(literal[1] ?? literal[2]);
  }
  return [...new Set(values)];
}

/**
 * The props baseline of a component-api.json manifest.
 * @param {{ components: Record<string, { filePath?: string, props?: object[] }> }} manifest
 * @param {(filePath: string) => string | null} readSource a component file's text
 */
export function propsFromManifest(manifest, readSource) {
  const cvaDefaults = new Map();
  const defaultsOf = (filePath) => {
    if (!filePath) return {};
    if (!cvaDefaults.has(filePath)) {
      const source = readSource(filePath);
      // Only a cva axis's default: a plain prop that shares a name keeps none.
      const { axes, defaults } = source ? extractCva(source) : { axes: {}, defaults: {} };
      cvaDefaults.set(
        filePath,
        Object.fromEntries(Object.entries(defaults).filter(([name]) => Object.hasOwn(axes, name))),
      );
    }
    return cvaDefaults.get(filePath);
  };
  return sortedObject(manifest.components, (entry) => {
    const defaults = defaultsOf(entry.filePath);
    const props = Object.fromEntries(
      (entry.props ?? []).map((prop) => [
        prop.name,
        {
          type: prop.type,
          optional: !prop.required,
          values: literalValues(prop.type),
          default:
            prop.default ?? (Object.hasOwn(defaults, prop.name) ? defaults[prop.name] : null),
        },
      ]),
    );
    return sortedObject(props);
  });
}

/** The baseline of the tree at `root`, from its component-api.json; null when it has none. */
export function buildProps(root) {
  const file = join(root, COMPONENT_API);
  if (!existsSync(file)) return null;
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  return propsFromManifest(manifest, (filePath) => {
    const source = join(root, filePath);
    return existsSync(source) ? readFileSync(source, 'utf8') : null;
  });
}

/** The committed docs/api/props-baseline.json under `root`, or null. */
export function readPropsBaseline(root) {
  const file = join(root, PROPS_BASELINE);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

/** Writes docs/api/props-baseline.json from the tree's component-api.json. */
export function writePropsBaseline(root = REPO) {
  const props = buildProps(root);
  if (!props)
    throw new Error(`${COMPONENT_API} is missing: run node scripts/generate-component-api.mjs`);
  mkdirSync(join(root, dirname(PROPS_BASELINE)), { recursive: true });
  writeFileSync(join(root, PROPS_BASELINE), formatJson(props));
  return props;
}

/** True when the committed baseline is the one component-api.json gives (or there is none to check). */
export function propsBaselineFresh(root) {
  const props = buildProps(root);
  if (!props) return true;
  const file = join(root, PROPS_BASELINE);
  return existsSync(file) && readFileSync(file, 'utf8') === formatJson(props);
}

function main(argv) {
  if (argv.includes('--check')) {
    if (propsBaselineFresh(REPO)) {
      console.log(`✓ ${PROPS_BASELINE} matches ${COMPONENT_API}`);
      return 0;
    }
    console.error(`✗ ${PROPS_BASELINE} is stale: run node scripts/upgrade/props.mjs`);
    return 1;
  }
  writePropsBaseline(REPO);
  console.log(`✓ ${PROPS_BASELINE}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
