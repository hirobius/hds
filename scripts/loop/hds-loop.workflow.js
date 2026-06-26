export const meta = {
  name: 'hds-loop',
  description:
    'HDS autonomous loop: implement one backlog unit in an isolated worktree, then prove it against its declared mechanical acceptance checks (loop engineering).',
  whenToUse:
    'Invoke via the Workflow tool with args = a single unit object from docs/ai/orchestration.json (see `pnpm loop:next`). Runs one unit; bounded by attempts.',
  phases: [
    { title: 'Implement', detail: 'one worktree agent edits + self-checks + commits' },
    {
      title: 'Verify',
      detail: 'independent agent re-runs the acceptance checks on the committed branch',
    },
  ],
};

// ── Inputs ───────────────────────────────────────────────────────────────────
// input.unit          — a unit object: { id, title, brief, acceptanceChecks[], scopeHint, ... }
// input.maxAttempts   — override; defaults to 2
// input.dryRun        — if true, the implement agent makes NO product change (smoke test)
//
// `args` may arrive as a parsed object OR as a JSON string depending on how the
// caller passed it — normalize defensively so the runner is robust either way.
let input = args;
if (typeof input === 'string') {
  try {
    input = JSON.parse(input);
  } catch (e) {
    input = {};
  }
}
input = input || {};
const unit = input.unit;
if (!unit || !unit.id) {
  log(
    'hds-loop: no unit provided in args.unit — nothing to do. Pass a unit from `pnpm loop:next`.',
  );
  return { error: 'no-unit', dispatched: false };
}

const checks = Array.isArray(unit.acceptanceChecks) ? unit.acceptanceChecks : [];
if (checks.length === 0) {
  // The verifier contract forbids dispatching an uncheckable unit. The runner
  // refuses rather than "shipping bugs with high confidence".
  log(
    `hds-loop: unit ${unit.id} has no acceptanceChecks — refusing to dispatch (verifier contract).`,
  );
  return { unit: unit.id, dispatched: false, error: 'no-acceptance-checks' };
}

// Map the acceptance-check DSL → shell commands the agents must run.
//   gate:<id> → node scripts/run-gates.mjs --gate <id>
//   pnpm:<s>  → pnpm <s>
function checkToCommand(raw) {
  const i = raw.indexOf(':');
  const kind = raw.slice(0, i);
  const ref = raw.slice(i + 1);
  if (kind === 'gate') return `node scripts/run-gates.mjs --gate ${ref}`;
  if (kind === 'pnpm') return `pnpm ${ref}`;
  return null;
}
const commands = checks.map(checkToCommand).filter(Boolean);
const commandList = commands.join(' && ');

const maxAttempts = input.maxAttempts || 2;
const dryRun = !!input.dryRun;

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['branch', 'allPassed', 'results'],
  properties: {
    branch: {
      type: 'string',
      description: 'the worktree branch the work was committed to (or empty if nothing committed)',
    },
    isolationVerified: {
      type: 'boolean',
      description: 'did `node scripts/dispatch-pod.mjs verify` pass before committing',
    },
    allPassed: {
      type: 'boolean',
      description: 'true only if EVERY acceptance-check command exited 0',
    },
    results: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['command', 'exitCode'],
        properties: {
          command: { type: 'string' },
          exitCode: { type: 'number' },
        },
      },
    },
    notes: { type: 'string', description: 'short summary of what changed and any blocker' },
  },
};

const implementInstruction = dryRun
  ? `This is a DRY-RUN smoke check for unit "${unit.id}". Make NO product-code change. Simply confirm the harness path works: create an isolated worktree, run \`node scripts/dispatch-pod.mjs verify\` to confirm isolation, then run the acceptance check command(s) below and report each exit code. Do not commit anything.`
  : `Implement unit "${unit.id}": ${unit.title}.\n\n${unit.brief || ''}\n\nScope hint: ${unit.scopeHint || 'n/a'}.\n\nWork ONLY inside your isolated git worktree. Before committing, run \`node scripts/dispatch-pod.mjs verify\` and abort if it fails (do not write to the parent worktree).\n\nIMPORTANT — bootstrap the worktree before verifying: a fresh git worktree has no node_modules and none of the gitignored generated artifacts (src/app/data/component-api.json, used-icons.json, token-audit-report.json), so typecheck/tests will spuriously fail until you run \`pnpm install\` then \`pnpm manifest:generate && pnpm icons:sync && node scripts/audit-tokens.mjs\`. Do that first.\n\nFollow CLAUDE.md and the components-dir rules. Make the change so the acceptance check command(s) below all exit 0, then commit to your worktree branch. Do NOT push.`;

let result = null;
let attempt = 0;

while (attempt < maxAttempts && (!budget.total || budget.remaining() > 60_000)) {
  attempt++;
  phase('Implement');
  const impl = await agent(
    `${implementInstruction}\n\nAcceptance check command(s) (run from repo root, must ALL exit 0):\n  ${commandList}\n\nReturn the worktree branch name, whether isolation verified, and each command's exit code.`,
    {
      schema: VERDICT_SCHEMA,
      label: `impl:${unit.id}#${attempt}`,
      phase: 'Implement',
      isolation: dryRun ? undefined : 'worktree',
    },
  );

  if (!impl) {
    result = { unit: unit.id, attempt, allPassed: false, verdict: 'agent-died' };
    continue;
  }

  // Independent verification: a SECOND agent re-runs the same mechanical checks
  // on the committed branch. We do NOT trust the implementer's self-reported
  // exit codes (roadmap 13g-8: no voluntary self-audit). For a dry-run there is
  // no branch, so the implementer's mechanical check IS the result.
  if (dryRun || !impl.branch) {
    result = {
      unit: unit.id,
      attempt,
      branch: impl.branch || null,
      allPassed: !!impl.allPassed,
      results: impl.results || [],
      verdict: impl.allPassed ? 'verified' : 'failed',
    };
    if (impl.allPassed) break;
    continue;
  }

  phase('Verify');
  const verify = await agent(
    `Independently verify unit "${unit.id}". Check out branch "${impl.branch}" in a fresh worktree (do not trust any prior agent's report). Run these command(s) from repo root and report each exit code exactly:\n  ${commandList}\n\nSet allPassed true ONLY if every command exits 0.`,
    { schema: VERDICT_SCHEMA, label: `verify:${unit.id}#${attempt}`, phase: 'Verify' },
  );

  const passed = !!(verify && verify.allPassed);
  result = {
    unit: unit.id,
    attempt,
    branch: impl.branch,
    isolationVerified: !!impl.isolationVerified,
    allPassed: passed,
    results: (verify && verify.results) || impl.results || [],
    verdict: passed ? 'verified' : 'failed',
  };
  if (passed) break;
}

// The runner returns a verdict; it deliberately does NOT mutate
// orchestration.json itself. The operator (or a thin wrapper) records the
// transition with `node scripts/loop/loop-cli.mjs done|park <id>` after an
// independent confirmation — keeping the state write in the tested Node layer.
log(
  `hds-loop: unit ${unit.id} → ${result ? result.verdict : 'no-result'} after ${attempt} attempt(s).`,
);
return {
  unit: unit.id,
  attempts: attempt,
  verdict: result ? result.verdict : 'no-result',
  recommendedTransition: result && result.verdict === 'verified' ? 'done' : 'parked',
  detail: result,
};
