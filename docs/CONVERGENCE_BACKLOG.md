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

- ✅ **#9 CVA convergence sweep** _(the main event)_ — **substantially complete.** Tone/variant-driven primitives now on the Button CVA pattern: `button`, `input` (pre-existing) + `badge`, `surface`, `alert`, `callout` (this effort). Surface conversion also fixed a real bug (forced-theme no-op, #24); `controls.tsx` had the same dead `isDark` branch (both refs → same var) — removed, dropping the last `useTheme` JS-branch from the primitive tier (only `page-footer` keeps `useTheme`, legitimately, for `toggleDark`). Each change verified locally via the `story-render` jsdom gate (108/108) + Playwright screenshots (Chromium pre-installed). **Deliberately NOT CVA (documented):** `segmented-control` + the `controls.tsx` sub-controls are irreducible active×hover×pressed×disabled state matrices (existing `inline-ok` rationale — CVA compoundVariants would be net-negative); layout primitives (`stack`/`grid`/`container`/`divider`/`text`/`icon`/`table`/`disclosure`/`tooltip`) compute styles from continuous props; `tag` keeps colors in `theme.css` so `:hover` works. Unblocked by #2.
- **#7 Card diet** — drop `noPadding` + legacy `padding`/`gap`; needs codemod + test:layout.
- ✅ **#10 Escape-hatch policy** — **className is the sanctioned escape hatch.** Non-interactive feedback primitives (`Badge`, `Alert`, `Callout`) are now className-only (`Omit<…HTMLAttributes…, 'style'>`, no `style` prop). Policy documented in `docs/rules/REACT_COMPONENTS.md`. **Scoped-down from the original "remove style from Surface/Icon too":** data showed Surface's ~38 `style` sites + Icon's ~13 are predominantly _legitimate layout/transform_ (margin/position/width, icon rotation) the component doesn't govern — and one Surface site (the slider track in `controls.tsx`) deliberately overrides `background`. Blanket removal would break ~34 layout sites + the slider to close ~4 leaks; net-negative. So interactive/layout primitives keep `style` (one-off visual + layout), gated against governed-prop overrides by convention + #14.
- **#11 Polymorphism → `asChild`/Slot** — converge Badge → Card → Surface (Surface = 36 sites, codemod it).
- **#2 Semantic Tailwind feedback utils** — `bg-/text-feedback-*` mapped to `--semantic-color-feedback-*`; unblocks #9 (kills arbitrary-value lint).
- ✅ **#14 Ratchet `check-style-discipline`** — new `converged-inline-style` sub-rule: the CONVERGED_SET (`button`/`input`/`badge`/`surface`/`callout`) must carry zero own `style={{…}}` literals (caller-style passthrough `style={var}` allowed). Append a component as it converges. `alert` is tone-converged but still spreads typography tokens inline (title/body spans) — joins the set once that moves to `<Text>`.

### 🟡 Needs your nod (changes guardrail posture)

- **#16 Execute decommission plan** — ✅ Waves 1–2 done (2026-06-24): scrapped `check-code-connect` + `check-legacy-hds-vars`, downgraded 13 gates pre-commit→ci-pr (63→62 gates, pre-commit 47→32). Remaining: Waves 3–6 (merges, CVA-convergence retirements, ratchet retirements).

### 🟢 Additive infra / tooling (safe to do solo)

- ✅ **#12 `check-no-style-prop` gate** — registered guardrail (pre-commit, `fixtures/check-no-style-prop/`): asserts `Badge`/`Alert`/`Callout` expose no `style` (no explicit member; HTMLAttributes extensions must `Omit 'style'`). `// style-prop-ok: <reason>` to exempt.
- ✅ **#15 Deprecation lifecycle** (2026-06-24): `check-deprecations` gate (every `@deprecated` JSDoc must carry a future `@removeIn <semver>`; fails past-due) + `warnOnce` dev runtime util (`src/lib/deprecation.ts`). Deprecations tracked in-code (single source of truth, no separate ledger). Ready for the first real deprecation (e.g. #7's Card props).
- ✅ **#18 Storybook activated** (2026-06-24): SB8 deps installed; 20 primitive stories build clean (a11y/axe bundled); autodocs single-sources prop tables from the TS interfaces (no drift). `pnpm storybook` / `pnpm build-storybook`. **Chromatic published** (`CHROMATIC_PROJECT_TOKEN` secret set, project linked, `.github/workflows/chromatic.yml` runs on dispatch). First Chromatic build flagged **2 component errors** → diagnosed locally (sandbox can't reach chromatic.com) via a new jsdom story-render gate: both were `FoundationSwatch` stories with a `tokenPath`, which render `<Token>` → `useNavigate()`/`useLocation()` and threw because the SB preview had no Router. **Fixed**: added a `MemoryRouter` decorator to `.storybook/preview.tsx` (mirrors the app shell). **Guarded**: `src/stories/story-render.spec.tsx` renders every story export through jsdom in `pnpm test` and fails on any render throw — catches this whole class of Chromatic "component error" without a browser/network. (Badge CVA conversion confirmed clean.)

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
