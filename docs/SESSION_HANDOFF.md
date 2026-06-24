# HDS Session Handoff — branch `claude/new-session-5d606i`

Bundle for spinning off side threads. Each backlog item carries its roadmap ID
(`docs/CONSUMER_ROADMAP.md`) so a fresh session can pick it up cold. Status as of
the Chromatic-green commit `57bca80`.

---

## Live state (what's running right now)

| Thing | State |
|---|---|
| Working branch | `claude/new-session-5d606i` (all session work, local + pushed) |
| Storybook (hosted) | **https://6a3b134639a5ff0f5bbead49-drskbxbdwi.chromatic.com/** (build 2) |
| Chromatic library (always-latest) | https://www.chromatic.com/library?appId=6a3b134639a5ff0f5bbead49 |
| Chromatic CI | ✅ green — `.github/workflows/chromatic.yml`, `exitOnceUploaded`, fires on push to main + this branch |
| Storybook coverage | 48/48 components, 228 stories, **0 render errors** |
| Figma link | Storybook URL ready to paste into **Storybook Connect** / **story.to.design** (not yet wired) |
| Build validation | `pnpm typecheck` ✅ · Storybook build ✅ · headless story scan ✅ |

---

## Shipped this session (most recent first)

| Commit | What |
|---|---|
| `57bca80` | manifest resync after story scaffolding |
| `85ac129` | **CI green** — Router-wrap 2 erroring swatch stories + `exitOnceUploaded` |
| `b91318b`,`29bc5ec` | Chromatic publish workflow — hosted Storybook for Figma |
| `618c05f` | **Button re-skin fix** — brand override now includes the role tier (`--role-*`) |
| `6ba8478` | scaffold 29 stories → full 48/48 component coverage |
| `d3f9a19` | **K1** — tokenize shadows (`semantic.shadow.*`); oklch-aware CSS-integrity check |
| `b4175a1` | **J3** — `--hds-space-unit` knob rescales macro layout rhythm |
| `393b12b` | **B5** — normalize `blue.500` to oklch (uniform accent ramp) |
| `aa31bd5` | **B6** — `feedback.info` → own cyan ramp (AA) + contrast guardrail |
| `411431c` | **J2** — font & spacing override contracts in `CONSUMING.md` |
| `d45990b` | **E1/E2/I1** — agentic surfaces doc, consumer recipes, WCAG conformance |
| earlier | A5/A6/B1/B2/B3, C1–C5/C7/C9/C10/C13, D1, F1/F2/F6/F7, G1/G2 (see roadmap §"Done this session") |

---

## Backlog — grouped for side-threading

Each group is independently ownable. ✗ = needs a full build env (`node_modules`);
✓ = node-only validatable. Roadmap IDs in brackets.

### Thread 1 — Figma round-trip *(natural next step; some node-only)*
- Wire the hosted Storybook into **Storybook Connect** + **story.to.design** in Figma.
- **Code Connect** mappings (Figma MCP `add_code_connect_map`) — link Figma components ↔ `src/app/components/*`.
- Import HDS tokens as **Figma Variables** (the `3YibeH2cfgEwVSnsV96ryQ` file thread).
- Tenant role-tier gap — same `--role-*` fix as `618c05f` but for `tenants.css` (branding won't fully re-skin Tailwind-classed components yet). ✓

### Thread 2 — Packaging P0 (gates every new consumer) ✗ *[WS-A]*
- A1 ship `dist/index.d.ts` · A2 split vars-only `tokens.css` from utilities · A3 router-coupled components to `/router` subpath · A4/A7 tier `exports`, stop shipping doc-shell · G5 lean published core.

### Thread 3 — Brand/token depth *[WS-B / WS-C]*
- B4 rename accent ramp off `blue` → `--primitive-color-accent-*` ✗
- **C6 real dark-mode model** — DTCG `$modes`, retire the Figma-extension hack (unblocks native/literal/MUI dark values) ✗
- C8 fully generate the `hds` JS bridge ✗ · C11 Web Components (Rails/Vue/Svelte) ✗ · C12 headless behavior split ✗

### Thread 4 — Modernization / drift ✗ *[WS-K, `docs/MODERNIZATION.md`]*
- K2 tier validator pipeline (fast pre-commit / full CI / nightly) ✓
- K3 styling convergence **decision** — inline `hds` bridge (46) vs CVA+Tailwind (2)
- K5 retire `--hds-*` legacy aliases · K6 delete dead JS dark path + add `surface-neutral-subtle` · K7 `SegmentedControl` JS-hover → CSS classes · K8 collapse `typeStyles` 24→8.

### Thread 5 — A11y visibility *[WS-I]*
- I2 screen-reader test notes (NVDA/JAWS/VoiceOver) · I3 bump axe 2.1→2.2 AA · I5 CI badges (repo-public dep).

### Thread 6 — Cleanup / extraction (decision-gated) *[WS-G]*
- G3 extract `apps/concrete` + `starter-kit` to own repos · G4 extract doc site + drop Three.js. Both need your go-ahead; CLAUDE.md requires a **sonnet** sub-agent for deletions.

### Smaller / security *[WS-F]*
- F3 replace `new Function()` eval of `templates.js` · F4 hash-check plugin scripts · F5 auth guard on `/update-manifest`. All ✓ (surgical, dev-bridge only — nothing shipped, no leaks found).

---

## Carry-forward caveats (none blocking)
- **No full-build run this session** for build-gated items — re-run `pnpm typecheck && pnpm test:layout && pnpm check:tokens-sd` in a full env before release.
- Native/literal/MUI targets are **light-mode only** until C6.
- K1 shadows + theming changes want a **human visual eyeball** pass.
- Commits are **unsigned** (env signing key empty — H1) and pushed only to this branch.
