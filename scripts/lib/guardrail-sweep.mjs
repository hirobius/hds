/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * guardrail-sweep.mjs — the pure half of `pnpm guardrail:sweep`.
 *
 * WHY THIS EXISTS. The registry used to carry `lastFiringAt` per gate, fed by a
 * post-commit hook. It measured one gate out of 54 and backfilled the rest, so
 * it reported health it had never observed and nearly justified deleting eight
 * working gates (ADR-027). This replaces it with the opposite approach: don't
 * record what happened in the background, run everything on demand and report
 * what actually happens.
 *
 * Classification and summary live here so they are testable without spawning 54
 * processes.
 */

/**
 * What a finished gate run means.
 *
 * The distinction that matters is FAIL vs CRASH. Exit 1 is a gate doing its job
 * and reporting violations; a gate that dies on a missing entry point or throws
 * before it reads anything is broken tooling, and reading the two as the same
 * number is how `audit-bundle` sat red and unnoticed.
 *
 * @param {{ status: number|null, error?: { code?: string } }} run
 * @returns {'PASS'|'FAIL'|'NO-DATA'|'CRASH'|'TIMEOUT'}
 */
export function classifyVerdict(run) {
  if (run.error?.code === 'ETIMEDOUT') return 'TIMEOUT';
  if (run.status === 0) return 'PASS';
  if (run.status === 1) return 'FAIL';
  // Exit 2 is this repo's convention for "cannot answer" — no snapshot
  // committed yet, no baseline, nothing to compare. Not a violation and not a
  // crash; the gate ran and correctly declined to render a verdict.
  if (run.status === 2) return 'NO-DATA';
  return 'CRASH';
}

/** Verdicts that mean a human should look, in the order they should look. */
export const ACTIONABLE = ['CRASH', 'TIMEOUT', 'FAIL', 'NO-DATA'];

/**
 * Totals plus the two structural facts the sweep is uniquely able to observe:
 * which gates rewrite the working tree (they can never go on pre-commit without
 * leaving it dirty) and which are too slow for a commit hook.
 *
 * @param {Array<{verdict: string, durationMs: number, dirtiesTree: boolean}>} results
 * @param {{ slowMs?: number }} [options]
 */
export function summarize(results, { slowMs = 10_000 } = {}) {
  const byVerdict = {};
  for (const r of results) byVerdict[r.verdict] = (byVerdict[r.verdict] ?? 0) + 1;

  return {
    total: results.length,
    byVerdict,
    actionable: results.filter((r) => ACTIONABLE.includes(r.verdict)).length,
    dirtiesTree: results.filter((r) => r.dirtiesTree).map((r) => r.id),
    slow: results.filter((r) => r.durationMs >= slowMs).map((r) => r.id),
  };
}

/**
 * Exit code for the whole sweep.
 *
 * A sweep is a REPORT, so violations alone do not fail it — 15 red gates is the
 * finding, not an error in the measurement. Only a gate that could not run at
 * all (crash or timeout) means the sweep itself could not answer, and that is
 * what `--strict` escalates.
 *
 * @param {ReturnType<typeof summarize>} summary
 * @param {{ strict?: boolean }} [options]
 */
export function exitCodeFor(summary, { strict = false } = {}) {
  const broken = (summary.byVerdict.CRASH ?? 0) + (summary.byVerdict.TIMEOUT ?? 0);
  if (broken > 0) return 1;
  if (strict && summary.actionable > 0) return 1;
  return 0;
}

/**
 * The argv to run a gate with.
 *
 * The sweep used to run every gate bare — `node <gateScript>` with no flags —
 * which is not how four of them are wired. For three (audit-component-integrity,
 * check-link-integrity, audit-tokens) a bare run is the union of the sub-modes,
 * so it over-reports nothing. check-token-descriptions is the exception: every
 * caller passes --no-missing, and bare it added 103 MISSING findings for
 * primitives the repo has deliberately chosen not to describe one at a time.
 *
 * A sweep reporting a standard nothing enforces is the worst kind of wrong
 * here, because it is the instrument every other verdict is read through — the
 * same failure as the firing telemetry ADR-027 removed, arrived at from the
 * other direction.
 *
 * @param {{ gateScript: string, defaultArgs?: string[] }} gate - registry entry
 * @returns {string[]} argv for `node`
 */
export function gateArgv(gate) {
  const extra = Array.isArray(gate?.defaultArgs) ? gate.defaultArgs : [];
  return [gate.gateScript, ...extra];
}
