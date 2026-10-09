/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * One sentence every perf-budget failure ends with: point at the
 * performance-optimization skill (vendored Osmani agent-skills; routing in
 * .claude/skills/_vendor/osmani-agent-skills/ROUTING.md) and refuse the shortcut
 * of raising the budget. Shared by scripts/run-size-limit.mjs (the `size-limit`
 * package script, so CI's `pnpm size-limit` step prints it) and
 * scripts/build-button-probe.mjs.
 */
export const PERF_BUDGET_HINT =
  'Performance budget failed. Run the `performance-optimization` skill ' +
  '(.claude/skills/performance-optimization/SKILL.md): measure first (pnpm audit:bundle shows what is in the bundle), ' +
  'then remove or split the cause. Do not raise the budget in .size-limit.cjs.';
