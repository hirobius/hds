/**
 * scan — read a consumer's code once and answer a ledger step's `detect`
 * (upgrade/schema.json, $defs.detect) against it (hds#452).
 *
 * Node builtins only: this runs on consumer machines from the published
 * package. Each detector reads the files it can mean something in:
 *
 *   imports, jsx, bareImports   code (.ts .tsx .js .jsx .mjs .cjs .mts .cts .mdx)
 *   classes                     code (className / class attributes), CSS
 *                               selectors and @apply, HTML class attributes
 *   cssVars, cssVarWrites       code, CSS and HTML
 *   regex                       code, CSS and HTML
 *
 * Plain Markdown is not read: a README that mentions a name is not a use.
 */
import { closeSync, openSync, readdirSync, readFileSync, readSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { HDS_PACKAGE as HDS } from './installed-version.mjs';

/** Directories never read: dependencies, VCS data and build output. */
export const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.vercel',
  '.turbo',
  '.svelte-kit',
  'coverage',
  'storybook-static',
]);

const CODE = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.mdx']);
const STYLE = new Set(['.css', '.scss']);
const MARKUP = new Set(['.html']);

/** Files larger than this are generated or vendored, not code a person wrote. */
export const MAX_BYTES = 1_000_000;

const extOf = (name) => {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
};

/**
 * Every file under `root` a detector reads, with its text.
 * @param {string} root
 * @param {{ skip?: string[], oversized?: { rel: string, abs: string }[] }} [options]
 *   skip: absolute directories not to enter (nested importers); oversized:
 *   collects the files of a kind a detector reads that are over MAX_BYTES,
 *   so the caller can say they were not read instead of passing them over.
 * @returns {{ rel: string, ext: string, kind: 'code'|'style'|'markup', text: string }[]}
 */
export function collectFiles(root, { skip = [], oversized = null } = {}) {
  const skipped = new Set(skip.map((dir) => resolve(dir)));
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !skipped.has(full)) walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = extOf(entry.name);
      const kind = CODE.has(ext)
        ? 'code'
        : STYLE.has(ext)
          ? 'style'
          : MARKUP.has(ext)
            ? 'markup'
            : null;
      if (!kind) continue;
      try {
        const rel = relative(root, full).split(sep).join('/');
        if (statSync(full).size > MAX_BYTES) {
          oversized?.push({ rel, abs: full });
          continue;
        }
        out.push({
          rel,
          ext,
          kind,
          text: readFileSync(full, 'utf8'),
        });
      } catch {
        // unreadable: not ours to report
      }
    }
  };
  walk(resolve(root));
  return out;
}

/**
 * Whether a file holds `needle`, read in chunks so a file of any size costs
 * one buffer (for the files collectFiles leaves out as too big). An
 * unreadable file counts as holding it: the caller cannot rule it out.
 */
export function fileMentions(file, needle) {
  const CHUNK = 1 << 20;
  const buf = Buffer.alloc(CHUNK);
  const target = Buffer.from(needle);
  let fd;
  try {
    fd = openSync(file, 'r');
    let carry = Buffer.alloc(0);
    for (;;) {
      const n = readSync(fd, buf, 0, CHUNK, null);
      if (n === 0) return false;
      const chunk = Buffer.concat([carry, buf.subarray(0, n)]);
      if (chunk.includes(target)) return true;
      carry = chunk.subarray(Math.max(0, chunk.length - (target.length - 1)));
    }
  } catch {
    return true;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const NAMED =
  /\b(?:import|export)\s+(?:type\s+)?(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*(['"])([^'"\n]+)\2/g;

const DESTRUCTURED =
  /\b(?:const|let|var)\s*\{([^}]*)\}\s*=\s*(?:await\s+)?(?:require|import)\s*\(\s*(['"])([^'"\n]+)\2\s*\)/g;

/**
 * Named imports and re-exports in a file: `{ from, name, local }`. Also the
 * names a `const { a, b: c } = require(...)` or `= await import(...)`
 * destructures, which bind the same exports.
 */
export function namedImports(text) {
  const out = [];
  for (const m of text.matchAll(DESTRUCTURED)) {
    for (const raw of stripComments(m[1]).split(',')) {
      const spec = raw.trim().replace(/\s*=[\s\S]*$/, '');
      if (!spec || spec.startsWith('...')) continue;
      const [name, local = name] = spec.split(':').map((s) => s.trim());
      if (/^[\w$]+$/.test(name) && /^[\w$]+$/.test(local)) out.push({ from: m[3], name, local });
    }
  }
  for (const m of text.matchAll(NAMED)) {
    for (const raw of stripComments(m[1]).split(',')) {
      const spec = raw.trim().replace(/^type\s+/, '');
      if (!spec) continue;
      const [name, local = name] = spec.split(/\s+as\s+/).map((s) => s.trim());
      out.push({ from: m[3], name, local });
    }
  }
  return out;
}

const NAMESPACE_FORMS = [
  /\bimport\s+(?:type\s+)?(?:[\w$]+\s*,\s*)?\*\s*as\s+([\w$]+)\s+from\s*(['"])([^'"\n]+)\2/g,
  /\bimport\s+(?:type\s+)?([\w$]+)\s*(?:,\s*\{[^}]*\}\s*)?from\s*(['"])([^'"\n]+)\2/g,
  /\b(?:const|let|var)\s+([\w$]+)\s*=\s*(?:await\s+)?(?:require|import)\s*\(\s*(['"])([^'"\n]+)\2\s*\)/g,
];

/**
 * Namespace bindings in a file: `import * as X from`, `import X from` and
 * `const X = require(...)` bind the whole module, so `X.Name` is the export
 * Name. `{ from, local }` for each.
 */
export function namespaceImports(text) {
  const out = [];
  for (const re of NAMESPACE_FORMS) {
    for (const m of text.matchAll(re)) out.push({ from: m[3], local: m[1] });
  }
  return out;
}

const SPECIFIERS = [
  /\bfrom\s*(['"])([^'"\n]+)\1/g,
  /\bimport\s*(['"])([^'"\n]+)\1/g,
  /\b(?:require|import)\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g,
];
const CSS_IMPORT = /@import\s+(?:url\(\s*)?(['"])([^'"\n]+)\1/g;

/** Every module specifier a file imports or requires. */
function specifiers(file) {
  const patterns = file.kind === 'style' ? [CSS_IMPORT] : file.kind === 'code' ? SPECIFIERS : [];
  return patterns.flatMap((re) => [...file.text.matchAll(re)].map((m) => m[2]));
}

const CLASS_ATTR =
  /\bclass(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`))/g;

/** The class tokens a file's class / className attributes name. */
function attrClasses(text) {
  const out = new Set();
  for (const m of text.matchAll(CLASS_ATTR)) {
    const value = m.slice(1).find((v) => v !== undefined) ?? '';
    for (const token of value.split(/\s+/)) if (token) out.add(token);
  }
  return out;
}

/** A class name as a CSS selector writes it: `sm:text-4xl` → `sm\:text-4xl`. */
const cssEscape = (name) => name.replace(/[^\w-]/g, (ch) => `\\${ch}`);

function usesClass(file, name) {
  if (file.kind === 'style') {
    const selector = new RegExp(`\\.${escapeRe(cssEscape(name))}(?![\\w-]|\\\\)`);
    if (selector.test(file.text)) return true;
    for (const m of file.text.matchAll(/@apply\s+([^;}]+)/g)) {
      if (m[1].split(/\s+/).includes(name)) return true;
    }
    return false;
  }
  return attrClasses(file.text).has(name);
}

/** The local name each HDS export is bound to in a file (`Card as Panel` → Card: [Panel]). */
function hdsBindings(file) {
  const out = new Map();
  for (const { from, name, local } of namedImports(file.text)) {
    if (from !== HDS && !from.startsWith(`${HDS}/`)) continue;
    out.set(name, [...(out.get(name) ?? []), local]);
  }
  return out;
}

/** The local names bound to the whole HDS module (or a subpath) in a file. */
function hdsNamespaces(file) {
  return namespaceImports(file.text)
    .filter(({ from }) => from === HDS || from.startsWith(`${HDS}/`))
    .map(({ local }) => local);
}

function usesJsx(file, tag) {
  const [head, ...rest] = tag.split('.');
  const locals = hdsBindings(file).get(head) ?? [];
  const tail = rest.map((part) => `\\.${escapeRe(part)}`).join('');
  if (locals.some((local) => new RegExp(`<${escapeRe(local)}${tail}(?=[\\s/>])`).test(file.text))) {
    return true;
  }
  // `<X.StatusDot` where X is a namespace binding of the package.
  return hdsNamespaces(file).some((ns) =>
    new RegExp(`<${escapeRe(ns)}\\.${escapeRe(tag)}(?=[\\s/>])`).test(file.text),
  );
}

/** Does the file reach one of `names` of `from` as `X.Name` on a namespace binding? */
function usesNamespaceMember(file, from, names) {
  return namespaceImports(file.text)
    .filter((ns) => ns.from === from)
    .some((ns) =>
      names.some((name) =>
        new RegExp(`(?<![\\w$.])${escapeRe(ns.local)}\\s*\\.\\s*${escapeRe(name)}(?![\\w$])`).test(
          file.text,
        ),
      ),
    );
}

const compiled = new Map();
const regexOf = (source) => {
  if (!compiled.has(source)) compiled.set(source, new RegExp(source));
  return compiled.get(source);
};

/** Does one file hold a use the detect describes? Any key matching is a use. */
function fileMatches(detect, file) {
  const code = file.kind === 'code';
  if (code && detect.imports) {
    const found = namedImports(file.text);
    const hit = detect.imports.some((want) =>
      found.some((f) => f.from === want.from && want.names.includes(f.name)),
    );
    if (hit) return true;
    if (detect.imports.some((want) => usesNamespaceMember(file, want.from, want.names))) {
      return true;
    }
  }
  if (code && detect.jsx?.some((tag) => usesJsx(file, tag))) return true;
  if (detect.bareImports) {
    const specs = specifiers(file);
    const hit = detect.bareImports.some((pkg) =>
      specs.some((s) => s === pkg || s.startsWith(`${pkg}/`)),
    );
    if (hit) return true;
  }
  if (
    detect.cssVars?.some((v) => new RegExp(`var\\(\\s*${escapeRe(v)}(?![\\w-])`).test(file.text))
  ) {
    return true;
  }
  if (
    detect.cssVarWrites?.some((v) =>
      new RegExp(`(?<![\\w-])${escapeRe(v)}['"]?\\s*:`).test(file.text),
    )
  ) {
    return true;
  }
  if (detect.classes?.some((name) => usesClass(file, name))) return true;
  if (detect.regex?.some((source) => regexOf(source).test(file.text))) return true;
  return false;
}

/**
 * The files (relative, sorted) that hold a use `detect` describes.
 * @param {Record<string, any>} detect a ledger step's detect (or done)
 * @param {ReturnType<typeof collectFiles>} files
 * @returns {string[]}
 */
export function matchDetect(detect, files) {
  if (!detect) return [];
  return files
    .filter((file) => fileMatches(detect, file))
    .map((file) => file.rel)
    .sort();
}
