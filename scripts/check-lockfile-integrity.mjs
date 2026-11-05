#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-lockfile-integrity — every package in the committed pnpm lockfiles
 * comes from the registry with a sha512 integrity hash (hds#1145).
 *
 * Why: `pnpm install --frozen-lockfile` (Vercel, release-local) installs what
 * the lock says. pnpm-workspace.yaml `blockExoticSubdeps` refuses git and
 * tarball sources for transitive deps only; a direct dependency added as a
 * URL, a git ref or a local directory still lands in the lock, and a sha1 (or
 * no) hash lets a changed tarball install without a mismatch. This reads
 * every `packages:` entry and fails on:
 *
 *   NO_LOCKFILE_VERSION  the file has no lockfileVersion line
 *   NO_INTEGRITY         an entry has no resolution integrity
 *   WEAK_INTEGRITY       the integrity is not sha512
 *   EXOTIC_SOURCE        the resolution is a tarball URL, git repo or directory
 *
 * Lockfiles: pnpm-lock.yaml and docs-site/pnpm-lock.yaml (its own install).
 * Read-only, no network, no YAML dependency (the lock format is line-stable).
 *
 * Usage:
 *   node scripts/check-lockfile-integrity.mjs          human output, exit 1 on a hit
 *   node scripts/check-lockfile-integrity.mjs --json   machine output (lib/gate-output.mjs)
 *   --fixture-mode with env FIXTURE_FILE=<path> checks that one file instead.
 *
 * Exit: 0 clean · 1 any violation.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitResult, hasJsonFlag } from './lib/gate-output.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCKFILES = ['pnpm-lock.yaml', 'docs-site/pnpm-lock.yaml'];

/**
 * Violations in one lockfile's text.
 * @param {string} text
 * @param {string} [file]
 * @returns {{file: string, line: number|null, rule: string, severity: 'error', message: string}[]}
 */
export function lockfileViolations(text, file = 'pnpm-lock.yaml') {
  const out = [];
  const lines = text.split('\n');
  const hit = (line, rule, message) => out.push({ file, line, rule, severity: 'error', message });

  if (!lines.some((l) => /^lockfileVersion:\s*\S/.test(l))) {
    hit(null, 'NO_LOCKFILE_VERSION', 'no lockfileVersion line; is this a pnpm lockfile?');
    return out;
  }

  let inPackages = false;
  /** @type {{key: string, line: number, resolution: string|null, inResolution: boolean} | null} */
  let entry = null;
  const close = () => {
    if (!entry) return;
    const { key, line, resolution } = entry;
    if (resolution === null) {
      hit(line, 'NO_INTEGRITY', `${key}: no resolution line`);
    } else if (/\b(tarball|repo|directory|type):/.test(resolution)) {
      hit(line, 'EXOTIC_SOURCE', `${key}: resolves outside the registry (${resolution})`);
    } else if (!/\bintegrity:\s*sha512-/.test(resolution)) {
      const kind = /\bintegrity:/.test(resolution) ? 'WEAK_INTEGRITY' : 'NO_INTEGRITY';
      hit(line, kind, `${key}: needs a sha512 integrity, has ${resolution}`);
    }
    entry = null;
  };

  lines.forEach((raw, i) => {
    if (/^\S/.test(raw)) {
      close();
      inPackages = /^packages:\s*$/.test(raw);
      return;
    }
    if (!inPackages) return;
    const key = raw.match(/^ {2}(\S.*):\s*$/);
    if (key) {
      close();
      entry = {
        key: key[1].replace(/^'|'$/g, ''),
        line: i + 1,
        resolution: null,
        inResolution: false,
      };
      return;
    }
    if (!entry) return;
    const res = raw.match(/^ {4}resolution:\s*(.*)$/);
    if (res) {
      entry.resolution = res[1].trim();
      entry.inResolution = true;
    } else if (entry.inResolution && /^ {5,}\S/.test(raw)) {
      // A formatter may wrap the flow map over several deeper-indented lines.
      entry.resolution = `${entry.resolution} ${raw.trim()}`.trim();
    } else {
      entry.inResolution = false;
    }
  });
  close();
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const jsonMode = hasJsonFlag(argv);
  const fixtureMode = argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
  const fixture = process.env.FIXTURE_FILE;
  const files =
    fixtureMode && fixture ? [resolve(fixture)] : LOCKFILES.map((f) => resolve(ROOT, f));

  const violations = [];
  let checked = 0;
  for (const path of files) {
    if (!existsSync(path)) continue;
    checked += 1;
    violations.push(...lockfileViolations(readFileSync(path, 'utf8'), relative(ROOT, path)));
  }
  const result = { violations, summary: { lockfiles: checked }, ok: violations.length === 0 };

  if (jsonMode) emitResult(result, true);
  else if (result.ok) {
    console.log(
      `✓ check-lockfile-integrity — ${checked} lockfile(s): every package is sha512 from the registry.`,
    );
  } else {
    console.error(`✗ check-lockfile-integrity — ${violations.length} problem(s):`);
    for (const v of violations)
      console.error(`  ${v.file}:${v.line ?? '-'} ${v.rule} ${v.message}`);
    console.error(
      '  fix: depend on a registry version (no URL, git or file: specifier), then `pnpm install`.',
    );
  }
  process.exit(result.ok ? 0 : 1);
}
