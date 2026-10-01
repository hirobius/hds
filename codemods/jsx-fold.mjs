/**
 * The engine behind the codemods that fold a removed component into the
 * survivor that renders it (hds#395, hds#389's 2026-10-01 decision update):
 * hds-not-found-pattern (NotFoundPattern -> ErrorPattern) and hds-tile-grid
 * (TileGrid -> Grid). It ships with them as a package bin dependency, so it has
 * no dependencies; codemods/unrewritable.mjs masks the source and lists what a
 * codemod cannot see.
 *
 * A fold rewrites one named import of the package root and every JSX element of
 * the name it binds:
 *   - the import names the survivor: `TileGrid` becomes `Grid`, from the root or
 *     from `/patterns` (the rule says which). An alias stays the file's name
 *     (`TileGrid as Tiles` becomes `Grid as Tiles`), and so does the old name
 *     when the file already binds the survivor's name to something else. A file
 *     that already imports the survivor reuses that import;
 *   - each `<Name …>` gets the attributes the rule writes, and its closing tag
 *     the new name. Every other attribute, comment and line break stays.
 * A file is left as written, and listed for a manual edit, when any use of the
 * name is not a JSX tag (`typeof`, a value, a member tag), when a tag has
 * attributes the rule cannot map (a spread, say), when its tags do not pair up,
 * or when it cannot be read to its end. A re-export, a type-only import, a
 * removed props type, and a namespace or dynamic import that reads the name are
 * listed too. Running a fold twice changes nothing.
 */
import { readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findUnrewritable, maskSource } from './unrewritable.mjs';

export const ROOT_PKG = '@hirobius/design-system';
export const PATTERNS = `${ROOT_PKG}/patterns`;

const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  '.vercel',
  'coverage',
  'storybook-static',
]);
const ID = String.raw`[A-Za-z_$][\w$]*`;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @typedef {{ start: number, end: number, comma: number, name: string, local: string,
 *   aliased: boolean, typeOnly: boolean }} Spec
 *   `start`/`end` bound the specifier without comments; `comma` is the comma after
 *   it, or -1.
 * @typedef {{ from: number, to: number, kw: string, typeKw: boolean, def?: string,
 *   quote: string, semi: string, pkg: string, bodyFrom: number, bodyTo: number,
 *   specs: Spec[] }} Statement
 * @typedef {{ name: string, start: number, end: number, kind: 'string' | 'expr' | 'bare' | 'spread',
 *   quote?: string, value?: string, valueStart?: number, valueEnd?: number }} Attr
 * @typedef {{ at: number, nameEnd: number, end: number, selfClosing: boolean,
 *   attrs: Attr[], line: number }} Tag
 * @typedef {{ start: number, end: number, text: string }} Edit
 * @typedef {{
 *   name: string,
 *   survivor: string,
 *   survivorFrom: string,
 *   types?: Record<string, string>,
 *   rewrite: (tag: Tag, source: string) => { edits: Edit[] } | { manual: string },
 * }} FoldRule
 *   `rewrite` maps one opening tag's attributes; `types` names each removed props
 *   type and what replaces it, for the manual report.
 */

/** Each named import or re-export of `pkg`, read on the masked `code`. */
function statements(source, code, pkg) {
  const re = new RegExp(
    String.raw`(?:^|(?<=;))([ \t]*)(import|export)(\s+type)?\s*(?:(${ID})\s*,\s*)?\{([^}]*)\}\s*from\s*(['"]) {${pkg.length}}\6(;?)`,
    'gm',
  );
  const out = [];
  for (const m of code.matchAll(re)) {
    const to = m.index + m[0].length;
    if (!source.startsWith(pkg, to - m[7].length - pkg.length - 1)) continue;
    const bodyFrom = m.index + m[0].indexOf('{') + 1;
    const bodyTo = bodyFrom + m[5].length;
    out.push({
      from: m.index + m[1].length,
      to,
      kw: m[2],
      typeKw: !!m[3],
      def: m[4],
      quote: m[6],
      semi: m[7],
      pkg,
      bodyFrom,
      bodyTo,
      specs: specsOf(code, bodyFrom, bodyTo),
    });
  }
  return out;
}

const SPEC = new RegExp(String.raw`^(type\s+)?(${ID})(?:\s+as\s+(${ID}))?$`);

function specsOf(code, from, to) {
  const specs = [];
  let seg = from;
  for (let k = from; k <= to; k++) {
    if (k < to && code[k] !== ',') continue;
    const text = code.slice(seg, k);
    const a = text.search(/\S/);
    if (a >= 0) {
      const start = seg + a;
      const end = seg + text.trimEnd().length;
      const m = SPEC.exec(code.slice(start, end).replace(/\s+/g, ' '));
      if (m)
        specs.push({
          start,
          end,
          comma: k < to ? k : -1,
          typeOnly: !!m[1],
          name: m[2],
          local: m[3] ?? m[2],
          aliased: !!m[3],
        });
    }
    seg = k + 1;
  }
  return specs;
}

const lineOf = (source, at) => source.slice(0, at).split('\n').length;
const lineStart = (source, at) => source.lastIndexOf('\n', at - 1) + 1;
const lineEnd = (source, at) => {
  const nl = source.indexOf('\n', at);
  return nl < 0 ? source.length : nl;
};
const indentOf = (source, at) =>
  /^[\t ]*/.exec(source.slice(lineStart(source, at), at).replace(/^﻿/, ''))[0];

/** Every use of the identifier `name` in the masked code; a member access (`a.Name`) is not one. */
function uses(code, name) {
  return [
    ...code.matchAll(new RegExp(String.raw`(?<![\w$])(?<!(?<!\.)\.)${esc(name)}(?![\w$])`, 'g')),
  ].map((m) => m.index);
}

/** The `}` that closes the `{` at `at` in the masked code, or -1. */
function closeBrace(code, at) {
  let depth = 0;
  for (let i = at; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

/** The attributes of the opening tag whose name ends at `from`, up to its `>` or `/>`; null when it does not parse. */
function parseTag(source, code, from) {
  const attrs = [];
  let i = from;
  const skip = () => {
    while (i < code.length && /\s/.test(code[i])) i++;
  };
  for (;;) {
    skip();
    if (i >= code.length) return null;
    if (code[i] === '>') return { attrs, end: i + 1, selfClosing: false };
    if (code.startsWith('/>', i)) return { attrs, end: i + 2, selfClosing: true };
    if (code[i] === '{') {
      const close = closeBrace(code, i);
      if (close < 0) return null;
      attrs.push({ name: '', kind: 'spread', start: i, end: close + 1 });
      i = close + 1;
      continue;
    }
    const m = /^[A-Za-z_$][\w$-]*(?::[\w$-]+)?/.exec(code.slice(i, i + 200));
    if (!m) return null;
    const attr = { name: m[0], start: i, kind: 'bare' };
    i += m[0].length;
    let j = i;
    while (j < code.length && /\s/.test(code[j])) j++;
    if (code[j] === '=') {
      j++;
      while (j < code.length && /\s/.test(code[j])) j++;
      const q = code[j];
      // String text is blank in the masked code, so the next quote closes it.
      const close =
        q === '"' || q === "'" ? code.indexOf(q, j + 1) : q === '{' ? closeBrace(code, j) : -1;
      if (close < 0) return null;
      Object.assign(attr, {
        kind: q === '{' ? 'expr' : 'string',
        quote: q === '{' ? undefined : q,
        value: source.slice(j + 1, close),
        valueStart: j,
        valueEnd: close + 1,
      });
      i = close + 1;
    }
    attr.end = i;
    attrs.push(attr);
  }
}

/** Deletes a whole statement, with its line when nothing else is on it. */
function dropStatement(source, st) {
  const ls = lineStart(source, st.from);
  let end = st.to;
  while (source[end] === ' ' || source[end] === '\t') end++;
  if (
    /^[\t ﻿]*$/.test(source.slice(ls, st.from)) &&
    (source[end] === '\n' || end === source.length)
  )
    return {
      start: ls === 0 && source.startsWith('﻿') ? 1 : ls,
      end: Math.min(end + 1, source.length),
      text: '',
    };
  return { start: st.from, end, text: '' };
}

/** Deletes one specifier and its comma; a line left blank goes too, and so does a statement left empty. */
function dropSpec(source, st, spec) {
  if (st.specs.length === 1) {
    if (!st.def) return dropStatement(source, st);
    return {
      start: st.from,
      end: st.to,
      text: `${st.kw} ${st.def} from ${st.quote}${st.pkg}${st.quote}${st.semi}`,
    };
  }
  let start = spec.start;
  let end = spec.end;
  if (spec.comma >= 0) {
    end = spec.comma + 1;
    while (source[end] === ' ' || source[end] === '\t') end++;
  } else start = st.specs[st.specs.indexOf(spec) - 1].comma;
  const ls = lineStart(source, start);
  const le = lineEnd(source, end);
  if (/^[\t ]*$/.test(source.slice(ls, start)) && /^[\t ]*$/.test(source.slice(end, le)))
    return { start: ls, end: Math.min(le + 1, source.length), text: '' };
  return { start, end, text: '' };
}

/** Adds a specifier to the end of a statement's list, on a line of its own when the list has one per line. */
function addSpec(source, st, text) {
  const last = st.specs[st.specs.length - 1];
  if (!last) return { start: st.bodyFrom, end: st.bodyTo, text: ` ${text} ` };
  if (last.comma < 0) return { start: last.end, end: last.end, text: `, ${text}` };
  const le = lineEnd(source, last.comma);
  if (st.bodyTo > le)
    return { start: le, end: le, text: `\n${indentOf(source, last.start)}${text},` };
  return { start: last.comma + 1, end: last.comma + 1, text: ` ${text},` };
}

/**
 * The lines the edits change, as hunks for `--dry-run`: `line` is 1-based in
 * `source`. Built from the edits, so the cost is linear in the file whatever
 * the distance between the first and the last change. Edits on one line share a
 * hunk; a whole line an edit deletes (its newline included) shows as removed.
 * @param {string} source
 * @param {Edit[]} edits
 */
function editHunks(source, edits) {
  const clusters = [];
  for (const e of [...edits].sort((a, b) => a.start - b.start || a.end - b.end)) {
    const from = lineStart(source, e.start);
    const to = e.end > e.start && source[e.end - 1] === '\n' ? e.end - 1 : lineEnd(source, e.end);
    const last = clusters[clusters.length - 1];
    if (last && from <= last.to) {
      last.to = Math.max(last.to, to);
      last.edits.push(e);
    } else clusters.push({ from, to, edits: [e] });
  }
  return clusters.map(({ from, to, edits: group }) => {
    let text = source.slice(from, to);
    for (const e of group.sort((a, b) => b.start - a.start || b.end - a.end))
      text = text.slice(0, e.start - from) + e.text + text.slice(Math.min(e.end, to) - from);
    const wholeLines = group.every((e) => e.end > to);
    return {
      line: lineOf(source, from),
      before: source.slice(from, to).split('\n'),
      after: wholeLines && text === '' ? [] : text.split('\n'),
    };
  });
}

const unchanged = (source, manual) => ({ source, changed: false, sites: 0, manual, edits: [] });

/**
 * Pure transform of one file's source. Returns the source unchanged, with the
 * reasons in `manual`, when the file holds a use the rule cannot rewrite.
 * @param {string} source
 * @param {FoldRule} rule
 * @returns {{ source: string, changed: boolean, sites: number, manual: string[],
 *   edits: { line: number, before: string[], after: string[] }[] }}
 */
export function foldComponent(source, rule) {
  const { code, unterminated } = maskSource(source);
  const types = rule.types ?? {};
  const manual = findUnrewritable(source, ROOT_PKG, [rule.name, ...Object.keys(types)]);
  const roots = statements(source, code, ROOT_PKG);
  const hits = [];
  for (const st of roots)
    for (const s of st.specs) {
      if (Object.hasOwn(types, s.name))
        manual.push(`${s.name} from '${ROOT_PKG}' (removed in 0.20.0, use ${types[s.name]})`);
      if (s.name !== rule.name) continue;
      if (st.kw === 'export') {
        const where = rule.survivorFrom === ROOT_PKG ? '' : ` from '${rule.survivorFrom}'`;
        manual.push(
          `export { ${s.name} } from '${ROOT_PKG}' (removed in 0.20.0; re-export ${rule.survivor}${where} by hand)`,
        );
      } else if (st.typeKw || s.typeOnly)
        manual.push(
          `import type { ${s.name} } from '${ROOT_PKG}' at line ${lineOf(source, st.from)} (removed in 0.20.0; use typeof ${rule.survivor} by hand)`,
        );
      else hits.push({ st, s });
    }
  if (hits.length === 0 || unterminated) return unchanged(source, manual);
  if (hits.length > 1) {
    manual.push(`${rule.name} is imported ${hits.length} times; rewrite it by hand`);
    return unchanged(source, manual);
  }
  const [{ st, s }] = hits;

  // Every use of the local name must be the import itself or a JSX tag.
  const opens = [];
  let closes = 0;
  const local = s.local;
  const problems = [];
  for (const at of uses(code, local)) {
    if (at >= st.bodyFrom && at < st.bodyTo) continue;
    const nameEnd = at + local.length;
    if (code[at - 1] === '<' && /[\s/>]/.test(code[nameEnd] ?? '')) {
      const tag = parseTag(source, code, nameEnd);
      if (!tag) problems.push(`<${local}> at line ${lineOf(source, at)} could not be read`);
      else opens.push({ at, nameEnd, line: lineOf(source, at), ...tag });
    } else if (
      /<\/\s*$/.test(code.slice(Math.max(0, at - 8), at)) &&
      /^\s*>/.test(code.slice(nameEnd))
    )
      closes++;
    else
      problems.push(`${local} at line ${lineOf(source, at)} is not a JSX tag; rewrite it by hand`);
  }
  if (opens.filter((t) => !t.selfClosing).length !== closes)
    problems.push(`cannot pair every <${local}> with its closing tag; rewrite it by hand`);

  const edits = [];
  for (const tag of opens) {
    const r = rule.rewrite(tag, source);
    if ('manual' in r) problems.push(`<${rule.name}> at line ${tag.line}: ${r.manual}`);
    else edits.push(...r.edits);
  }
  if (problems.length > 0) return unchanged(source, [...manual, ...problems]);

  // The binding: reuse a survivor import, keep the file's name, or take the survivor's.
  const sources = rule.survivorFrom === ROOT_PKG ? [ROOT_PKG] : [ROOT_PKG, rule.survivorFrom];
  const imported = sources
    .flatMap((pkg) => (pkg === ROOT_PKG ? roots : statements(source, code, pkg)))
    .some(
      (x) =>
        x.kw === 'import' &&
        !x.typeKw &&
        x.specs.some((y) => y.name === rule.survivor && !y.aliased && !y.typeOnly),
    );
  const reuse = !s.aliased && imported;
  const keepName = s.aliased || (!reuse && uses(code, rule.survivor).length > 0);
  const name = keepName ? local : rule.survivor;
  const specText = keepName ? `${rule.survivor} as ${local}` : rule.survivor;

  if (reuse) edits.push(dropSpec(source, st, s));
  else if (rule.survivorFrom === ROOT_PKG)
    edits.push({ start: s.start, end: s.end, text: specText });
  else {
    const target = statements(source, code, rule.survivorFrom).find(
      (x) => x.kw === 'import' && !x.typeKw && !x.def,
    );
    const line = `import { ${specText} } from ${st.quote}${rule.survivorFrom}${st.quote}${st.semi}`;
    if (target) edits.push(addSpec(source, target, specText), dropSpec(source, st, s));
    else if (st.specs.length === 1 && !st.def)
      edits.push({ start: st.from, end: st.to, text: line });
    else
      edits.push(dropSpec(source, st, s), {
        start: st.to,
        end: st.to,
        text: `\n${indentOf(source, st.from)}${line}`,
      });
  }
  if (name !== local) {
    for (const tag of opens) edits.push({ start: tag.at, end: tag.nameEnd, text: name });
    for (const m of code.matchAll(new RegExp(String.raw`<\/\s*(${esc(local)})\s*>`, 'g'))) {
      const at = m.index + m[0].indexOf(local, 2);
      edits.push({ start: at, end: at + local.length, text: name });
    }
  }

  let out = source;
  for (const e of edits.sort((x, y) => y.start - x.start || y.end - x.end))
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return {
    source: out,
    changed: out !== source,
    sites: opens.length,
    manual,
    edits: editHunks(source, edits),
  };
}

/**
 * Where to insert attributes in front of `attr`, or after the tag name when
 * `attr` is null: the separator copies the tag's layout (a new line and indent
 * when its attributes sit one per line).
 * @param {string} source
 * @param {Tag} tag
 * @param {Attr | null} attr
 */
export function insertionPoint(source, tag, attr) {
  const first = attr ?? tag.attrs[0];
  if (!first) return { at: tag.nameEnd, sep: ' ' };
  const gap = /\s*$/.exec(source.slice(tag.nameEnd, first.start))[0];
  const sep = gap.includes('\n') ? gap : ' ';
  return attr ? { at: attr.start, sep } : { at: tag.nameEnd, sep };
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (EXTS.has(full.slice(full.lastIndexOf('.')))) yield full;
  }
}

/** Scan a directory with one rule. Writes only when `write` is true. */
export function runFold({ root, write = false, rule }) {
  const files = [];
  const manual = [];
  let sites = 0;
  for (const file of walk(root)) {
    const src = readFileSync(file, 'utf8');
    if (!src.includes(ROOT_PKG)) continue;
    const r = foldComponent(src, rule);
    for (const stmt of r.manual) manual.push({ file: relative(root, file), stmt });
    if (!r.changed) continue;
    files.push({ file: relative(root, file), sites: r.sites, edits: r.edits });
    sites += r.sites;
    if (write) writeFileSync(file, r.source);
  }
  return { files, sites, manual };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The CLI every fold codemod shares:
 *   <bin> [--root <dir>] [--check] [--dry-run]
 * `--check` writes nothing and exits 1 while a rewrite or a manual edit remains;
 * `--dry-run` writes nothing and prints each changed line before (-) and after (+).
 */
export function main(argv, { bin, rule }) {
  const args = { root: process.cwd(), check: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') args.root = resolve(argv[++i] ?? '');
    else if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else {
      console.error(
        `unknown argument: ${argv[i]}\nusage: ${bin} [--root <dir>] [--check] [--dry-run]`,
      );
      return 2;
    }
  }
  const write = !args.check && !args.dryRun;
  const res = runFold({ root: args.root, write, rule });
  const summary = `${plural(res.files.length, 'file')}, ${plural(res.sites, 'site')} (${rule.name} -> ${rule.survivor})`;
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

/**
 * Whether the module at `url` is the script node was started with. Compares real
 * paths: npm/yarn link the bin and pnpm links the package directory, so argv[1]
 * is a symlink while import.meta.url is already resolved.
 */
export function isEntry(url) {
  try {
    return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(url));
  } catch {
    return false;
  }
}
