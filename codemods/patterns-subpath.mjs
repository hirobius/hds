#!/usr/bin/env node
/**
 * patterns-subpath codemod (hds#316, follows hds#254)
 *
 * Rewrites `import { Page } from '@hirobius/design-system'` to
 * `import { Page } from '@hirobius/design-system/patterns'` for every
 * pattern-tier component whose root re-export is deprecated. Other named
 * imports stay on the root. Aliases, `type` modifiers and multi-line layout
 * are preserved; an existing `/patterns` import of the same kind is extended
 * instead of duplicated.
 *
 *   node codemods/patterns-subpath.mjs [--root <dir>] [--check] [--dry-run]
 *
 *   --root <dir>  directory to scan (default: current directory)
 *   --check       write nothing; exit 1 when a rewrite is needed
 *   --dry-run     write nothing; print what would change, exit 0
 *
 * The name list is codemods/patterns-subpath.names.json, generated from
 * src/index.ts by `pnpm codemod:names`.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_PKG = '@hirobius/design-system';
const SUBPATH = `${ROOT_PKG}/patterns`;
const HERE = dirname(fileURLToPath(import.meta.url));
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

export function loadPatternNames() {
  const { names } = JSON.parse(readFileSync(join(HERE, 'patterns-subpath.names.json'), 'utf8'));
  return new Set(names);
}

const importRe = (pkg) =>
  new RegExp(
    `^import(\\s+type)?\\s*\\{([^}]*)\\}\\s*from\\s*(['"])${pkg.replace(/[/@]/g, '\\$&')}\\3(;?)`,
    'gm',
  );

const specName = (spec) =>
  spec
    .replace(/^type\s+/, '')
    .split(/\s+as\s+/)[0]
    .trim();
const splitSpecs = (body) =>
  body
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Pure transform of one file's source.
 * @returns {{ source: string, changed: boolean, sites: number, moved: string[] }}
 */
export function transformSource(source, names) {
  const moved = [];
  let sites = 0;
  // Moved specifiers grouped by kind, so an existing /patterns import can absorb them.
  const pending = { value: [], type: [] };
  const kindOf = (isType) => (isType ? 'type' : 'value');

  let out = source.replace(importRe(ROOT_PKG), (match, typeKw, body, quote, semi) => {
    const specs = splitSpecs(body);
    const go = specs.filter((s) => names.has(specName(s)));
    if (go.length === 0) return match;
    sites++;
    moved.push(...go.map(specName));
    const keep = specs.filter((s) => !go.includes(s));
    const multiline = body.includes('\n');
    const fmt = (list, pkg) =>
      multiline
        ? `import${typeKw ? ' type' : ''} {\n${list.map((s) => `  ${s},`).join('\n')}\n} from ${quote}${pkg}${quote}${semi}`
        : `import${typeKw ? ' type' : ''} { ${list.join(', ')} } from ${quote}${pkg}${quote}${semi}`;
    pending[kindOf(typeKw)].push({ list: go, fmt });
    if (keep.length === 0) return fmt(go, SUBPATH) + '\u0000'; // sentinel: filled below
    return fmt(keep, ROOT_PKG) + '\n' + fmt(go, SUBPATH) + '\u0000';
  });

  if (sites === 0) return { source, changed: false, sites: 0, moved: [] };

  // Merge into an existing /patterns import of the same kind: append names to it and
  // remove the freshly generated duplicate line.
  for (const isType of [false, true]) {
    const re = importRe(SUBPATH);
    const existing = [...out.matchAll(re)].filter(
      (m) => !!m[1] === isType && !m[0].includes('\u0000'),
    );
    // Generated lines carry the sentinel right after them, so exclude those by position.
    const real = existing.filter((m) => out[m.index + m[0].length] !== '\u0000');
    if (real.length === 0) continue;
    const target = real[0];
    const generatedRe = new RegExp(
      `\\n?import${isType ? '\\s+type' : ''}\\s*\\{[^}]*\\}\\s*from\\s*(['"])${SUBPATH.replace(/[/@]/g, '\\$&')}\\1;?\\u0000`,
      'g',
    );
    const addNames = [];
    for (const p of pending[kindOf(isType)]) addNames.push(...p.list);
    if (addNames.length === 0) continue;
    const have = splitSpecs(target[2]);
    const merged = [...have, ...addNames.filter((n) => !have.includes(n))];
    const multiline = target[2].includes('\n');
    const line = multiline
      ? `import${target[1] ? ' type' : ''} {\n${merged.map((s) => `  ${s},`).join('\n')}\n} from ${target[3]}${SUBPATH}${target[3]}${target[4]}`
      : `import${target[1] ? ' type' : ''} { ${merged.join(', ')} } from ${target[3]}${SUBPATH}${target[3]}${target[4]}`;
    // Drop generated duplicates: if the whole root import was consumed, the generated line
    // begins the statement (no leading newline to eat).
    out = out.replace(generatedRe, (m) => (m.startsWith('\n') ? '' : '\u0001'));
    out = out.replace(target[0], line);
  }
  out = out.replace(/\u0001\n?/g, '').replace(/\u0000/g, '');
  return { source: out, changed: out !== source, sites, moved };
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

/** Scan a directory. Writes only when `write` is true. */
export function runCodemod({ root, write = false, names = loadPatternNames() }) {
  const files = [];
  const moved = new Set();
  let sites = 0;
  for (const file of walk(root)) {
    const src = readFileSync(file, 'utf8');
    if (!src.includes(ROOT_PKG)) continue;
    const r = transformSource(src, names);
    if (!r.changed) continue;
    files.push({ file: relative(root, file), sites: r.sites, moved: r.moved });
    r.moved.forEach((n) => moved.add(n));
    sites += r.sites;
    if (write) writeFileSync(file, r.source);
  }
  return { files, sites, names: [...moved].sort() };
}

function main(argv) {
  const args = { root: process.cwd(), check: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') args.root = resolve(argv[++i] ?? '');
    else if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else {
      console.error(
        `unknown argument: ${argv[i]}\nusage: patterns-subpath [--root <dir>] [--check] [--dry-run]`,
      );
      return 2;
    }
  }
  const write = !args.check && !args.dryRun;
  const res = runCodemod({ root: args.root, write });
  const summary = `${res.files.length} files, ${res.sites} import sites, ${res.names.length} names (${res.names.join(', ') || 'none'})`;
  if (args.check) {
    if (res.sites > 0) {
      console.error(`patterns-subpath: rewrite needed: ${summary}`);
      for (const f of res.files) console.error(`  ${f.file}: ${f.moved.join(', ')}`);
      return 1;
    }
    console.log('patterns-subpath: nothing to rewrite');
    return 0;
  }
  console.log(`patterns-subpath: ${write ? 'rewrote' : 'would rewrite'} ${summary}`);
  for (const f of res.files) console.log(`  ${f.file}: ${f.moved.join(', ')}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
