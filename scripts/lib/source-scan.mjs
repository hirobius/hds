/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * source-scan — the one place a check-* / audit-* gate finds its files, tells a
 * spec from source, and reads an exemption marker (hds#643).
 *
 * Twenty-odd gates each carried a private `collectFiles` walker with its own
 * skip-dir set and its own idea of a spec file, and read `// <name>-ok:` markers
 * three different ways (same line, line above, two lines above, reason required
 * or not). The detection logic is what makes a gate a gate; this module owns the
 * rest:
 *
 *   scanSources({ root, gate, roots, exts, skipDirs?, includeSpecs? })
 *     the files to scan, absolute. A missing root throws (see resolveScanRoots).
 *   suppressionFor(marker, { requireReason?, lookback? })
 *     `(lines, index) => boolean`: is the line at `index` exempted?
 *   findMarker(lines, index, marker, lookback)
 *     the nearest `marker:` line and its reason text, for a gate that grades the
 *     reason itself (check-no-uppercase).
 *   maskComments, lineOf
 *     comment blanking that keeps every newline, and a character index to a line.
 *   EXEMPTION_MARKERS
 *     the one vocabulary of markers. check-exemptions validates against it and
 *     suppressionFor refuses a marker that is not in it, so a gate cannot honor a
 *     marker the exemption gate would reject.
 *
 * Usage:
 *   const files = scanSources({
 *     root: ROOT,
 *     gate: 'check-dimensions',
 *     roots: ['src/app'],
 *     exts: ['.ts', '.tsx'],
 *     skipDirs: ['data', 'node_modules', 'dist'],
 *   });
 *   const suppressed = suppressionFor('layout-gap-ok');        // same line + line above
 *   if (suppressed(lines, lineIdx)) continue;
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitResult, hasJsonFlag } from './gate-output.mjs';

// ── Scan roots ───────────────────────────────────────────────────────────────

/**
 * Resolve scan roots to absolute paths, failing on anything missing.
 *
 * A gate whose scan root was removed reports the same thing for "scanned and
 * found nothing" and "there was nothing to scan". A missing root throws; a root
 * that is legitimately conditional says `{ path, optional: true }` in code.
 *
 * @param {Array<string | {path: string, optional?: boolean}>} roots
 * @param {{root: string, gate: string}} options  repo root, and the gate name for errors
 * @returns {string[]} absolute paths, in the order given
 */
export function resolveScanRoots(roots, { root, gate }) {
  if (!Array.isArray(roots) || roots.length === 0) {
    throw new Error(
      `${gate}: no scan roots configured. A gate that scans nothing cannot report success.`,
    );
  }

  const resolved = [];
  const missing = [];

  for (const entry of roots) {
    const spec = typeof entry === 'string' ? { path: entry, optional: false } : entry;
    const abs = path.resolve(root, spec.path);

    if (!existsSync(abs)) {
      if (!spec.optional) missing.push(spec.path);
      continue;
    }
    if (!statSync(abs).isDirectory()) {
      throw new Error(`${gate}: scan root '${spec.path}' is not a directory.`);
    }
    resolved.push(abs);
  }

  if (missing.length > 0) {
    throw new Error(
      `${gate}: ${missing.length} configured scan root(s) do not exist:\n` +
        missing.map((m) => `  ${m}`).join('\n') +
        `\n\nThe gate would scan less than it claims and still report success. Remove the root, ` +
        `repoint it, or mark it { optional: true } if its absence is genuinely expected.`,
    );
  }

  if (resolved.length === 0) {
    throw new Error(
      `${gate}: every configured scan root resolved to nothing, so this run would be vacuous.`,
    );
  }

  return resolved;
}

// ── Spec files ───────────────────────────────────────────────────────────────

/**
 * Is this path a spec file rather than shipped source?
 *
 * Gates that walk `src/**` for `.ts`/`.tsx` pick up the 64 spec files living
 * beside the components, and a spec's job is to write down exactly the literal
 * its subject produces. Three gates independently reported those literals as
 * violations before anyone noticed the shape:
 *
 *   - audit-component-integrity --tokens flagged
 *     `resolveSx({ width: 100 })` → `width:100px` as a raw pixel
 *   - check-dimensions read the CSS string
 *     `'@media (min-width:640px){.cls{padding:var(--primitive-space-2)}}'`
 *     as a width set from a spacing token
 *   - check-link-integrity --route-links called the fixture hrefs
 *     `/a`, `/b`, `/x` and `/start` invalid routes
 *
 * None of them is a defect: nothing in a spec reaches a consumer's bundle, so
 * a token-tier, dimension or routing rule has no subject there. Each had been
 * patched separately; this exists so the fourth gate does not have to be.
 *
 * A gate that genuinely needs to police specs (import hygiene, banned
 * globals) should simply not call this.
 *
 * @param {string} pathLike - a file path or bare filename
 * @returns {boolean}
 */
export function isSpecFile(pathLike) {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(String(pathLike));
}

const DEFAULT_SKIP_DIRS = ['node_modules', '.git', 'dist'];

/**
 * The files a gate should scan.
 *
 * Roots are walked depth-first in directory order. A directory named in
 * `skipDirs` is not entered, at any depth. Spec files are left out unless
 * `includeSpecs` is true (see isSpecFile): a gate that polices specs says so.
 *
 * @param {object} options
 * @param {string} options.root   repo root the `roots` resolve against
 * @param {string} options.gate   the gate's name, for error messages
 * @param {Array<string | {path: string, optional?: boolean}>} options.roots
 * @param {Iterable<string>} options.exts  extensions to keep, with the dot
 * @param {Iterable<string>} [options.skipDirs]  replaces the default
 *   (node_modules, .git, dist) rather than adding to it
 * @param {boolean} [options.includeSpecs=false]
 * @returns {string[]} absolute file paths
 */
export function scanSources({ root, gate, roots, exts, skipDirs, includeSpecs = false }) {
  const keep = new Set(exts);
  const skip = new Set(skipDirs ?? DEFAULT_SKIP_DIRS);
  const results = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (!skip.has(entry)) walk(full);
      } else if (keep.has(path.extname(entry)) && (includeSpecs || !isSpecFile(entry))) {
        results.push(full);
      }
    }
  };

  for (const dir of resolveScanRoots(roots, { root, gate })) walk(dir);
  return results;
}

// ── Exemption markers ────────────────────────────────────────────────────────

/**
 * Every `// <name>-ok: <reason>` marker a gate may honor. check-exemptions
 * rejects any other `*-ok:` token, and suppressionFor refuses to build a reader
 * for one that is missing here.
 */
export const EXEMPTION_MARKERS = [
  'audit-ok',
  'tier-ok',
  'spacing-ok',
  'font-ok',
  'css-ok',
  'tw-ok',
  'inline-ok',
  'security-ok',
  'route-ok',
  'doc-ref-ok',
  'aria-ok',
  'motion-ok',
  'grid-ok',
  'status-clutter-ok',
  // check-layout-discipline honors this and tells users to reach for it; it was
  // once missing here, so the gate that validates markers rejected 7 real uses
  // of a marker another gate documents. Two gates disagreeing about one vocabulary.
  'layout-ok',
  'ref-ok',
  'semantic-ok',
  'breakpoint-ok',
  'color-ok',
  'hds-ok',
  'outline-ok',
  'binding-ok',
  'link-ok',
  'doc-structure-ok',
  'token-path-ok',
  'eyebrow-ok',
  'vocab-ok',
  'deprecation-ok',
  'style-prop-ok',
  // check-spacing-vocabulary.mjs (hds#206)
  'spacing-vocab-ok',
  // check-layout-gap-vocabulary.mjs (hds#404)
  'layout-gap-ok',
  // check-type-ramp.mjs (hds#486)
  'type-ramp-ok',
  // check-no-uppercase.mjs (a reason is required)
  'uppercase-ok',
  // bin/hds-check.mjs shadows rule (hds#664; a reason is required)
  'shadow-ok',
  // src/app/components/__tests__/no-css-var-in-motion-animate.test.ts (hds#372)
  'motion-animate-var-ok',
  // check-no-custom-tracking.mjs (a reason is required)
  'tracking-ok',
];

function assertKnownMarker(marker) {
  const name = marker.replace(/:$/, '');
  if (!EXEMPTION_MARKERS.includes(name)) {
    throw new Error(
      `source-scan: unknown exemption marker '${name}'. Add it to EXEMPTION_MARKERS in ` +
        `scripts/lib/source-scan.mjs so check-exemptions accepts it too.`,
    );
  }
}

/**
 * The nearest line that carries `marker:`, looking at `index` first and then up
 * to `lookback` lines above it.
 *
 * @param {string[]} lines
 * @param {number} index  the line the violation was found on
 * @param {string} marker  e.g. 'uppercase-ok' (without the colon)
 * @param {number} lookback  how many lines above `index` to consider
 * @returns {{line: number, reason: string} | null}  0-based line, and the text after the colon
 */
export function findMarker(lines, index, marker, lookback) {
  assertKnownMarker(marker);
  const needle = `${marker}:`;
  for (let j = index; j >= Math.max(0, index - lookback); j--) {
    const at = (lines[j] ?? '').indexOf(needle);
    if (at !== -1) return { line: j, reason: lines[j].slice(at + needle.length) };
  }
  return null;
}

/**
 * Build the suppression reader for one marker (or several; any one suppresses).
 *
 * A marker written as `'layout-ok:'` (trailing colon) only counts in its colon
 * form. With `requireReason`, the marker must be followed by text.
 *
 * @param {string | string[]} marker
 * @param {{requireReason?: boolean, lookback?: number}} [options]
 *   lookback: lines above the offending line that may carry the marker (default 1)
 * @returns {(lines: string[], index: number) => boolean}
 */
export function suppressionFor(marker, { requireReason = false, lookback = 1 } = {}) {
  const markers = Array.isArray(marker) ? marker : [marker];
  markers.forEach(assertKnownMarker);

  const matches = (line) =>
    markers.some((m) => {
      if (!requireReason) return line.includes(m);
      const name = m.replace(/:$/, '');
      const at = line.indexOf(`${name}:`);
      return at !== -1 && /\S/.test(line.slice(at + name.length + 1));
    });

  return (lines, index) => {
    for (let j = index; j >= Math.max(0, index - lookback); j--) {
      if (matches(lines[j] ?? '')) return true;
    }
    return false;
  };
}

// ── Text helpers ─────────────────────────────────────────────────────────────

/**
 * Blank comments, keeping every newline, so prose never reads as code and a
 * match's line number is unchanged. A `//` only opens a comment at the start of
 * a line or after one of `leadChars`, so `http://` survives.
 *
 * @param {string} text
 * @param {{leadChars?: string}} [options]  characters that may precede a `//`
 *   comment (default space and tab)
 */
// One copy, shipped with the consumer `hds-check` CLI (hds#664).
export { maskComments } from '../../bin/lib/visual-rules.mjs';

/** 1-based line number of a character index in `text`. */
export function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/**
 * A ratchet baseline file as a set of entries (hds#1010): trimmed lines, blank
 * and `#` comment lines dropped. A missing or unreadable file is an empty set.
 *
 * @param {string} file  absolute path
 * @returns {Set<string>}
 */
export function readBaselineSet(file) {
  try {
    const text = readFileSync(file, 'utf8');
    return new Set(
      text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#')),
    );
  } catch {
    return new Set();
  }
}

/**
 * Whether a gate runs in fixture mode (`--fixture-mode` or HDS_FIXTURE_MODE=1).
 *
 * @param {readonly string[]} argv
 * @param {Record<string, string|undefined>} [env]
 * @returns {boolean}
 */
export function isFixtureRun(argv, env = process.env) {
  return argv.includes('--fixture-mode') || env.HDS_FIXTURE_MODE === '1';
}

/**
 * The shared preamble of line-scoped gates (hds#1010): the repo root (the
 * parent of the calling script's directory), `--json`, fixture mode and the
 * fixture file. Call as `gateContext(import.meta.url)`.
 */
export function gateContext(importMetaUrl, argv = process.argv, env = process.env) {
  return {
    ROOT: path.join(path.dirname(fileURLToPath(importMetaUrl)), '..'),
    jsonMode: hasJsonFlag(argv),
    isFixtureMode: isFixtureRun(argv, env),
    fixtureFile: env.FIXTURE_FILE,
  };
}

/**
 * Shared report for line-scoped gates whose violations are
 * `{ file, line, rule, message, sample }` (hds#1010; gate-output.mjs is ops-canonical, so it lives here). Prints the JSON payload
 * or the human report and returns the exit code; the caller exits.
 *
 * Human shape: `[ok] <gate>: <ok>` when clean, else
 * `\n✗ <gate>: <n> <noun(n)>\n`, then `  file:line  [rule] message` and
 * `    sample` per violation, then each `fix` line on stderr. A file-level
 * violation (no `line`, no `sample`, e.g. a token-file check) prints `  file  [rule] message`.
 * A violation's optional `extra` object is spread into its JSON entry between
 * `message` and `sample` (check-hardcoded-spacing keeps its `prop`/`value`).
 *
 * @param {Array<{file:string,line?:number|null,rule:string,message:string,sample?:string,extra?:object}>} violations
 * @param {boolean} jsonMode
 * @param {{ gate: string, ok: string, noun: (n: number) => string, fix: string[] }} opts
 * @returns {0|1}
 */
export function reportLineViolations(violations, jsonMode, { gate, ok, noun, fix }) {
  const code = violations.length === 0 ? 0 : 1;
  if (jsonMode) {
    emitResult(
      {
        violations: violations.map((v) => ({
          file: v.file,
          line: v.line,
          rule: v.rule,
          severity: 'error',
          message: v.message,
          ...v.extra,
          sample: v.sample,
        })),
        summary: { total: violations.length },
        ok: code === 0,
      },
      true,
    );
    return code;
  }
  if (code === 0) {
    console.log(`[ok] ${gate}: ${ok}`);
    return 0;
  }
  console.error(`\n✗ ${gate}: ${violations.length} ${noun(violations.length)}\n`);
  for (const v of violations) {
    console.error(`  ${v.file}${v.line ? `:${v.line}` : ''}  [${v.rule}] ${v.message}`);
    if (v.sample) console.error(`    ${v.sample}`);
  }
  for (const line of fix) console.error(line);
  return 1;
}

/**
 * Emit a gate's violations as-is in the standard JSON payload
 * (`{ violations, summary: { total }, ok }`) and return the exit code; the
 * caller exits. For gates whose violations carry their own severity and
 * extra fields (check-style-discipline, check-typography-discipline; hds#1010).
 *
 * @param {object[]} violations
 * @returns {0|1}
 */
export function emitViolationsJson(violations) {
  const ok = violations.length === 0;
  emitResult({ violations, summary: { total: violations.length }, ok }, true);
  return ok ? 0 : 1;
}

/**
 * Group violations by `rule`, keeping first-seen rule order (hds#1010).
 *
 * @template {{ rule: string }} V
 * @param {V[]} violations
 * @returns {Map<string, V[]>}
 */
export function groupByRule(violations) {
  const byRule = new Map();
  for (const v of violations) {
    if (!byRule.has(v.rule)) byRule.set(v.rule, []);
    byRule.get(v.rule).push(v);
  }
  return byRule;
}

/**
 * The files a line-scoped gate reads (hds#1010): the fixture file alone in
 * fixture mode, else `scanSources` over `ctx.ROOT` with `opts`. An optional
 * `keep(absPath)` drops scanned files (allowlists, skipped basenames); it is
 * not applied to the fixture file.
 *
 * @param {{ ROOT: string, isFixtureMode: boolean, fixtureFile?: string }} ctx
 * @param {Omit<Parameters<typeof scanSources>[0], 'root'> & { keep?: (file: string) => boolean }} opts
 * @returns {string[]}
 */
export function gateFiles(ctx, { keep, ...opts }) {
  if (ctx.isFixtureMode && ctx.fixtureFile) return [path.resolve(ctx.fixtureFile)];
  const files = scanSources({ root: ctx.ROOT, ...opts });
  return keep ? files.filter(keep) : files;
}

/**
 * A scanned file's repo-relative posix path and its lines (hds#1010).
 *
 * @param {string} root
 * @param {string} file  absolute path
 * @returns {{ rel: string, lines: string[] }}
 */
export function fileLines(root, file) {
  return {
    rel: path.relative(root, file).replace(/\\/g, '/'),
    lines: readFileSync(file, 'utf-8').split('\n'),
  };
}

/** Whether a source line is a `//` or block-comment `*` line (hds#1010). */
export function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*');
}
