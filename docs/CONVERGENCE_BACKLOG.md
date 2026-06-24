# HDS Convergence — Recap & Persistent Backlog

> Living doc for the design-system convergence effort. Tracks what shipped and
> the ranked backlog so any session (human or agent) can pick up where we left
> off. Branch: `claude/new-session-g1fhi2`.

## Direction (decided)

- **Bespoke vs. MUI → two-tier hybrid.** Keep token-driven primitives on CVA
  (brand control, multi-tenant, cohesion); adopt MUI X only for the
  complex/commodity tier (DataGrid, pickers) themed from your tokens.
- **Storybook + Chromatic → yes, scoped + single-sourced** from
  `component-api.json` so it stays a demo/CI-visual layer, not a 2nd docs system.
- **Consistency is solved by constraint, not by switching libraries** — CVA
  variants + guardrails, applied to the primitives you already own.

## Shipped (committed + pushed)

- ✅ **#1 Decommission plan** — `docs/guardrails/DECOMMISSION_PLAN.md`, 63 → ~49 gates in ranked waves.
- ✅ **#3 Alert vocab** — `variant`→`tone`, `error`→`danger` (matches Badge/Card/Callout).
- ✅ **#4 isDark removed** — dead deprecated prop gone from Button/IconButton + call sites.
- ✅ **#5 IconButton defaults** — inherits Button's cva defaults instead of shadow-declaring.
- ✅ **#6 SegmentedControl size** — `default/compact` → the `sm/md/lg` ramp.
- ✅ **#8 Icon `forwardRef`** — Icon was the only primitive without ref; Alert ref verified.
- ✅ **#13 `check-prop-vocabulary` gate** — closed-loop guard for tone/size vocab; proof-of-firing fixtures.
- ✅ **#17 Codemod infra** — jscodeshift + `pnpm codemod` + 3 codemods, each tied to a Changeset.
- ✅ **#20 Controlled-only contract** — documented in `docs/rules/REACT_COMPONENTS.md`.
- ✅ **#23 Telemetry churn fixed** — manifest stable-write + firing-stats off the per-commit path.

## Backlog (persistent, ranked by gate)

### 🔴 Needs CI / `test:layout` (rendering-affecting — validate where a browser runs)

- **#9 CVA convergence sweep** _(the main event)_ — propagate the Button CVA pattern to drifted primitives (badge spike done). Blocked by #2.
- **#7 Card diet** — drop `noPadding` + legacy `padding`/`gap`; needs codemod + test:layout.
- **#10 Canonical escape-hatch policy** — `className` everywhere, **no `style` passthrough** on primitives, `{...rest}` on the leaf only; remove `style` from Card/Surface/Callout/Icon.
- **#11 Polymorphism → `asChild`/Slot** — converge Badge → Card → Surface (Surface = 36 sites, codemod it).
- **#2 Semantic Tailwind feedback utils** — `bg-/text-feedback-*` mapped to `--semantic-color-feedback-*`; unblocks #9 (kills arbitrary-value lint).
- **#14 Ratchet `check-style-discipline`** — zero-inline-style "converged set", append per migration. Blocked by #9.

### 🟡 Needs your nod (changes guardrail posture)

- **#16 Execute decommission plan** — ✅ Waves 1–2 done (2026-06-24): scrapped `check-code-connect` + `check-legacy-hds-vars`, downgraded 13 gates pre-commit→ci-pr (63→62 gates, pre-commit 47→32). Remaining: Waves 3–6 (merges, CVA-convergence retirements, ratchet retirements).

### 🟢 Additive infra / tooling (safe to do solo)

- **#12 `check-no-style-prop` gate** — type-level forbid of `style?:` on primitive interfaces. Blocked by #10.
- **#15 Deprecation lifecycle** — dev-only one-time `console.warn` + removal ledger + gate that fails when a `@deprecated` prop outlives its target version.
- **#18 Storybook + Chromatic** — scoped to primitives, stories generated from `component-api.json`; scaffolding already in `src/stories/`.

### 🔵 Larger mechanical / judgment

- **#21 Collapse isDark prop-drilling** — ~60 doc/lab components prop-drill `isDark` instead of consuming context/CSS-vars (same anti-pattern class as the badge). Codemod candidate.
- **#22 aria-label convention** — Tag/SegmentedControl/Token use camelCase `ariaLabel` vs the HDS `aria-label` norm. token.tsx is the complex one (3 sub-components thread it internally). Confirm direction (kebab vs camelCase) first.
- **#19 Consolidate prose-doc mirrors** — reduce overlapping sources (DESIGN.md vs DESIGN-HANDOFF.md; CLAUDE.md vs llms.txt) toward one machine-readable source + thin pointers.

### Discovered along the way

- Escape-hatch sprawl: `audit-ok` at 97 uses is the top mis-calibration signal — make `check-exemptions` require a gate-specific qualifier (folds into #16).
- API report tracks symbols, not prop-level members — removing a `@public` prop didn't flag (refine under #15).

## Immediate next decisions

1. Green-light **#16 Wave 1** (2 zero-risk gate scraps)?
2. Set up **#18 Storybook** next (portfolio value)?
3. Schedule **#9 CVA sweep** for a CI-backed run?
