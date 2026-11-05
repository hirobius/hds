/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * gate-lanes — named, ordered command lists kept in the guardrail registry
 * (`lanes` in docs/guardrails/registry.json), run by scripts/run-lane.mjs.
 *
 * hds#1095: check:fast, check:full and pretest used to be hand-written `&&` chains in
 * package.json, one of five places that defined "which gates run". A lane keeps
 * that list as data beside the gates. A lane entry is a whole shell command
 * (some carry flags, some are `pnpm typecheck` or a generator), which is why it
 * is a lane and not a registry gate.
 *
 * A lane step is a shell command string, or `{ "name": "<title>", "run": "<command>" }`
 * when a reader shows the step by name: the pre-push lane's names are the stage
 * titles hook-run.mjs prints and CONTRIBUTING.md's gate table lists.
 *
 * run-gates.mjs is vendored byte-identical from hirobius/ops, so lanes get
 * their own small runner here until ops grows a lane mode; then run-lane.mjs
 * folds into run-gates.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The runner call package.json uses for a lane. */
export const LANE_CALL = /^node scripts\/run-lane\.mjs (\S+)$/;

/** Ordered `{ title, run }` steps of `lane` (a plain step is titled by its command), or null. */
export function laneStages(registry, lane) {
  const steps = registry?.lanes?.[lane];
  if (!Array.isArray(steps)) return null;
  return steps.map((s) =>
    typeof s === 'string' ? { title: s, run: s } : { title: s.name ?? s.run, run: s.run },
  );
}

/** Ordered commands of `lane`, or null when the registry has no such lane. */
export function laneCommands(registry, lane) {
  return laneStages(registry, lane)?.map((s) => s.run) ?? null;
}

/** A hook line that hands the hook's stages to a lane. */
const HOOK_LANE_LINE = /^\s*node scripts\/run-lane\.mjs ([\w:.-]+)\s*$/;

/**
 * Hook `text` (e.g. .husky/pre-push) with each `node scripts/run-lane.mjs <lane>`
 * line replaced by the lane's steps in the hook's own stage shape: an
 * `echo "<title>…"` line, then the command. hook-run.mjs, the wiring check and
 * the CONTRIBUTING.md table test parse the result exactly as they parsed the
 * hand-written hook. A call to an unknown lane stays as-is (so it parses to no
 * stage, and hook-run fails closed).
 */
export function expandHookLanes(text, registry) {
  return String(text)
    .split('\n')
    .flatMap((line) => {
      const lane = HOOK_LANE_LINE.exec(line)?.[1];
      const stages = lane ? laneStages(registry, lane) : null;
      return stages ? stages.flatMap((s) => [`echo "${s.title}…"`, s.run]) : [line];
    })
    .join('\n');
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

/** Run steps (commands or lane stages) in order; stop at the first non-zero exit and return it (`&&`). */
export function runLane(commands, run) {
  for (const cmd of commands) {
    const code = run(cmd);
    if (code !== 0) return code;
  }
  return 0;
}

/**
 * `root`'s package.json scripts with lanes expanded from its registry. For
 * tests that assert a command runs in a chain (e.g. "pretest runs X").
 */
export function readLaneScripts(root) {
  const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
  return expandLaneScripts(read('package.json').scripts, read('docs/guardrails/registry.json'));
}

/**
 * `text` (a shell file such as ralph/gate.sh) with the commands of every lane
 * it runs through run-lane.mjs appended, one per line, so wiring checks that
 * grep the file see the steps the lane runs.
 */
export function expandLaneCalls(text, registry) {
  const extra = [];
  for (const [, lane] of String(text).matchAll(/run-lane\.mjs ([\w:.-]+)/g)) {
    const cmds = laneCommands(registry, lane);
    if (cmds) extra.push(...cmds);
  }
  return extra.length ? `${text}\n${extra.join('\n')}` : text;
}
