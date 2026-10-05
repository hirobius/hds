# Frozen test conditions: AI-ready before/after

The "before" (baseline) and "after" runs of the AI-ready work use exactly these
conditions. Change nothing here between the two runs. If a condition has to
change, record a new baseline under the new conditions first.

Frozen 2026-10-05, on `main` at `6f0be12`.

## The screen

`specs/client-detail.md`, unchanged, **except** its "Allowed inputs" section.
Each generator receives the spec as `SPEC.md` in its workspace, with that
section replaced by the arm's block below. Everything else in the spec (the
screen, the output contract, the accessibility rules) is identical in both arms.

## The two arms

### Baseline arm: installed package only

```text
## Allowed inputs

Read only files inside your workspace. The design system is installed at
`node_modules/@hirobius/design-system/`; anything the package ships is allowed
(its docs, manifest, component API data and `.d.ts` files). Nothing else.
```

The published package already ships `llms.txt`, `public/llms.txt`,
`DESIGN.md`, `CONSUMING.md`, `docs/CONSUMING.md`, `public/hds-manifest.json`,
`src/app/data/component-api.json` and the `.d.ts` files (`package.json`
`files`). The baseline therefore includes whatever those files say at the
packed commit, and nothing written for this project.

### After arm: package plus agent tooling

```text
## Allowed inputs

Read only files inside your workspace. The design system is installed at
`node_modules/@hirobius/design-system/`; anything the package ships is allowed.
Also read `node_modules/@hirobius/design-system/AGENTS.md` and `llms.txt`
first. Use the `hds` MCP server (tools to look up tokens and component APIs).
Before you finish, your code must pass the `@hirobius/eslint-plugin-hds`
`recommended` rules.
```

The after arm adds exactly four things: `AGENTS.md`, the regenerated
`llms.txt`, the lint plugin, and the `hds-mcp` server. Anything else that
changes in the package between the runs (component fixes, spec data) is part
of what is being measured and is listed in the "after" ledger entry's notes.

## Generators (agents and models)

Three generators per arm, one app each, each in a fresh context with no memory
of the others:

| App id suffix | Agent                | Model (configured)          |
| ------------- | -------------------- | --------------------------- |
| `sonnet`      | Claude Code subagent | `claude-sonnet-5-5`         |
| `opus`        | Claude Code subagent | `claude-opus-5-5`           |
| `haiku`       | Claude Code subagent | `claude-haiku-4-5-20251001` |

App ids are `base-<suffix>` for the baseline and `after-<suffix>` for the after
run. The model a subagent actually runs on can differ from the configured one
(a runtime fallback); the run notes record any fallback that was reported.

Each generator works in its own directory outside the repository, holding only:
a copy of `template/`, the packed tarball extracted to
`node_modules/@hirobius/design-system/`, and `SPEC.md`.

## Prompt (verbatim, `<WS>` = the workspace path)

> You are building one screen with the React design system
> `@hirobius/design-system`. Your workspace is `<WS>`. Read `<WS>/SPEC.md` and
> build the screen it describes, using only the inputs its "Allowed inputs"
> section allows. Read and write files only inside `<WS>`. Do not run shell
> commands and do not use the web. Write the app under `<WS>/src/` with
> `App.tsx` as the entry; do not edit `<WS>/src/main.tsx` or `<WS>/index.html`.
> When you are done, reply with the list of files you wrote.

The after arm uses the same prompt; the extra inputs come only from its
"Allowed inputs" block and the MCP server being attached.

Known limit: "no shell, no web, workspace only" is enforced by the prompt, not by
a sandbox. Generators that break it are noted in the run notes.

## Scoring

`pnpm eval:consistency -- --apps eval/consistency/runs/<date>`, full run (no
`--offline`, no `--skip-build`), on a clean tree. The five thresholds are the
ones in `ledger.json`, unchanged:

| Measure                                              | Threshold |
| ---------------------------------------------------- | --------- |
| Builds and type-checks on first try                  | 3 of 3    |
| Raw hex, px, Tailwind, raw HTML controls, custom CSS | 0         |
| axe serious and critical, light and dark             | 0         |
| Component-set Jaccard, every pair (minimum)          | >= 0.85   |
| Pixel diff at 1280 wide, light, every pair (maximum) | <= 1.5%   |

"First try" means the app exactly as the generator delivered it: no edits, no
reruns, no second attempt. The generated `src/` of every app is committed under
`runs/<date>/` with the ledger entry it backs.
