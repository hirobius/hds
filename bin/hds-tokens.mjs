#!/usr/bin/env node
/**
 * hds-tokens — look up a token name before you write it (hds#477).
 *
 *   pnpm exec hds-tokens search <query> [--json]
 *
 * <query> is a CSS variable (`--semantic-color-content-tertiary`), a token path
 * (`semantic.color.content.tertiary`) or loose words (`content tertiary`). An
 * exact name prints the token and exits 0; anything else says it is not a
 * token, lists the nearest real names and exits 1, so a guessed name never
 * reaches a stylesheet (ops#443). Exit 2 is a usage error.
 *
 * Reads the hirobius.tokens.json the package ships; never touches the network.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_MATCHES = 5;

/** Every leaf token as { path, cssVar, value, description }. */
function flatten(node, path = [], out = []) {
  if (node && typeof node === 'object' && '$value' in node) {
    const p = path.join('.');
    out.push({
      path: p,
      cssVar: `--${path.join('-')}`,
      value: formatValue(node.$value),
      description: node.$description ?? '',
    });
    return out;
  }
  for (const [key, child] of Object.entries(node ?? {})) {
    if (!key.startsWith('$') && child && typeof child === 'object')
      flatten(child, [...path, key], out);
  }
  return out;
}

function formatValue(v) {
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (v && typeof v === 'object' && 'value' in v && 'unit' in v) return `${v.value}${v.unit}`;
  if (v && typeof v === 'object' && typeof v.hex === 'string') return v.hex;
  return JSON.stringify(v);
}

/** Query words, lowercased: `var(--a-b)`, `a.b` and `a b` all become ['a', 'b']. */
function words(query) {
  return query
    .replace(/^var\(|\)$/g, '')
    .replace(/^--/, '')
    .toLowerCase()
    .split(/[\s.\-_/]+/)
    .filter(Boolean);
}

function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function search(tokens, query) {
  const q = words(query);
  const joined = q.join('.');
  const exact = tokens.find((t) => t.path.toLowerCase() === joined);
  if (exact) return { query, exists: true, matches: [exact] };

  const ranked = tokens
    .map((t) => {
      const segs = t.path.toLowerCase().split('.');
      // A whole-segment hit outranks a substring hit; ties go to the closer spelling.
      const hits = q.reduce(
        (n, w) => n + (segs.includes(w) ? 2 : segs.some((s) => s.includes(w)) ? 1 : 0),
        0,
      );
      return { t, hits, dist: levenshtein(joined, t.path.toLowerCase()) };
    })
    .sort((a, b) => b.hits - a.hits || a.dist - b.dist);
  // When any token shares a word with the query, unrelated spellings are noise.
  const matches = ranked
    .filter((r) => r.hits > 0 || ranked[0].hits === 0)
    .slice(0, MAX_MATCHES)
    .map((r) => r.t);
  return { query, exists: false, matches };
}

function line(t) {
  return `  ${t.cssVar}\n    ${t.path} = ${t.value}${t.description ? `\n    ${t.description}` : ''}`;
}

function main(argv) {
  const json = argv.includes('--json');
  const [cmd, ...rest] = argv.filter((a) => a !== '--json');
  const query = rest.join(' ').trim();
  if (cmd !== 'search' || !query) {
    console.error('usage: hds-tokens search <css-var | token.path | words> [--json]');
    return 2;
  }
  const tokens = flatten(JSON.parse(readFileSync(join(PKG_ROOT, 'hirobius.tokens.json'), 'utf8')));
  const result = search(tokens, query);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.exists) {
    console.log(`"${query}" exists:\n${line(result.matches[0])}`);
  } else {
    console.log(
      `"${query}" is not a token. Nearest real names:\n${result.matches.map(line).join('\n')}`,
    );
  }
  return result.exists ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
