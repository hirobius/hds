/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * css-contract.mjs — reads the CSS contract of a package's stylesheets
 * (hds#449). scripts/build-css-contract.mjs is the CLI that writes it to
 * dist/css-contract.json and documents what it holds; the release snapshot
 * (scripts/upgrade/snapshot.mjs), the CSS upgrade gate
 * (scripts/check-upgrade-css.mjs) and the manifest's publicClasses
 * (./public-classes.mjs) read it through here.
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse as parseCss } from 'postcss';

export const CONTRACT_FILE = 'dist/css-contract.json';
const CONTRACT_FORMAT = 1;

const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** A copy of `object` with its keys sorted by code unit. */
function sorted(object, map = (value) => value) {
  return Object.fromEntries(
    Object.keys(object)
      .sort(byCodeUnit)
      .map((key) => [key, map(object[key])]),
  );
}

/** One CSS escape at `s[i]` (the backslash): the character it stands for and where it ends. */
function readEscape(s, i) {
  const hex = /^[0-9a-fA-F]{1,6}[ \t\n\r\f]?/.exec(s.slice(i + 1, i + 8));
  if (hex) {
    const code = parseInt(hex[0].trim(), 16);
    return { char: String.fromCodePoint(code), end: i + 1 + hex[0].length };
  }
  return { char: s[i + 1] ?? '', end: i + 2 };
}

/** The index after the quoted string or bracketed block that starts at `i`. */
function skipBlock(s, i) {
  const close = s[i] === '[' ? ']' : s[i];
  let quote = null;
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (c === '\\') j++;
    else if (quote) {
      if (c === quote) quote = null;
    } else if (close === ']' && (c === '"' || c === "'")) quote = c;
    else if (c === close) return j + 1;
  }
  return s.length;
}

/**
 * The class names a selector names, unescaped and sorted. Attribute values
 * and strings are skipped, so `a[href$=".pdf"]` names none.
 * @param {string} selector
 * @returns {string[]}
 */
export function selectorClasses(selector) {
  const out = new Set();
  const s = selector;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') {
      i = readEscape(s, i).end;
    } else if (c === '[' || c === '"' || c === "'") {
      i = skipBlock(s, i);
    } else if (c === '.' && i + 1 < s.length && !/[0-9]/.test(s[i + 1])) {
      let name = '';
      let j = i + 1;
      while (j < s.length) {
        const ch = s[j];
        if (ch === '\\') {
          const escape = readEscape(s, j);
          name += escape.char;
          j = escape.end;
        } else if (/[\w-]/.test(ch) || ch.charCodeAt(0) >= 0x80) {
          name += ch;
          j++;
        } else break;
      }
      if (name) out.add(name);
      i = j;
    } else i++;
  }
  return [...out].sort(byCodeUnit);
}

const collapse = (text) => text.replace(/\s+/g, ' ').trim();
const unquote = (text) => collapse(text).replace(/^(['"])(.*)\1$/, '$2');

/** A rule is a context when its selector names no class but `.dark`. */
const isContext = (selector) => selectorClasses(selector).every((name) => name === 'dark');

/** Each source of an @font-face src list: a url() basename, data:<type> or local(<name>). */
function fontSources(src) {
  const out = [];
  for (const [, kind, raw] of src.matchAll(/\b(url|local)\(\s*([^)]*?)\s*\)/g)) {
    const value = unquote(raw);
    if (kind === 'local') out.push(`local(${value})`);
    else if (value.startsWith('data:')) out.push(value.slice(0, value.search(/[;,]|$/)));
    else out.push(basename(value.replace(/[?#].*$/, '')));
  }
  return out;
}

/** The enclosing at-rules and rules of a node, outermost first, as a context prefix. */
function contextOf(node) {
  const chain = [];
  for (let p = node.parent; p && p.type !== 'root'; p = p.parent) {
    chain.unshift(p.type === 'atrule' ? collapse(`@${p.name} ${p.params}`) : collapse(p.selector));
  }
  return chain.join(' ');
}

/** True inside an at-rule whose children are not style rules (@keyframes, @property). */
function insideNonStyle(node) {
  for (let p = node.parent; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule' && /^(-\w+-)?keyframes$|^property$|^font-face$/.test(p.name)) {
      return true;
    }
  }
  return false;
}

/** The dotted name of a @layer block, nested layers included (`a.b`). */
function layerPath(atrule) {
  const names = [];
  for (let p = atrule; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule' && p.name === 'layer') names.unshift(collapse(p.params));
  }
  return names.join('.');
}

/**
 * The contract of one stylesheet's text.
 * @param {string} css
 * @returns {{ classes: string[], fontFaces: object[], layers: string[], variables: Record<string, Record<string, string>> }}
 */
export function cssBundleContract(css) {
  const root = parseCss(css);
  const classes = new Set();
  const fontFaces = [];
  const layers = [];
  /** name -> context -> { value, important } */
  const variables = new Map();

  const addLayer = (name) => {
    if (name && !layers.includes(name)) layers.push(name);
  };

  root.walkAtRules((atrule) => {
    if (atrule.name === 'layer') {
      if (atrule.nodes) addLayer(layerPath(atrule));
      else {
        const prefix = layerPath(atrule.parent?.type === 'atrule' ? atrule.parent : null);
        for (const name of atrule.params.split(',').map(collapse)) {
          addLayer(prefix ? `${prefix}.${name}` : name);
        }
      }
    } else if (atrule.name === 'font-face') {
      const descriptors = {};
      atrule.each((decl) => {
        if (decl.type === 'decl') descriptors[decl.prop.toLowerCase()] = decl.value;
      });
      fontFaces.push({
        family: unquote(descriptors['font-family'] ?? ''),
        weight: collapse(descriptors['font-weight'] ?? 'normal'),
        style: collapse(descriptors['font-style'] ?? 'normal'),
        src: fontSources(descriptors.src ?? ''),
      });
    }
  });

  root.walkRules((rule) => {
    if (insideNonStyle(rule)) return;
    for (const name of selectorClasses(rule.selector)) classes.add(name);
    if (!isContext(rule.selector)) return;
    const prefix = contextOf(rule);
    const context = prefix ? `${prefix} ${collapse(rule.selector)}` : collapse(rule.selector);
    rule.each((decl) => {
      if (decl.type !== 'decl' || !decl.prop.startsWith('--')) return;
      const contexts = variables.get(decl.prop) ?? new Map();
      variables.set(decl.prop, contexts);
      const held = contexts.get(context);
      if (held?.important && !decl.important) return;
      contexts.set(context, { value: collapse(decl.value), important: decl.important });
    });
  });

  const vars = {};
  for (const [name, contexts] of variables) {
    vars[name] = {};
    for (const [context, { value, important }] of contexts) {
      vars[name][context] = important ? `${value} !important` : value;
    }
  }
  const faceKey = (f) => `${f.family}\0${f.weight}\0${f.style}\0${f.src.join(',')}`;
  return {
    classes: [...classes].sort(byCodeUnit),
    fontFaces: fontFaces.sort((a, b) => byCodeUnit(faceKey(a), faceKey(b))),
    layers,
    variables: sorted(vars, (contexts) => sorted(contexts)),
  };
}

/** The stylesheets a package.json#exports map names: exports key -> path. */
function stylesheetExports(pkg) {
  const exportsMap = typeof pkg.exports === 'object' && pkg.exports ? pkg.exports : {};
  return Object.fromEntries(
    Object.entries(exportsMap)
      .filter(([, value]) => typeof value === 'string' && value.endsWith('.css'))
      .sort(([a], [b]) => byCodeUnit(a, b)),
  );
}

/** The manifest's publicClasses, sorted; empty when the manifest has none. */
function readPublicClasses(dir) {
  const file = join(dir, 'public/hds-manifest.json');
  if (!existsSync(file)) return [];
  const list = JSON.parse(readFileSync(file, 'utf8')).publicClasses;
  return Array.isArray(list) ? [...new Set(list)].sort(byCodeUnit) : [];
}

/**
 * The CSS contract of a package directory (the repo after build:lib, or an
 * unpacked tarball), built from its stylesheets. Null when it ships none of
 * the stylesheets its exports name (a test fixture with no CSS); throws when
 * it ships some but not all.
 * @param {string} dir
 */
export function buildCssContract(dir) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const sheets = stylesheetExports(pkg);
  const present = Object.entries(sheets).filter(([, path]) => existsSync(join(dir, path)));
  if (present.length === 0) return null;
  const missing = Object.entries(sheets).filter(([, path]) => !existsSync(join(dir, path)));
  if (missing.length > 0) {
    const [[key, path]] = missing;
    throw new Error(
      `exports["${key}"] is ${path}, which is not in ${dir}; run pnpm build:lib so every stylesheet is built`,
    );
  }
  const bundles = {};
  for (const [key, path] of present) {
    bundles[key] = cssBundleContract(readFileSync(join(dir, path), 'utf8'));
  }
  return { format: CONTRACT_FORMAT, bundles, publicClasses: readPublicClasses(dir) };
}

/** The bytes dist/css-contract.json holds: one line, so the tarball carries no indentation. */
export const formatContract = (contract) => `${JSON.stringify(contract)}\n`;

/**
 * dist/css-contract.json of a package directory, parsed, or null when it has
 * none (a tarball from before hds#449).
 */
export function readCssContract(dir) {
  const file = join(dir, CONTRACT_FILE);
  if (!existsSync(file)) return null;
  const contract = JSON.parse(readFileSync(file, 'utf8'));
  if (contract?.format !== CONTRACT_FORMAT) {
    throw new Error(
      `${file} has format ${contract?.format}; this script reads format ${CONTRACT_FORMAT}`,
    );
  }
  return contract;
}
