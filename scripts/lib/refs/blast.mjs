/** @internal — helpers for the design-refs pipeline (eval/refs/README.md). */
/**
 * Blast radius of a token change: which tokens alias it and which source files
 * read it, directly or through an alias. Adding a token touches nothing that
 * exists; changing one touches everything listed here, and that list is what
 * the proposal's visual diff of existing pages must cover.
 *
 * `cssVarFor` and `aliasesOf` are pure; `findUsages` reads src/.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/** `primitive.space.32` -> `--primitive-space-32` (scripts/build-hds-tokens.mjs keeps case). */
export const cssVarFor = (tokenPath) => `--${tokenPath.split('.').join('-')}`;

/** Every token path whose value is an alias of `tokenPath` ("{primitive.space.32}"), transitively. */
export function aliasesOf(tokens, tokenPath) {
  const refs = new Map();
  const walk = (node, at) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.$value === 'string') {
      const m = /^\{([^}]+)\}$/.exec(node.$value);
      if (m) {
        if (!refs.has(m[1])) refs.set(m[1], []);
        refs.get(m[1]).push(at.join('.'));
      }
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, [...at, k]);
  };
  walk(tokens, []);
  const out = [];
  const queue = [tokenPath];
  const seen = new Set(queue);
  while (queue.length) {
    for (const alias of refs.get(queue.shift()) ?? []) {
      if (seen.has(alias)) continue;
      seen.add(alias);
      out.push(alias);
      queue.push(alias);
    }
  }
  return out.sort();
}

/** Whether a token path exists in the token file. */
export function tokenExists(tokens, tokenPath) {
  let node = tokens;
  for (const part of tokenPath.split('.')) {
    if (!node || typeof node !== 'object' || !(part in node)) return false;
    node = node[part];
  }
  return Boolean(node && typeof node === 'object' && '$value' in node);
}

const SOURCE = /\.(?:tsx?|mdx|css)$/;
/** The library and the docs site: the pages a token change can move inside this repo. */
const SCAN_DIRS = ['src', 'docs-site/app', 'docs-site/components'];
const SKIP =
  /(?:^|\/)(?:__tests__|node_modules|\.next)(?:\/|$)|\.test\.|\.figma\.ts$|tokens\.generated\.css$|generated-token/;

function walkSources(dir, root, out) {
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (SKIP.test(rel)) continue;
    if (statSync(full).isDirectory()) walkSources(full, root, out);
    else if (SOURCE.test(name)) out.push(rel);
  }
}

/**
 * Files in the library and the docs site that read the token or any alias of
 * it, by CSS variable. Consumers (ops, job-hunt) are outside this repo; the
 * proposal's visual diff covers them through the rendered refs.
 * @returns {{ token:string, exists:boolean, aliases:string[], files:{file:string, vars:string[]}[], components:string[] }}
 */
export function findUsages(root, tokens, tokenPath) {
  const exists = tokenExists(tokens, tokenPath);
  const aliases = exists ? aliasesOf(tokens, tokenPath) : [];
  const vars = [tokenPath, ...aliases].map(cssVarFor);
  const files = [];
  const all = [];
  for (const dir of SCAN_DIRS) {
    if (existsSync(path.join(root, dir))) walkSources(path.join(root, dir), root, all);
  }
  for (const rel of all) {
    const text = readFileSync(path.join(root, rel), 'utf8');
    // a var name followed by a character that cannot continue it (so -space-3 is not -space-32)
    const hit = vars.filter((v) =>
      new RegExp(`${v.replace(/[-]/g, '\\-')}(?![A-Za-z0-9-])`).test(text),
    );
    if (hit.length) files.push({ file: rel, vars: hit });
  }
  const components = [
    ...new Set(
      files.map((f) => /^src\/app\/components\/([^/]+?)\.tsx$/.exec(f.file)?.[1]).filter(Boolean),
    ),
  ].sort();
  return { token: tokenPath, exists, aliases, files, components };
}
