/** @internal — pure helpers for scripts/eval-consistency.mjs (hds#343). */
/**
 * Threshold evaluation for the agent-consistency harness.
 *
 * `evaluate(results, thresholds)` takes recorded results and returns one check
 * per threshold: the measured value against the limit. A metric that was not
 * supplied is `not-measured` (the offline mode measures only violations and
 * Jaccard); `pass` means no measured check failed and `complete` means all five
 * were measured. axe counting reuses evaluateScan / BLOCKING_IMPACTS from
 * scripts/lib/axe-gate.mjs (scan rows keyed by app id, empty allowlist).
 *
 * Thresholds shape (see eval/consistency/ledger.json):
 *   { builds:{min,of}, violations:{max}, axe:{max}, jaccard:{min}, lightDiff:{max} }
 * Results shape:
 *   { apps, builds:{id:boolean}, violations:{id:number},
 *     axe:[{storyId:id,theme,violations,error}],
 *     jaccard:{pairs:[{a,b,value}]}, lightDiff:{pairs:[{a,b,pct}]} }
 */
import { evaluateScan } from '../axe-gate.mjs';

const num = (n) => String(Number(n.toFixed(4)));

/** Reduce raw results to the flat figures a ledger entry records. */
export function summarize(results) {
  const m = {};
  const details = {};
  if (results.builds) {
    const ids = results.apps ?? Object.keys(results.builds);
    const failing = ids.filter((id) => results.builds[id] !== true);
    m.builds = { passing: ids.length - failing.length, of: ids.length };
    details.builds = failing.length ? `did not build first try: ${failing.join(', ')}` : '';
  }
  if (results.violations) {
    const perApp = Object.entries(results.violations);
    m.violations = perApp.reduce((sum, [, n]) => sum + n, 0);
    details.violations = perApp
      .filter(([, n]) => n > 0)
      .map(([id, n]) => `${id}: ${n}`)
      .join(', ');
  }
  if (results.axe) {
    const scan = evaluateScan(results.axe, []);
    m.axe = scan.blocking.length + scan.errored.length;
    details.axe = [
      ...scan.blocking.map((b) => `${b.storyId}/${b.theme}: ${b.ruleId} (${b.impact})`),
      ...scan.errored.map((e) => `${e.storyId}/${e.theme}: scan errored (${e.error})`),
    ].join(', ');
  }
  if (results.jaccard?.pairs?.length) {
    m.jaccardMin = Math.min(...results.jaccard.pairs.map((p) => p.value));
    const low = results.jaccard.pairs.reduce((a, b) => (b.value < a.value ? b : a));
    details.jaccard = `lowest pair ${low.a}~${low.b}`;
  }
  if (results.lightDiff?.pairs?.length) {
    m.lightDiffMax = Math.max(...results.lightDiff.pairs.map((p) => p.pct));
    const high = results.lightDiff.pairs.reduce((a, b) => (b.pct > a.pct ? b : a));
    details.lightDiff = `highest pair ${high.a}~${high.b}`;
  }
  return { measured: m, details };
}

const cmp = (value, comparator, limit) => (comparator === '>=' ? value >= limit : value <= limit);

/** Judge already-summarised figures (also used to check ledger entries). */
export function judgeMeasured(measured, thresholds, details = {}) {
  const spec = [
    {
      name: 'builds',
      comparator: '>=',
      value: measured.builds?.passing,
      limit: thresholds.builds.min,
    },
    {
      name: 'violations',
      comparator: '<=',
      value: measured.violations,
      limit: thresholds.violations.max,
    },
    { name: 'axe', comparator: '<=', value: measured.axe, limit: thresholds.axe.max },
    {
      name: 'jaccard',
      comparator: '>=',
      value: measured.jaccardMin,
      limit: thresholds.jaccard.min,
    },
    {
      name: 'lightDiff',
      comparator: '<=',
      value: measured.lightDiffMax,
      limit: thresholds.lightDiff.max,
      unit: '%',
    },
  ];
  const checks = spec.map((s) => {
    const check = {
      name: s.name,
      comparator: s.comparator,
      value: s.value ?? null,
      limit: s.limit,
      unit: s.unit ?? '',
      detail: details[s.name] ?? '',
    };
    if (s.value === undefined || s.value === null) return { ...check, status: 'not-measured' };
    return { ...check, status: cmp(s.value, s.comparator, s.limit) ? 'pass' : 'fail' };
  });
  // Every app that was built must build: 3 of 4 does not satisfy a 3/3 threshold.
  const built = checks[0];
  if (built.status === 'pass' && measured.builds.passing !== measured.builds.of) {
    built.status = 'fail';
  }
  // builds reads best as "2/3" against the required "3/3"
  const b = checks[0];
  if (b.value !== null)
    b.text = `measured ${b.value}/${measured.builds.of} vs limit >= ${b.limit}/${thresholds.builds.of}`;
  return {
    checks,
    pass: checks.every((c) => c.status !== 'fail'),
    complete: checks.every((c) => c.status !== 'not-measured'),
  };
}

export function evaluate(results, thresholds) {
  const { measured, details } = summarize(results);
  return { ...judgeMeasured(measured, thresholds, details), measured };
}

/** One human line per check: names the threshold, the measured value and the limit. */
export function formatCheck(c) {
  const label = c.status === 'not-measured' ? 'SKIP' : c.status === 'pass' ? 'PASS' : 'FAIL';
  if (c.status === 'not-measured') return `${label} ${c.name}: not measured`;
  const body =
    c.text ?? `measured ${num(c.value)}${c.unit} vs limit ${c.comparator} ${num(c.limit)}${c.unit}`;
  return `${label} ${c.name}: ${body}${c.status === 'fail' && c.detail ? ` (${c.detail})` : ''}`;
}
