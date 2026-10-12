/** @internal — pure helpers for the design-explorations spec set (hds#628). */
/**
 * A minimal PII check for exploration fixture data, run before anything is
 * published. hds had no PII or denylist tooling (the only denylist under
 * scripts/ is the license one), so this checks three things:
 *
 *   phone     a North American or international number that is not in the
 *             reserved fictional range 555-01xx
 *   email     an address whose domain is not example.com, .org or .net
 *   denylist  a term from a list: every non-demo tenant's slug and name
 *             (a client never reaches a board), plus an optional private file
 *             kept outside the repository, because a list of real names
 *             committed here would be the leak it guards against
 *
 * It looks for the SHAPE of real data, not for real data: a number that
 * happens to be a real subscriber's but has the shape of 555-01xx would pass,
 * and a fictional number outside the range fails. Fixtures use 555-01xx and
 * example.com so neither case arises.
 *
 * Pure except `clientDenylist`, `loadDenylistFile` and `scanPaths`, which read
 * the file system.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// 312-867-5309, (312) 867-5309, +1 312 867 5309, 3128675309. Area code and exchange start 2-9, as in NANP.
const US10 =
  /(?<![\w.+$-])(?:\+?1[\s.-]?)?(?:\(\s*[2-9]\d{2}\s*\)|[2-9]\d{2})[\s.-]?[2-9]\d{2}[\s.-]?\d{4}(?![\w-])/g;
// 867-5309: seven digits need a separator, or every 7-digit count would match.
const US7 = /(?<![\w.+$-])[2-9]\d{2}[\s.-]\d{4}(?![\w-])/g;
// +44 20 7946 0958. +1 is North American and is read by the patterns above.
const INTL = /(?<![\w.])\+(?!1\b)\d{1,3}(?:[\s.-]?\(?\d{2,4}\)?){2,5}(?!\d)/g;
const EMAIL = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@((?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})(?![\w-])/g;

/** RFC 2606 reserved domains: nothing at these can be a real mailbox. */
const SAFE_DOMAINS = ['example.com', 'example.org', 'example.net'];

const digitsOf = (s) => s.replace(/\D/g, '');

/** 555-01xx in any layout, with or without an area code and country code. */
function isFictionalPhone(match) {
  let d = digitsOf(match);
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  if (d.length === 10) return d.slice(3, 6) === '555' && d.slice(6, 8) === '01';
  if (d.length === 7) return d.slice(0, 3) === '555' && d.slice(3, 5) === '01';
  return false;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function denylistPatterns(terms) {
  return terms
    .map((t) => String(t).trim())
    .filter((t) => t.length >= 3)
    .map((t) => new RegExp(`(?<![A-Za-z0-9])${escapeRe(t)}(?![A-Za-z0-9])`, 'gi'));
}

/**
 * @param {string} text
 * @param {{ file?:string, denylist?:string[] }} [opts]
 * @returns {{ file:string, line:number, kind:'phone'|'email'|'denylist', match:string }[]}
 */
export function scanText(text, { file = '', denylist = [] } = {}) {
  const findings = [];
  const patterns = denylistPatterns(denylist);
  String(text)
    .split('\n')
    .forEach((rawLine, i) => {
      const line = i + 1;
      const add = (kind, match) => findings.push({ file, line, kind, match });
      let rest = rawLine;
      const mask = (m) => {
        rest = `${rest.slice(0, m.index)}${' '.repeat(m[0].length)}${rest.slice(m.index + m[0].length)}`;
      };
      for (const re of [US10, US7]) {
        // match against the line as masked so far: a number is read once, by the first pattern that fits
        for (const m of [...rest.matchAll(re)]) {
          if (!isFictionalPhone(m[0])) add('phone', m[0]);
          mask(m);
        }
      }
      for (const m of rest.matchAll(INTL)) {
        if (digitsOf(m[0]).length >= 8) add('phone', m[0]);
      }
      for (const m of rawLine.matchAll(EMAIL)) {
        const domain = m[1].toLowerCase();
        const safe = SAFE_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
        if (!safe) add('email', m[0]);
      }
      for (const re of patterns) {
        for (const m of rawLine.matchAll(re)) add('denylist', m[0]);
      }
    });
  return findings;
}

/**
 * The slug and display name of every tenant that is not a demo. A tenant with
 * no `demo: true` is a client until proven otherwise; `_`-prefixed directories
 * (the template) and directories with unreadable metadata are skipped.
 * @param {string} tenantsDir
 * @returns {string[]}
 */
export function clientDenylist(tenantsDir) {
  if (!existsSync(tenantsDir)) return [];
  const terms = [];
  for (const name of readdirSync(tenantsDir).sort()) {
    if (name.startsWith('_')) continue;
    let meta;
    try {
      meta = JSON.parse(readFileSync(path.join(tenantsDir, name, 'metadata.json'), 'utf8'));
    } catch {
      continue;
    }
    if (meta?.demo === true) continue;
    for (const t of [meta?.slug ?? name, meta?.displayName]) if (t) terms.push(t);
  }
  return terms;
}

/** One term per line; blank lines and `#` comments are skipped. */
export function loadDenylistFile(file) {
  if (!existsSync(file)) {
    throw new Error(`denylist file ${file} does not exist; fix the path or drop the option`);
  }
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

const TEXT_FILE = /\.(?:json|md|mdx|txt|[cm]?[jt]sx?|html?|css|svg|csv|ya?ml)$/i;
const MAX_BYTES = 2 * 1024 * 1024;

function walk(entry, out) {
  const s = statSync(entry);
  if (s.isDirectory()) {
    for (const name of readdirSync(entry).sort()) {
      if (name === 'node_modules' || name === '.git') continue;
      const full = path.join(entry, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (TEXT_FILE.test(name) && statSync(full).size <= MAX_BYTES) out.push(full);
    }
  } else out.push(entry);
}

/**
 * Scan files, or the text files under directories. A path that does not exist
 * throws: a check over nothing must not pass.
 * @param {string[]} paths
 * @param {{ denylist?:string[], root?:string }} [opts] `root` makes reported paths relative
 */
export function scanPaths(paths, { denylist = [], root } = {}) {
  const files = [];
  for (const p of paths) {
    if (!existsSync(p)) throw new Error(`${p} does not exist, so it cannot be checked`);
    walk(p, files);
  }
  const findings = [];
  for (const f of files) {
    const shown = root ? path.relative(root, f).split(path.sep).join('/') : f;
    findings.push(...scanText(readFileSync(f, 'utf8'), { file: shown, denylist }));
  }
  return findings;
}
