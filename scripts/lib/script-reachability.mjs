/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * script-reachability — which package.json scripts actually run?
 *
 * `check-validator-wiring` used to satisfy the `pnpm-meta` channel with
 *
 *     Object.values(scripts).some((cmd) => cmd.includes(gateScript))
 *
 * and no check that the referencing script is ever invoked. A reviewer proved
 * the dodge during #262 with a script named `totally:unused:nobody:calls:this`:
 * the validator reported the fake gate `✓ wired as declared`.
 *
 * So `pnpm-meta` meant "named in a script", not "runs" — and the difference is
 * most of the registry. Of 24 gates labelled pnpm-meta, 6 are in `pretest` and
 * run on every PR; the other 18 are reachable only from `check:fast`,
 * `check:full` or their own alias, none of which CI invokes.
 *
 * Reachability is a graph, not a lookup. A script runs if:
 *   - a `.husky/` hook or a `.github/workflows/` step invokes it,
 *   - it is the npm lifecycle hook of a script that runs (`pretest` fires from
 *     `pnpm test`), or
 *   - a script that runs calls it.
 */

/** `pnpm <script>` / `npm run <script>` / `yarn <script>`. */
const SCRIPT_CALL = /\b(?:pnpm run|npm run|yarn run|pnpm|yarn)\s+([a-zA-Z][\w:.-]*)/g;

/**
 * pnpm subcommands that are not script names.
 *
 * `pnpm exec eslint` runs a binary; `pnpm install` is package management.
 * Without this, a script coincidentally named after one of them would look
 * reachable from any hook that happens to install dependencies.
 */
const NOT_A_SCRIPT = new Set([
  'exec',
  'dlx',
  'install',
  'i',
  'add',
  'remove',
  'rm',
  'update',
  'up',
  'why',
  'list',
  'ls',
  'link',
  'unlink',
  'store',
  'config',
  'init',
  'pack',
  'publish',
  'audit',
  'outdated',
  'prune',
  'rebuild',
  'root',
  'bin',
  'env',
  'setup',
  'import',
  'fetch',
  'licenses',
  'patch',
  'deploy',
  'create',
  'server',
  'run',
]);

/** Script names invoked anywhere in `text`. */
function callsIn(text) {
  const out = new Set();
  for (const [, name] of String(text ?? '').matchAll(SCRIPT_CALL)) {
    if (!NOT_A_SCRIPT.has(name)) out.add(name);
  }
  return out;
}

/**
 * Every package.json script that actually runs.
 *
 * @param {{hooks: string, workflows: string, scripts: Record<string,string>}} input
 *   `hooks` and `workflows` are the concatenated text of `.husky/*` and
 *   `.github/workflows/*`; `scripts` is package.json#scripts.
 * @returns {Set<string>} reachable script names
 */
export function reachableScripts({ hooks = '', workflows = '', scripts = {} }) {
  const defined = new Set(Object.keys(scripts));
  const reachable = new Set();

  // Seed: whatever a hook or a CI step invokes directly.
  const queue = [...callsIn(hooks), ...callsIn(workflows)].filter((n) => defined.has(n));

  while (queue.length > 0) {
    const name = queue.shift();
    if (reachable.has(name)) continue;
    reachable.add(name);

    // Scripts this one calls.
    for (const next of callsIn(scripts[name])) {
      if (defined.has(next)) queue.push(next);
    }

    // npm fires pre<name>/post<name> automatically around a script that runs.
    // A bare `pre`/`post` prefix on a name that is ITSELF a lifecycle hook is
    // not chained further — npm does not run `prepretest`.
    if (!/^(pre|post)/.test(name)) {
      for (const hook of [`pre${name}`, `post${name}`]) {
        if (defined.has(hook)) queue.push(hook);
      }
    }
  }

  return reachable;
}
