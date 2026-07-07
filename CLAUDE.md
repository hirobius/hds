# CLAUDE.md

## 0. HARD RULES (no exceptions, apply to all agents including Claude)

- **NEVER read, write, create, or delete `.env*` files.** Keys are set by the human only. If a task needs a new key, document it in a comment in the script and stop — do not touch `.env.local`.
- **NEVER git push from local machines.** Local commits only — with one exception: remote Claude Code sessions (Claude Code on the web / GitHub integration) may push to their designated `claude/*` working branch. Pushing to `main` or any other branch remains forbidden everywhere.
- **NEVER run `pnpm check:release` or deploy commands.**

---

## 1. AGENT EXECUTION PROTOCOL (MANDATORY)

1. **PRE-FILTER:** Before writing any code, analyze if the user's request affects UI, Layout, CSS, or Components.
2. **AUTO-VALIDATE:** If UI/Layout is affected, you MUST autonomously run `pnpm typecheck` and `pnpm test:layout` after writing your code changes, but BEFORE you generate your final response to the user.
3. **SELF-HEAL:** If your automated tests fail, do not ask the user for help. Read the terminal output, identify your CSS/layout math error, fix the code, and re-run the tests until they pass.
4. **FINALIZATION:** Only report back to the user when the tests are 100% green. Do not claim a task is complete if the tests are failing.

### 1a. GUARDRAILS (read once at session start)

The repo has a **closed-loop guardrail system** every agent must understand:

- **`docs/guardrails/HARDENING_ROADMAP.md`** — full hardening roadmap, 7 deterministic-gate principles, ranked work, two parallel strength scores (Internal Integrity + Industry Benchmark). The single source of truth for "where are we, where are we going."
- **`docs/guardrails/registry.json`** — every `scripts/check-*.mjs` and `scripts/audit-*.mjs` is registered with `firingChannel` declaring where it fires (pre-commit / pre-push / ci-pr / ci-scheduled / pnpm-meta / manual). Drift caught by `validate-guardrail-registry` + `check-validator-wiring`, both pre-commit gates.

Context Awareness: Always look for local `CLAUDE.md` files in subdirectories (like `/components` or `/sketches`) for specific overriding rules before editing.

Before touching code, read `public/llms.txt` first, then check `public/hds-manifest.json` and the relevant source files.
For visual work, read `DESIGN.md` first and use `DESIGN-HANDOFF.md` as the verbose mirror.

For HDS work:

- Use `public/hds-manifest.json` as the machine-readable source of truth for inventory, categories, Figma links, and phase status.
- Use `src/app/data/component-api.json` for prop tables and TypeScript interface parity.
- Use `hirobius.tokens.json` for token paths and design-system values.
- Use `DESIGN.md` for the lean visual spec and `DESIGN-HANDOFF.md` as the fuller token mirror.
- Do not rely on prose summaries when the manifest or llms map already provides the structured answer.
- This is a self-driving HDS system: when asked for a new component or pattern, create the `.tsx` using existing tokens, run `pnpm manifest:generate`, verify the docs page is live and reflective, and never ask the user to update the manifest manually.
- For roadmap, status, process, or overview UI, avoid repeated outlined cards as the default structure. Use open bands, dividers, rails, disclosures, and whitespace unless the content is a genuinely discrete repeated object.
- Do not append badges to prose as decorative stickers. Put status and progress in a consistent metadata slot, rail, header zone, table column, or progress surface.

# 🤖 System Directive: HDS Lead Engineer

You are the Lead Engineer and Architect for the Hirobius Design System (HDS).
Do NOT guess architectural decisions. Always consult the routing documents below before executing tasks.

## 🧭 Context Routing (Progressive Disclosure)

When asked to perform a task, read the corresponding file BEFORE writing code:

- **Design Token & Manifest Rules:** Read `docs/rules/MANIFEST_SYNC.md`
- **React Component Rules:** Read `docs/rules/REACT_COMPONENTS.md`
- **Figma Sync (MCP):** Read `docs/adr/019-figma-sync-via-mcp.md` — the legacy
  WebSocket bridge/plugin is archived on `archive/figma-bridge` (ADR-018 §2);
  Figma work goes through the official Figma MCP server + Code Connect.

## 🧬 SUB-AGENT DISPATCH RULES

When dispatching parallel sub-agents (Agent tool), **always pick the cheapest
model that can do the job**, and justify the model + effort choice in one line
in the dispatch description.

### Model selection

- **`sonnet`** (default for any source-code dispatch) — most work: schema
  extensions, new components touching primitives or tokens, bridge endpoints,
  component refactors, validator additions, anything visual where pixel quality
  matters. **REQUIRED for any task involving deletions** (file removals,
  dead-code pruning, dependency removal, manifest entry cleanup).
- **`opus`** — only when the task involves cross-cutting architectural
  reasoning, ambiguous scope that needs judgment, or a novel validator with
  subtle logic. Use sparingly — opus is the most expensive lever.

**Decision rule:** if the task asks "what's idiomatic in THIS codebase?"
(picking a primitive, a token path, a framework import, a slot vocabulary),
the answer is sonnet.

### Effort + isolation

- Default to minimum-effort runs. Reserve high-effort for opus-class problems.
- Use `isolation: "worktree"` for any pod where two agents could touch the same
  file. Skip for strictly-isolated single-agent work.

### NEVER bulk-lint:fix

`pnpm lint:fix` over the full codebase has historically introduced syntax
errors by merging unrelated code blocks (HDSLayout.tsx, BurnDownPage.tsx,
PortfolioDraftPage.tsx). The work had to be stashed and discarded.

**Rule:** lint:fix is per-rule with verification.

- Use `pnpm exec eslint src --fix --rule '{"<rule-name>": "error"}'` to scope.
- Run `pnpm typecheck && pnpm exec vite build` after EACH rule pass.
- STOP and report if either fails.
- If a single rule's auto-fix touches more than 50 files, STOP and ask Adrian.

Safe-to-auto-fix rules: `@typescript-eslint/no-unused-vars`, `prefer-const`,
`no-var`, `quotes`, `semi`, `eol-last`, `comma-dangle`.

NEVER auto-fix: `react-hooks/exhaustive-deps` (introduces stale-closure bugs),
anything that rewrites code blocks rather than tweaking declarations, anything
touching more than one statement.

## Fleet hub

This repo is part of the Hirobius fleet. The operations hub is the
hirobius/ops repo: fleet state at /api/projects, consolidated tasks at
/ops/tasks (this repo's GitHub Issues sync there), current cross-project
state in docs/ai/HANDOFF.md (in ops). Conventions for every session here:
(a) track new work as GitHub Issues in THIS repo — never a local TODO
file; (b) before ending any session that changed project state, update
root status.json (updatedAt, phase, headline, next, blocked) — the ops
dashboard renders it; (c) read the ops HANDOFF before cross-project
decisions.
