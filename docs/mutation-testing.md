# Mutation testing

Coverage says a line ran. It does not say a test would fail if that line were
wrong. Mutation testing closes that gap: a tool rewrites the code one small
change at a time — a `>` becomes a `>=`, a condition becomes `false`, a return
value is emptied — and runs the tests after each change. If the tests fail,
the mutant was **killed**: the change was noticed. If they pass, the mutant
**survived**: the tests do not actually pin that behaviour, whatever the
coverage number says.

HDS runs this with StrykerJS, scoped to the files a change touches. It is a
review signal, not a gate.

## Run it

Node 22 or newer is required (Stryker v10 dropped Node 20). The package itself
supports older Node; this is a dev-only tool and nothing here ships.

```sh
pnpm install                     # once: installs the Stryker devDependencies
pnpm test:mutate -- --diff       # mutate the files this branch changes vs origin/main
pnpm test:mutate -- --diff --base main
pnpm test:mutate -- codemods/lib/semver.mjs   # mutate named files instead
pnpm test:mutate                 # same as --diff
```

Scope rules, enforced by `scripts/mutate.mjs`:

- Only pure-logic files are mutated: `.ts` / `.js` / `.mjs` / `.jsx` sources.
- Tests are never mutated — they are the judge, not the subject.
- `.tsx` UI components are out of scope: slow, and low signal per mutant.
- Generated output, `dist/`, and `docs-site/` are skipped.

The TypeScript checker discards mutants that do not type-check, so the report
is not padded with changes that could never compile. The Vitest runner uses
per-test coverage, so each mutant only runs the tests that cover it — a
typical diff finishes in minutes.

One run at a time on a shared machine. A mutation run is the test suite run
many times over; never run it alongside `ralph/gate.sh` or another full suite.
The config's timeouts are set generous for the same reason
(`dryRunTimeoutMinutes: 30`, `timeoutMS: 60000`): on a busy machine a slow
run is normal, and a timeout should mean a mutant looped, not that the box
was loaded. Mutation runs also use `vitest.stryker.config.ts`, which is the
base Vitest config with only `testTimeout` raised (20s to 120s): inside the
sandbox, with coverage instrumentation, the child-process CLI tests time out
for speed, not correctness — the dry run fails on them first.

## Read the report

The run writes two files under `reports/mutation/` (gitignored):

- `index.html` — the readable report, one page per mutated file.
- `mutation.json` — the same data, machine-readable.

The terminal summary after a run gives the headline: the mutation score for
the scoped files and every surviving mutant.

- **Mutation score** = mutants killed or timed out, divided by all mutants the
  tests could detect (survived + no coverage + killed + timed out).
- **Survived** — a real hole. The code changed and no test noticed. The fix is
  a test that fails on that change, or a judgement call that the behaviour
  genuinely does not matter — say which, in the review.
- **No coverage** — the line never runs in tests at all. Worse than a
  survivor: there is nothing to strengthen until a test reaches it.
- **Killed / timeout** — the tests did their job. A timeout counts as killed:
  the mutant most likely sent the code into a loop the tests caught.

Worked example, from the first run — this setup's own PR, scoped by `--diff`
to `scripts/mutate.mjs` itself: 277 mutants, mutation score 51.3% (142 killed
or timed out, 135 not detected). The survivors were mostly fair: the
wrapper's unit tests pin its pure helpers, not its process-running paths, and
several exclusion rules overlapped so one rule's change hid behind another.
The test file now isolates each rule — which is the loop this tool exists to
create: run, read survivors, strengthen the named test. The full summary is
pasted into that PR.

One cost worth knowing: a file's run is only as fast as its covering tests.
`codemods/lib/semver.mjs` is covered partly by CLI suites that scan the whole
repo as child processes; its dry run takes minutes and needed the raised
timeouts above. A typical component-logic diff, covered by unit tests, is far
quicker per mutant.

## What it is not

- **Not a gate.** No score threshold fails a build (`thresholds.break` is
  `null` in `stryker.config.json`), nothing runs in the pre-push hook, and a
  low score blocks nothing. Revisit gating only after a few real PRs of data.
- **Not a whole-repo run.** Whole-repo mutation runs take hours and drown the
  signal. Diff scope is the point: the score judges the code a PR changes.
- **Not a coverage replacement.** Coverage finds code no test reaches;
  mutation finds tests that assert nothing. Read both.

Configuration lives in `stryker.config.json`; the wrapper, its scope rules and
the report summary live in `scripts/mutate.mjs`. The checker runs against
`tsconfig.stryker.json`, not the base config: the base program fails on the
repo's test and Figma files (excluded from the real typecheck, and written
against Node globals the base config does not provide), while the dedicated
config mirrors the typecheck exclusions and adds the mutate scope's JS.
