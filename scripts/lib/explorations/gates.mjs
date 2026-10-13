/** @internal — pure helpers for the design-explorations spec set (hds#628). */
/**
 * The gates by direction, judged from a direction's sources and meta files.
 *
 *   layout  src/App.tsx, rationale.md, refs.json (and its tenant), bend-log.json
 *           (C only, and required there)
 *   lint    the harness's violation scan (raw hex and colour functions, raw px,
 *           Tailwind, raw controls, custom CSS) plus the lint plugin's
 *           `recommended` error rules (plugin-lint.mjs), one violation seen by
 *           both counted once. A and B: 0. C: each violation must be listed in
 *           bend-log.json, and each listed one must exist.
 *   gaps    gaps.json is a valid gap log
 *   pii     nothing that would be published looks like real personal data
 *
 * The built halves (builds, axe) are measured by the live stages and added by
 * the orchestrator in live.mjs; this module is pure.
 */
import { scanApp } from '../consistency/violations.mjs';
import { lintWithPlugin, mergeLintHits } from './plugin-lint.mjs';
import { matchBends, validateBendLog, validateRationale, validateRefs } from './direction.mjs';
import { validateGapLog } from './gaps.mjs';
import { scanText } from './pii.mjs';

const check = (name, problems, text) => ({
  name,
  status: problems.length === 0 ? 'pass' : 'fail',
  text,
  detail: problems,
});

const where = (h) => `${h.file}:${h.line} ${h.kind} ${h.match}`;
const plural = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;

function layoutProblems(d, tenants) {
  const problems = [];
  const { rationale, refs, bendLog } = d.meta;
  if (!d.files['src/App.tsx']) problems.push('src/App.tsx is missing');

  if (!rationale.present) problems.push('rationale.md is missing');
  else problems.push(...validateRationale(rationale.text));

  let tenant = null;
  if (!refs.present) problems.push('refs.json is missing');
  else if (refs.error) problems.push(`refs.json is not valid JSON (${refs.error})`);
  else {
    const r = validateRefs(refs.value, { letter: d.letter, tenants });
    problems.push(...r.problems.map((p) => `refs.json: ${p}`));
    tenant = r.tenant;
  }

  let bends = [];
  if (d.letter !== 'C') {
    if (bendLog.present) {
      problems.push('bend-log.json is for direction C only; A and B may not bend a rule');
    }
  } else if (!bendLog.present) {
    problems.push('bend-log.json is missing; direction C writes [] when it bent nothing');
  } else if (bendLog.error) {
    problems.push(`bend-log.json is not valid JSON (${bendLog.error})`);
  } else {
    const r = validateBendLog(bendLog.value);
    problems.push(...r.problems.map((p) => `bend-log.json: ${p}`));
    bends = r.bends;
  }
  return { problems, tenant, bends };
}

function lintCheck(d, bends) {
  const hits = mergeLintHits(scanApp(d.files), lintWithPlugin(d.files));
  if (d.letter !== 'C') {
    return {
      hits,
      listed: [],
      unlisted: hits,
      stale: [],
      check: check(
        'lint',
        hits.map(where),
        hits.length === 0
          ? '0 violations'
          : `${plural(hits.length, 'violation')}; direction ${d.letter} allows none`,
      ),
    };
  }
  const { listed, unlisted, stale } = matchBends(hits, bends);
  const problems = [];
  if (unlisted.length) {
    problems.push('not in bend-log.json:', ...unlisted.map((h) => `  ${where(h)}`));
  }
  if (stale.length) {
    problems.push(
      'bend-log.json lists a violation the code does not have:',
      ...stale.map((b) => `  ${b.kind} ${b.file} ${b.match}`),
    );
  }
  let text = '0 violations';
  if (hits.length) {
    text =
      unlisted.length === 0
        ? `${plural(hits.length, 'violation')}, all listed in bend-log.json`
        : `${plural(unlisted.length, 'violation')} not in bend-log.json`;
  }
  if (stale.length) text += `; ${plural(stale.length, 'stale bend')}`;
  return { hits, listed, unlisted, stale, check: check('lint', problems, text) };
}

function gapsCheck(d) {
  const { gaps } = d.meta;
  const problems = [];
  if (!gaps.present)
    problems.push('gaps.json is missing; write [] when the direction needed nothing');
  else if (gaps.error) problems.push(`gaps.json is not valid JSON (${gaps.error})`);
  else {
    problems.push(
      ...validateGapLog(gaps.value, { screen: d.screen, direction: d.letter }).problems,
    );
  }
  const n = Array.isArray(gaps.value) ? gaps.value.length : 0;
  return check(
    'gaps',
    problems,
    problems.length ? plural(problems.length, 'problem') : plural(n, 'gap'),
  );
}

function piiCheck(d, denylist) {
  const found = Object.entries(d.texts).flatMap(([file, text]) =>
    scanText(text, { file, denylist }),
  );
  return check(
    'pii',
    found.map(where),
    found.length
      ? `${plural(found.length, 'finding')}`
      : 'nothing that looks like real personal data',
  );
}

/**
 * Judge a direction's layout, lint, gap log and PII.
 * @param {ReturnType<import('./direction.mjs').readDirection>} d
 * @param {{ tenants:Record<string,{demo:boolean}>, denylist:string[] }} ctx
 */
export function judgeStatic(d, { tenants, denylist }) {
  const layout = layoutProblems(d, tenants);
  const lint = lintCheck(d, layout.bends);
  const checks = [
    check(
      'layout',
      layout.problems,
      layout.problems.length ? plural(layout.problems.length, 'problem') : 'all files present',
    ),
    lint.check,
    gapsCheck(d),
    piiCheck(d, denylist),
  ];
  return {
    id: d.id,
    screen: d.screen,
    letter: d.letter,
    tenant: layout.tenant,
    pass: checks.every((c) => c.status === 'pass'),
    checks,
    hits: lint.hits,
    listed: lint.listed,
    unlisted: lint.unlisted,
    stale: lint.stale,
  };
}

/** One line per check, with a fail's detail indented under it. */
export function formatChecks(id, checks) {
  const lines = [];
  for (const c of checks) {
    const label = c.status === 'pass' ? 'PASS' : c.status === 'fail' ? 'FAIL' : 'SKIP';
    lines.push(`${[label, c.name, id].filter(Boolean).join(' ')}: ${c.text}`);
    if (c.status === 'fail') for (const d of c.detail) lines.push(`    ${d}`);
  }
  return lines;
}
