#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-component-token-binding.mjs
 *
 * Does each component consume the `component.*` token that describes the same
 * property, and do the two agree? Button `sm` once hard-coded a 14px icon
 * (`[&_svg]:size-3.5`) while `component.button.size.sm.iconSize` said 12px and
 * nothing compared them. This gate reads the binding map
 * (scripts/component-token-bindings.json), resolves what each component's cva
 * class strings say (Tailwind utilities, token aliases, Light and Dark, plus
 * the static.css mirrors) and classifies every component token leaf:
 *
 *   BOUND             the source names var(--component-<leaf>)
 *   LITERAL-MATCH     same value, said another way (alias | type-role | literal)
 *   LITERAL-MISMATCH  a different value in Light or Dark
 *   UNUSED            nothing in the source sets that property
 *
 * Engine and design notes: scripts/lib/component-token-binding.mjs.
 *
 * Modes (static, no browser, well under a second):
 *   --report           print the table (default), exit 0
 *   --enforce          exit 1 on any LITERAL-MISMATCH or LITERAL-MATCH not in the
 *                      baseline, or any new structural finding
 *   --json             print the full result as JSON (combine with either mode)
 *   --update-baseline  rewrite scripts/component-token-binding.baseline.json
 *                      from today's result (do this only to RECORD debt that
 *                      cannot be fixed yet, or to tighten after a fix)
 *   --root <dir>       read inputs from <dir> instead of the repo
 *
 * Allowlist one deliberate literal with an inline comment in the component:
 *   // binding-ok: button.size.sm.iconSize <reason>
 *
 * Fixture mode (docs/guardrails/FIXTURE_DIR_HARNESS.md): with FIXTURE_DIR set
 * (or --fixture-mode) the inputs come from that directory and the gate
 * enforces.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { analyze, summarize, ratchet, formatReport } from './lib/component-token-binding.mjs';
import { buildUtilityMap } from './lib/token-references.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const rootArg = argv.indexOf('--root');
const FIXTURE_DIR = process.env.FIXTURE_DIR;
const ROOT = FIXTURE_DIR || (rootArg >= 0 ? path.resolve(argv[rootArg + 1]) : REPO);
const ENFORCE = flag('--enforce') || flag('--fixture-mode') || !!FIXTURE_DIR;

const MAP_PATH = 'scripts/component-token-bindings.json';
const BASELINE_PATH = 'scripts/component-token-binding.baseline.json';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readIf = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? read(rel) : undefined);

function listSources(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        /\.tsx?$/.test(e.name) &&
        !/\.(test|stories|spec)\.tsx?$/.test(e.name) &&
        !e.name.endsWith('.d.ts'),
    )
    .map((e) => path.posix.join(dir, e.name));
}

function loadTailwind() {
  const cfgPath = path.join(ROOT, 'tailwind.config.tokens.cjs');
  if (!fs.existsSync(cfgPath)) return {};
  try {
    const extend = require(cfgPath)?.theme?.extend ?? {};
    return {
      spacing: extend.spacing,
      borderRadius: extend.borderRadius,
      fontSize: extend.fontSize,
    };
  } catch {
    return {};
  }
}

function load() {
  const tokens = JSON.parse(read('hirobius.tokens.json'));
  const map = JSON.parse(read(MAP_PATH));
  const sources = {};
  const scan = {};
  for (const group of Object.values(map.groups ?? {})) {
    if (group.source) sources[group.source] = readIf(group.source);
  }
  for (const dir of map.scan ?? []) {
    for (const file of listSources(dir)) if (!(file in sources)) scan[file] = read(file);
  }
  for (const key of Object.keys(sources)) if (sources[key] === undefined) delete sources[key];
  const css = {};
  for (const group of Object.values(map.groups ?? {})) {
    if (group.css && !(group.css.file in css)) {
      const text = readIf(group.css.file);
      if (text !== undefined) css[group.css.file] = text;
    }
  }
  const utilityMap = buildUtilityMap(ROOT, (p) => require(p));
  return { tokens, map, sources, scan, css, utilityMap, tailwind: loadTailwind() };
}

function main() {
  const analysis = analyze(load());
  const summary = summarize(analysis.results);
  const baselineText = readIf(BASELINE_PATH);
  const baseline = baselineText ? JSON.parse(baselineText) : { leaves: {}, css: {}, findings: [] };
  const verdict = ratchet(analysis, baseline);

  if (flag('--update-baseline')) {
    const body = {
      $comment:
        'Ratchet for check-component-token-binding.mjs: the known drift (LITERAL-MISMATCH and LITERAL-MATCH leaves, static.css mirrors, structural findings) as of the last update. New drift fails --enforce; fixing an entry only shrinks this file. Regenerate with `node scripts/check-component-token-binding.mjs --update-baseline` after a fix, never to hide a new mismatch.',
      leaves: verdict.baseline.leaves,
      css: verdict.baseline.css,
      findings: verdict.baseline.findings,
    };
    fs.writeFileSync(path.join(ROOT, BASELINE_PATH), `${JSON.stringify(body, null, 2)}\n`);
    console.log(
      `Wrote ${BASELINE_PATH}: ${Object.keys(body.leaves).length} leaves, ${Object.keys(body.css).length} css, ${body.findings.length} findings.`,
    );
    return 0;
  }

  if (flag('--json')) {
    console.log(
      JSON.stringify(
        { summary, ...analysis, ratchet: { new: verdict.fresh, fixed: verdict.fixed } },
        null,
        2,
      ),
    );
  } else {
    console.log(formatReport(analysis, summary));
    if (verdict.fixed.length) {
      console.log(
        `\n${verdict.fixed.length} baselined entr${verdict.fixed.length === 1 ? 'y is' : 'ies are'} fixed or changed; tighten with --update-baseline:\n  ${verdict.fixed.join('\n  ')}`,
      );
    }
  }

  if (verdict.fresh.length) {
    const head = ENFORCE ? 'FAIL' : 'WARN';
    const lines = verdict.fresh.map((f) => `  ${f.key} [${f.class}]: ${f.message}`);
    const hint =
      'Bind it (var(--component-...)), fix the component or the token, or allowlist it with `// binding-ok: <group.leaf> <reason>`. Do not edit the baseline to hide a new mismatch.';
    const out = `\n${head}: ${verdict.fresh.length} component token binding finding(s) not in the baseline:\n${lines.join('\n')}\n${hint}`;
    (ENFORCE ? console.error : console.warn)(out);
    return ENFORCE ? 1 : 0;
  }
  return 0;
}

process.exitCode = main();
