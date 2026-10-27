#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-tailwind-spacing-scale.mjs — source-level companion to
 * check-layout-contract. Flags raw numeric Tailwind spacing utilities (`gap-2`,
 * `p-5`, `px-3`, `mb-6`, `-mt-6`, `space-y-1.5`) in src/** and docs-site/**,
 * minus the token layer (src/app/design-system) that defines the primitives.
 * The spacing scale is xs..xl (+ none), density-aware; a numeric utility is a
 * fixed px count that ignores density, and the gate scripts that read `style`
 * and `sx` never see it. Use `gap-[var(--semantic-space-scale-md)]` instead.
 *
 * Kinds: `off-scale` (the px value is not a comfortable scale step, e.g. p-3 =
 * 12px), `raw-numeric` (on the scale but fixed, e.g. gap-2 = 8px),
 * `primitive-var` (a `--primitive-space-*` var: a primitive step, not a
 * semantic one) and `primitive-member` (`hds.space.pxN`, the same in JS).
 * Zero (`p-0`), `auto`, `px`, and semantic token values are allowed.
 *
 * WARN mode: exit 0. `--strict` exits 1 on any finding. `--ratchet` (pretest)
 * compares each file's count with scripts/tailwind-spacing-scale.baseline.json:
 * a file may not grow past its baseline, a file not in it may have none, a file
 * that dropped below it fails until the baseline is lowered (`--update-baseline`).
 * The baseline is the debt left from before the guardrail; new code uses
 * semantic spacing only.
 *
 * Usage: node scripts/check-tailwind-spacing-scale.mjs [--strict] [--json]
 *        [--ratchet] [--update-baseline] [--dir <path>] [--only <file basename>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPACING_STEP, SPACING_UTILITY } from './eslint-plugin-hds/rules/spacing.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'scripts/tailwind-spacing-scale.baseline.json');
/** The comfortable t-shirt scale (2026-10): xs..xl = 8/20/28/40/64px. */
const SCALE_PX = [8, 20, 28, 40, 64];
const UTIL = new RegExp(`^(!?)(-?)(${SPACING_UTILITY})-(${SPACING_STEP})$`);
const PRIMITIVE_VAR = /--primitive-space-([\w]+)/g;
const PRIMITIVE_MEMBER = /\bhds\.space\.(px\d+)\b/g;

/**
 * @returns {{line: number, token: string, px?: number,
 *   kind: 'off-scale'|'raw-numeric'|'primitive-var'|'primitive-member'}[]}
 */
export function scanSource(src) {
  const out = [];
  src.split('\n').forEach((text, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(text)) return;
    const line = i + 1;
    for (const raw of text.split(/[\s"'`{}()<>,;=]+/)) {
      if (!raw) continue;
      // Strip variant prefixes (md:, hover:, [&>svg]:) before matching the utility.
      const util = raw.replace(/^(?:(?:[a-z0-9-]+|\[[^\]]*\]):)+/, '');
      const m = UTIL.exec(util);
      if (!m) continue;
      if (m[4] === 'px1' || m[4] === 'px2') continue; // px1/px2 subgrid keys: hairlines, not rhythm
      const n = parseFloat(m[4]);
      if (n === 0) continue;
      const px = n * 4;
      out.push({ line, token: raw, px, kind: SCALE_PX.includes(px) ? 'raw-numeric' : 'off-scale' });
    }
    for (const m of text.matchAll(PRIMITIVE_VAR)) {
      out.push({ line, token: m[0], kind: 'primitive-var' });
    }
    for (const m of text.matchAll(PRIMITIVE_MEMBER)) {
      out.push({ line, token: m[0], kind: 'primitive-member' });
    }
  });
  return out;
}

/**
 * Compare per-file finding counts with a baseline ({ file: count }).
 * @returns {{ failures: {file: string, baseline: number, count: number,
 *   reason: 'grew'|'new'|'stale'}[] }}
 */
export function ratchet(findings, baseline) {
  const counts = {};
  const failures = [];
  for (const f of findings) counts[f.file] = (counts[f.file] ?? 0) + 1;
  const files = [...new Set([...Object.keys(counts), ...Object.keys(baseline)])].sort();
  for (const file of files) {
    const count = counts[file] ?? 0;
    const base = baseline[file];
    if (base === undefined) failures.push({ file, baseline: 0, count, reason: 'new' });
    else if (count > base) failures.push({ file, baseline: base, count, reason: 'grew' });
    else if (count < base) failures.push({ file, baseline: base, count, reason: 'stale' });
  }
  return { failures };
}

/** Scanned by default: all app and docs code (hds#778). */
const ROOTS = ['src', 'docs-site'];
/** The token layer defines the primitives; build output is not source. */
const SKIP_DIRS = new Set(['__tests__', 'node_modules', '.next', '.source', 'design-system']);

function walk(dir) {
  const files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) files.push(...walk(p));
    } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec|figma)\.tsx?$/.test(e.name)) {
      files.push(p);
    }
  }
  return files;
}

/** Every file the scan reads: `dir` alone, or the default roots. */
export function scanFiles(dir) {
  return (dir ? [path.resolve(ROOT, dir)] : ROOTS.map((r) => path.join(ROOT, r))).flatMap(walk);
}

function main() {
  const argv = process.argv;
  const arg = (n) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : undefined);
  const only = arg('only');

  // Fixture mode (proof-of-firing harness): scan ONLY the single FIXTURE_FILE and
  // behave strictly — a finding is exit 1. Without this the gate is WARN-only and
  // scans the real tree, so the fixture is never seen and the gate can never
  // prove it fires. The normal WARN-mode behavior on the real tree is unchanged.
  const isFixtureMode = argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
  const fixtureFile = process.env.FIXTURE_FILE;

  const filesToScan =
    isFixtureMode && fixtureFile ? [path.resolve(fixtureFile)] : scanFiles(arg('dir'));

  const findings = [];
  for (const f of filesToScan) {
    if (only && path.basename(f) !== only) continue;
    for (const x of scanSource(fs.readFileSync(f, 'utf8'))) {
      findings.push({ file: path.relative(ROOT, f), ...x });
    }
  }
  const byKind = (k) => findings.filter((f) => f.kind === k).length;
  const files = new Set(findings.map((f) => f.file));
  if (argv.includes('--update-baseline')) {
    const counts = {};
    for (const f of findings) counts[f.file] = (counts[f.file] ?? 0) + 1;
    const sorted = Object.fromEntries(
      Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
    );
    fs.writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`);
    console.log(`wrote ${path.relative(ROOT, BASELINE)} (${findings.length} findings)`);
    process.exit(0);
  }
  if (argv.includes('--ratchet')) {
    const { failures } = ratchet(findings, JSON.parse(fs.readFileSync(BASELINE, 'utf8')));
    for (const f of failures) {
      const why = {
        new: `${f.count} primitive or raw spacing value(s) in a file with no baseline: use semantic spacing (gap-scale-md, p-surface-padding, var(--semantic-space-*))`,
        grew: `grew from ${f.baseline} to ${f.count} primitive or raw spacing value(s): use semantic spacing for the new ones`,
        stale: `dropped from ${f.baseline} to ${f.count}: lower the baseline with node scripts/check-tailwind-spacing-scale.mjs --update-baseline`,
      }[f.reason];
      console.error(`${f.file}: ${why}`);
    }
    console.log(
      failures.length
        ? `ratchet FAILED (${failures.length})`
        : `ratchet ok (${findings.length} baselined)`,
    );
    process.exit(failures.length ? 1 : 0);
  }
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ findings }, null, 2));
  } else {
    for (const f of findings) {
      console.log(
        `${f.file}:${f.line}  ${f.token}  (${f.px === undefined ? '' : `${f.px}px, `}${f.kind})`,
      );
    }
    console.log(
      `\n${findings.length} raw Tailwind spacing class(es) in ${files.size} file(s): ${byKind('off-scale')} off-scale, ${byKind('raw-numeric')} raw-numeric, ${byKind('primitive-var') + byKind('primitive-member')} primitive. Use semantic spacing: gap-scale-md, p-surface-padding, var(--semantic-space-*).`,
    );
  }
  const strict = argv.includes('--strict') || isFixtureMode;
  if (!argv.includes('--json')) console.log(strict ? 'STRICT' : 'warn mode');
  process.exit(strict && findings.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
