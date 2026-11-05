/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * gate-lanes — named, ordered command lists kept in the guardrail registry
 * (`lanes` in docs/guardrails/registry.json), run by scripts/run-lane.mjs.
 *
 * hds#1095: check:fast and check:full used to be hand-written `&&` chains in
 * package.json, one of five places that defined "which gates run". A lane keeps
 * that list as data beside the gates. A lane entry is a whole shell command
 * (some carry flags, some are `pnpm typecheck` or a generator), which is why it
 * is a lane and not a registry gate.
 *
 * run-gates.mjs is vendored byte-identical from hirobius/ops, so lanes get
 * their own small runner here until ops grows a lane mode; then run-lane.mjs
 * folds into run-gates.
 */

/** The runner call package.json uses for a lane. */
export const LANE_CALL = /^node scripts\/run-lane\.mjs (\S+)$/;

/** Ordered commands of `lane`, or null when the registry has no such lane. */
export function laneCommands(registry, lane) {
  const cmds = registry?.lanes?.[lane];
  return Array.isArray(cmds) ? [...cmds] : null;
}

/**
 * package.json scripts with each lane call replaced by its `&&` chain, so
 * wiring and reachability checks read the commands a lane actually runs.
 */
export function expandLaneScripts(scripts, registry) {
  const out = {};
  for (const [name, cmd] of Object.entries(scripts ?? {})) {
    const lane = LANE_CALL.exec(cmd)?.[1];
    const cmds = lane ? laneCommands(registry, lane) : null;
    out[name] = cmds ? cmds.join(' && ') : cmd;
  }
  return out;
}

/** Run commands in order; stop at the first non-zero exit and return it (`&&`). */
export function runLane(commands, run) {
  for (const cmd of commands) {
    const code = run(cmd);
    if (code !== 0) return code;
  }
  return 0;
}
