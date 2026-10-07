#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-tailwind-spacing-scale.mjs — source-level companion to
 * check-layout-contract. Flags raw numeric Tailwind spacing utilities (`gap-2`,
 * `p-5`, `px-3`, `mb-6`, `-mt-6`, `space-y-1.5`) in src/app/components/**.
 * The spacing scale is xs..xl (+ none), density-aware; a numeric utility is a
 * fixed px count that ignores density, and the gate scripts that read `style`
 * and `sx` never see it. Use `gap-[var(--semantic-space-scale-md)]` instead.
 *
 * Two kinds: `off-scale` (the px value is not 8/16/24/32/48, e.g. p-5 = 20px)
 * and `raw-numeric` (the px value is on the scale but fixed, e.g. gap-2 = 8px).
 * Zero (`p-0`), `auto`, `px`, and arbitrary token values are allowed.
 *
 * WARN mode: exit 0. `--strict` exits 1 on any finding.
 *
 * Usage: node scripts/check-tailwind-spacing-scale.mjs [--strict] [--json]
 *        [--dir <path>] [--only <file basename>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCALE_PX = [8, 16, 24, 32, 48];
const UTIL = /^(!?)(-?)(p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])-(\d+(?:\.\d+)?)$/;

/** @returns {{line: number, token: string, px: number, kind: 'off-scale'|'raw-numeric'}[]} */
export function scanSource(src) {
  const out = [];
  src.split('\n').forEach((text, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(text)) return;
    for (const raw of text.split(/[\s"'`{}()<>,;=]+/)) {
      if (!raw) continue;
      // Strip variant prefixes (md:, hover:, [&>svg]:) before matching the utility.
      const util = raw.replace(/^(?:(?:[a-z0-9-]+|\[[^\]]*\]):)+/, '');
      const m = UTIL.exec(util);
      if (!m) continue;
      const n = parseFloat(m[4]);
      if (n === 0) continue;
      const px = n * 4;
      out.push({
        line: i + 1,
        token: raw,
        px,
        kind: SCALE_PX.includes(px) ? 'raw-numeric' : 'off-scale',
      });
    }
  });
  return out;
}

function walk(dir) {
  const files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__' && e.name !== 'node_modules') files.push(...walk(p));
    } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec|stories|figma)\.tsx?$/.test(e.name)) {
      files.push(p);
    }
  }
  return files;
}

function main() {
  const argv = process.argv;
  const arg = (n) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : undefined);
  const dir = path.resolve(ROOT, arg('dir') ?? 'src/app/components');
  const only = arg('only');
  const findings = [];
  for (const f of walk(dir)) {
    if (only && path.basename(f) !== only) continue;
    for (const x of scanSource(fs.readFileSync(f, 'utf8'))) {
      findings.push({ file: path.relative(ROOT, f), ...x });
    }
  }
  const byKind = (k) => findings.filter((f) => f.kind === k).length;
  const files = new Set(findings.map((f) => f.file));
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ findings }, null, 2));
  } else {
    for (const f of findings) {
      console.log(`${f.file}:${f.line}  ${f.token}  (${f.px}px, ${f.kind})`);
    }
    console.log(
      `\n${findings.length} raw Tailwind spacing class(es) in ${files.size} file(s): ${byKind('off-scale')} off-scale, ${byKind('raw-numeric')} raw-numeric. Use gap-[var(--semantic-space-scale-md)] style tokens (xs..xl).`,
    );
  }
  const strict = argv.includes('--strict');
  if (!argv.includes('--json')) console.log(strict ? 'STRICT' : 'warn mode');
  process.exit(strict && findings.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
