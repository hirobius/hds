#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-layout-contract.mjs — the v1 layout contract as a deterministic gate.
 *
 * Probes a component in Chromium inside a 480px container whose parent is taller
 * than the child (the probe lives in lib/layout-probe.mjs), and measures it against docs/guardrails/layout-contract.json: fill vs
 * hug width, height stretch, outer margins, nested padding, form-control max
 * width and sibling widths, horizontal overflow at 390px, and gaps that are not
 * on the xs..xl scale. WARN mode by default (exit 0); --strict exits 1 on any
 * violation.
 *
 * Usage:
 *   node scripts/check-layout-contract.mjs [--strict] [--md <file>] (--measurements <file> | --html <file>)
 *
 *   --measurements  evaluate saved measurements (the canary fixture) with no browser
 *   --html          probe a static HTML file (canary for the probe itself)
 *
 * Writes reports/layout-contract/latest.json (gitignored) and, with --md, a
 * Markdown report (docs/audits/layout-contract-baseline.md is the saved baseline).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES, evaluateMeasurement, summarize, validateContract } from './lib/layout-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv;
const flag = (n) => argv.includes(`--${n}`);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 ? argv[i + 1] : d;
};
const STRICT = flag('strict');
const PROBE = { probeW: 480, probeH: 800, wideW: 1200 };

function loadContract() {
  const contract = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'docs/guardrails/layout-contract.json'), 'utf8'),
  );
  const problems = validateContract(contract);
  if (problems.length) {
    console.error(`layout-contract.json is invalid:\n  ${problems.join('\n  ')}`);
    process.exit(2);
  }
  return contract;
}

async function measureHtml(file) {
  const { probeLayout, probeOverflow } = await import('./lib/layout-probe.mjs');
  const { launchChromium } = await import('./lib/browser-host.mjs');
  const browser = await launchChromium();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.setContent(fs.readFileSync(path.resolve(ROOT, file), 'utf8'));
  const m = await page.evaluate(probeLayout, PROBE);
  await page.setViewportSize({ width: 390, height: 900 });
  m.overflow390 = await page.evaluate(probeOverflow);
  await browser.close();
  return [{ component: 'Canary', probeId: 'canary', title: file, measurement: m }];
}

function evaluate(results, components) {
  const violations = [];
  const errored = [];
  const seenNested = new Set();
  for (const r of results) {
    if (r.nestedOnly) {
      for (const n of r.measurement.nested) {
        const detail = `${n.inner} is padded directly inside padded ${n.outer}`;
        if (seenNested.has(`${r.component}|${detail}`)) continue;
        seenNested.add(`${r.component}|${detail}`);
        violations.push({
          component: r.component,
          probeId: r.probeId,
          target: r.measurement.target,
          rule: 'nested-padding',
          detail,
          el: n.inner,
        });
      }
      continue;
    }
    if (r.measurement.error) {
      errored.push({ component: r.component, probeId: r.probeId, error: r.measurement.error });
      continue;
    }
    const entry = components[r.component];
    for (const v of evaluateMeasurement(entry, r.measurement, { remPx: r.measurement.remPx })) {
      if (v.rule === 'nested-padding') {
        if (seenNested.has(`${r.component}|${v.detail}`)) continue;
        seenNested.add(`${r.component}|${v.detail}`);
      }
      violations.push({
        component: r.component,
        probeId: r.probeId,
        target: r.measurement.target,
        ...v,
      });
    }
  }
  return { violations, errored };
}

function markdown({ violations, errored, unprobed, results }, counts) {
  const L = [];
  L.push('# Layout contract baseline', '');
  L.push(
    'Warning report from `pnpm check:layout-contract` (warn mode) against current `main`. Contract: `docs/guardrails/layout-contract.json`. This is the fix list for the next wave. Regenerate with `pnpm check:layout-contract --md docs/audits/layout-contract-baseline.md`.',
    '',
  );
  L.push(
    `Probed ${results.filter((r) => !r.nestedOnly).length - errored.length} components, ${violations.length} violations.`,
    '',
  );
  L.push('## Violations per rule', '', '| Rule | Count |', '| --- | ---: |');
  for (const r of RULES) L.push(`| ${r} | ${counts[r] ?? 0} |`);
  L.push('');
  const byComp = new Map();
  for (const v of violations) byComp.set(v.component, [...(byComp.get(v.component) ?? []), v]);
  L.push('## Violations per component', '');
  for (const [c, vs] of [...byComp].sort()) {
    L.push(`### ${c}`, '', `Probe \`${vs[0].probeId}\`, probed element \`${vs[0].target}\``, '');
    for (const v of vs) L.push(`- **${v.rule}**: ${v.detail}`);
    L.push('');
  }
  if (!byComp.size) L.push('None.', '');
  if (errored.length) {
    L.push('## Could not be probed (probe error)', '');
    for (const e of errored) L.push(`- ${e.component} (${e.probeId}): ${e.error}`);
    L.push('');
  }
  if (unprobed.length) {
    L.push('## No probe found', '', unprobed.join(', '), '');
  }
  return L.join('\n');
}

async function main() {
  const contract = loadContract();
  let components = contract.components;
  let results;
  let unprobed = [];
  if (arg('measurements')) {
    const f = JSON.parse(fs.readFileSync(path.resolve(ROOT, arg('measurements')), 'utf8'));
    if (f.contract) components = f.contract;
    results = f.measurements;
  } else if (arg('html')) {
    components = {
      Canary: { width: 'hug', height: 'hug', pads: false, kind: 'leaf', probe: true },
    };
    results = await measureHtml(arg('html'));
  } else {
    console.error('check-layout-contract: pass --measurements <file> or --html <file>.');
    process.exit(2);
  }
  results.sort((a, b) => a.component.localeCompare(b.component));
  const { violations, errored } = evaluate(results, components);
  const counts = summarize(violations);

  const byComp = new Map();
  for (const v of violations) byComp.set(v.component, [...(byComp.get(v.component) ?? []), v.rule]);
  console.log(
    '\ncomponent                   probe                                          violations',
  );
  for (const r of results.filter((x) => !x.nestedOnly)) {
    const rules = byComp.get(r.component);
    const status = r.measurement.error
      ? `ERROR ${r.measurement.error}`
      : rules
        ? [...new Set(rules)]
            .map(
              (x) =>
                `${x}${rules.filter((y) => y === x).length > 1 ? `x${rules.filter((y) => y === x).length}` : ''}`,
            )
            .join(', ')
        : 'ok';
    console.log(`${r.component.padEnd(27)} ${String(r.probeId).padEnd(46)} ${status}`);
  }
  console.log('\nviolations per rule:');
  for (const rule of RULES) console.log(`  ${rule.padEnd(20)} ${counts[rule] ?? 0}`);
  if (unprobed.length) console.log(`\nno probe: ${unprobed.join(', ')}`);

  const payload = {
    generatedAt: new Date().toISOString(),
    mode: STRICT ? 'strict' : 'warn',
    counts,
    violations,
    errored,
    unprobed,
  };
  if (!arg('measurements')) {
    fs.mkdirSync(path.join(ROOT, 'reports/layout-contract'), { recursive: true });
    fs.writeFileSync(
      path.join(ROOT, 'reports/layout-contract/latest.json'),
      JSON.stringify(payload, null, 2) + '\n',
    );
  }
  if (arg('md'))
    fs.writeFileSync(
      path.resolve(ROOT, arg('md')),
      markdown({ violations, errored, unprobed, results }, counts),
    );

  const bad = violations.length > 0;
  console.log(
    `\n${violations.length} violation(s) across ${byComp.size} component(s), ${errored.length} probe error(s) — ${STRICT ? 'STRICT' : 'warn mode'}.`,
  );
  process.exit(STRICT && bad ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
