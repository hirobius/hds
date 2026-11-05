#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-pack-scan — scan the real npm tarball for secrets, PII and stray files
 * before a release (ops#27).
 *
 * Why: 0.12 and 0.13 shipped client PII to npm and had to be redacted. The
 * pre-push scan only reads the commits a push adds, and check-pack-contents
 * only reads file names. This reads every byte that would ship:
 *
 *   1. `pnpm pack` into a temp dir, then unpack the tarball there.
 *   2. Allowlist: every file must sit under an entry of package.json "files"
 *      (or be a file npm always adds: package.json, README, LICENSE, NOTICE),
 *      and no path may hold a `.status`, `.env*`, fixtures or tests segment,
 *      even inside an allowed directory.
 *   3. Secrets: gitleaks `dir` with the repo's .gitleaks.toml over the unpacked
 *      package. It runs from inside the package so `dist/...` paths stay
 *      relative and the config's `/dist/` path allowlist (meant for build
 *      output in the repo) does not skip the bundle. gitleaks missing FAILS,
 *      except in CI, where it installs a pinned one (install-gitleaks.sh).
 *   4. PII: every file through the pre-push scanner's rules
 *      (scripts/hooks/secret-pii-scan.mjs: emails, US phones, SSNs), plus the
 *      links to Google Docs/Drive files, plus the ops#27 client identifiers.
 *      Those are kept here only as SHA-256 hashes, because a list of client
 *      names in a public package would be the leak.
 *      More terms (contact names): a file outside the repo, one term per line,
 *      named by HDS_PII_DENYLIST.
 *
 * Output names the rule, file and match length, never the value.
 *
 * Usage: node scripts/check-pack-scan.mjs [--cwd <package dir>]
 * Needs dist/ (run `pnpm build:lib` first). release-local runs it after the build.
 * Exit: 0 clean · 1 any hit, a stray file, or a scan that could not run.
 */

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPii } from './hooks/secret-pii-scan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Files npm puts in every tarball whatever "files" says. */
const ALWAYS = /^(?:package\.json|(?:readme|license|licence|notice)(?:\.[^/]*)?)$/i;

/** Path segments that never ship, even inside an allowed directory. */
const FORBIDDEN_SEGMENT =
  /^(?:\.status|\.env.*|fixtures?|__fixtures__|__tests__|__mocks__|tests?|\.git)$/i;
const FORBIDDEN_NAME = /\.(?:test|spec)\.[cm]?[jt]sx?$/i;

/**
 * SHA-256 of the ops#27 client identifiers (workspace slugs). Matched against
 * slug-shaped runs in each file, case-insensitive.
 */
export const CLIENT_NEEDLE_HASHES = [
  '779c0f0d96b0df85dd672676845a1c3aa5634223e652e8fab6677d879ecdb8b0',
  '71ab4cb70900bce74c0263b1965413b389b4c9f4bf982e5fde3a8ef863378ae6',
  '4e0a3b5714547a561169b42bc928ebb0bde95bd3f020f7629f144749d5de1a75',
];

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

/**
 * Files in the tarball that "files" does not allow, or that carry a forbidden segment.
 * @param {string[]} files paths relative to the package root, `/`-separated
 * @param {string[]} allowed package.json "files"
 * @returns {{ file: string, reason: string }[]}
 */
export function strayFiles(files, allowed) {
  const entries = allowed.map((e) => e.replace(/^\.\//, '').replace(/\/+$/, ''));
  const out = [];
  for (const f of files) {
    const segs = f.split('/');
    const bad = segs.find((s) => FORBIDDEN_SEGMENT.test(s));
    if (bad) out.push({ file: f, reason: `forbidden path segment "${bad}"` });
    else if (FORBIDDEN_NAME.test(f)) out.push({ file: f, reason: 'test file' });
    else if (!ALWAYS.test(f) && !entries.some((e) => f === e || f.startsWith(`${e}/`))) {
      out.push({ file: f, reason: 'not in package.json "files"' });
    }
  }
  return out;
}

/**
 * Client identifiers in text, matched by hash (ops#27) or by plain term.
 * A slug-shaped run like `foo-bar-baz` is checked whole and in every
 * contiguous part, so a needle inside a longer slug still matches.
 * @returns {{ rule: string, length: number }[]}
 */
export function findClientTerms(text, { hashes = CLIENT_NEEDLE_HASHES, terms = [] } = {}) {
  const found = [];
  const want = new Set(hashes);
  const lower = String(text).toLowerCase();
  if (want.size) {
    for (const run of lower.match(/[a-z0-9]+(?:[-_ ][a-z0-9]+)+/g) ?? []) {
      const parts = run.split(/[-_ ]/);
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 2; j <= Math.min(parts.length, i + 4); j++) {
          const slice = parts.slice(i, j);
          for (const sep of ['-', '_', ' ']) {
            if (want.has(sha256(slice.join(sep)))) {
              found.push({ rule: 'client-id', length: slice.join(sep).length });
            }
          }
        }
      }
    }
  }
  for (const t of terms.map((x) => x.trim().toLowerCase()).filter((x) => x.length >= 3)) {
    const re = new RegExp(
      `(?<![a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`,
      'g',
    );
    for (const m of lower.matchAll(re)) found.push({ rule: 'denylist', length: m[0].length });
  }
  return found;
}

/** Links to private Google Docs/Drive/Sheets/Slides files: client working docs, never shipped. */
const GOOGLE_DOC = /https?:\/\/(?:docs|drive|sheets|slides)\.google\.com\/[^\s"'<>)]+/gi;

/** Google Docs links in text. @returns {{ rule: string, length: number }[]} */
export function findGoogleDocs(text) {
  return [...String(text).matchAll(GOOGLE_DOC)].map((m) => ({
    rule: 'google-doc',
    length: m[0].length,
  }));
}

/** Every PII hit in one file's text. */
export function scanFileText(text, file, opts = {}) {
  return [
    ...findPii(text, { plain: true, label: file }),
    ...findGoogleDocs(text).map((f) => ({ ...f, file })),
    ...findClientTerms(text, opts).map((f) => ({ ...f, file })),
  ];
}

function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

/** Run a command; throw with its stderr when it fails. */
function must(cmd, args, opts, what) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0) throw new Error(`${what} failed: ${`${r.stderr}${r.stdout}`.trim()}`);
  return r.stdout;
}

/** `pnpm pack` the package at cwd and unpack it; returns the unpacked package root. */
export function packAndUnpack(cwd, tmp) {
  const dest = path.join(tmp, 'tarball');
  const out = path.join(tmp, 'unpacked');
  mkdirSync(dest, { recursive: true });
  mkdirSync(out);
  must('pnpm', ['pack', '--pack-destination', dest], { cwd }, 'pnpm pack');
  const tgz = readdirSync(dest).find((f) => f.endsWith('.tgz'));
  if (!tgz) throw new Error('pnpm pack wrote no .tgz');
  must('tar', ['-xzf', path.join(dest, tgz), '-C', out], {}, `unpacking ${tgz}`);
  return { tarball: tgz, root: path.join(out, 'package') };
}

const defaultRuns = (bin) => spawnSync(bin, ['version'], { stdio: 'ignore' }).status === 0;
const defaultInstall = () =>
  spawnSync('bash', [path.join(ROOT, 'scripts', 'install-gitleaks.sh')], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

/**
 * The gitleaks binary: GITLEAKS_BIN, else `gitleaks` on PATH, else in CI a
 * pinned, checksum-verified download (scripts/install-gitleaks.sh), so the
 * release workflow's `pnpm release` scans without a workflow step. Off CI a
 * missing binary returns null and the scan fails closed.
 */
export function findGitleaks({
  env = process.env,
  runs = defaultRuns,
  install = defaultInstall,
} = {}) {
  if (env.GITLEAKS_BIN) return runs(env.GITLEAKS_BIN) ? env.GITLEAKS_BIN : null;
  if (runs('gitleaks')) return 'gitleaks';
  if (!env.CI) return null;
  const r = install();
  const bin = String(r.stdout).trim().split('\n').pop();
  return r.status === 0 && runs(bin) ? bin : null;
}

/**
 * gitleaks over the unpacked package. Exit 0 is clean, exit 1 with a report
 * is findings, anything else (a crash, a bad config) fails the scan.
 * @returns {{ ok: boolean, list?: string[], error?: string }}
 */
export function gitleaksDir(pkgRoot, config, bin = findGitleaks()) {
  if (!bin) return { ok: false, error: 'gitleaks is not installed (brew install gitleaks)' };
  const report = path.join(path.dirname(pkgRoot), 'gitleaks.json');
  const args = ['dir', '.', '--redact', '--no-banner', '--exit-code', '1'];
  args.push('--report-format', 'json', '--report-path', report, '--config', config);
  const r = spawnSync(bin, args, { cwd: pkgRoot, encoding: 'utf8' });
  if (r.status === 0) return { ok: true };
  const list = existsSync(report)
    ? JSON.parse(readFileSync(report, 'utf8')).map((f) => `${f.RuleID} in ${f.File}`)
    : [];
  if (r.status === 1 && list.length) return { ok: false, list };
  const why = `${r.stderr}`.trim().split('\n').pop();
  return { ok: false, error: `gitleaks exited ${r.status}: ${why}` };
}

/**
 * Pack and scan the package at cwd.
 * @returns {{ tarball: string, files: number, stray: object[], secrets: object, pii: object[] }}
 */
export function scanPackage(cwd, { config, hashes, terms, allowed, bin } = {}) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'hds-pack-scan-'));
  try {
    const { tarball, root } = packAndUnpack(cwd, tmp);
    const files = walk(root);
    const allow =
      allowed ?? JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).files;
    const stray = strayFiles(files, allow ?? []);
    const secrets = gitleaksDir(root, config ?? path.join(ROOT, '.gitleaks.toml'), bin);
    const pii = files.flatMap((f) =>
      scanFileText(readFileSync(path.join(root, f), 'utf8'), f, { hashes, terms }),
    );
    return { tarball, files: files.length, stray, secrets, pii };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Lines to print, and whether the release may go on. */
export function report(r) {
  const lines = [
    ...r.stray.map((s) => `FAIL stray file ${s.file} (${s.reason})`),
    ...(r.secrets.error ? [`FAIL secret scan did not run: ${r.secrets.error}`] : []),
    ...(r.secrets.list ?? []).map((s) => `FAIL secret ${s}`),
    ...r.pii.map((p) => `FAIL ${p.rule} in ${p.file} (${p.length} chars)`),
  ];
  const ok = lines.length === 0;
  lines.push(
    ok
      ? `check-pack-scan: ${r.tarball} clean (${r.files} files: allowlist, gitleaks, PII)`
      : `check-pack-scan: ${r.tarball} BLOCKED, ${lines.length} problem(s). Nothing may be published.`,
  );
  return { ok, lines };
}

/** Denylist terms: one per line; blank lines and `#` comments skipped. */
export function parseDenylist(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

/** The CLI. @returns {number} exit code */
export function main(
  argv,
  { env = process.env, scan = scanPackage, log = console.log, error = console.error } = {},
) {
  const i = argv.indexOf('--cwd');
  const cwd = i === -1 ? ROOT : path.resolve(argv[i + 1]);
  const terms = env.HDS_PII_DENYLIST
    ? parseDenylist(readFileSync(env.HDS_PII_DENYLIST, 'utf8'))
    : [];
  try {
    const { ok, lines } = report(scan(cwd, { terms }));
    for (const l of lines) (ok ? log : error)(l);
    return ok ? 0 : 1;
  } catch (e) {
    error(`check-pack-scan: ${e.message}`);
    return 1;
  }
}

// Stryker disable next-line all: the CLI entry guard; main() is tested directly.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
