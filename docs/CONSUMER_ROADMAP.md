# HDS Consumer & Scale Roadmap

Single source of truth for making `@hirobius/design-system` consumable across
products and stacks. Reconciles four consumer documents (feedback #1 issues +
P1–P4, feedback #2 brand-seed algorithm, feedback #3 multi-stack RFC, and the
v0.5.0 architecture assessment) with the in-repo security pass and cruft
inventory.

> Distinct from `docs/guardrails/HARDENING_ROADMAP.md` (internal guardrail
> strength). This doc is **outward-facing**: consumer DX, multi-stack, branding,
> and the agentic surface.

**Legend** — Status: ✅ done · 🟡 todo · ⛔ blocked (external) · ◐ partial.
Priority: **P0** = gates onboarding any new product · P1 = high leverage · P2 = polish.
Sandbox: ✓ = validatable node-only in the current env · ✗ = needs `node_modules`/full build.

---

## WS-A — Packaging & Consumer DX  *(P0: gates every new product)*

| ID | Task | Source | Pri | Status | Sandbox |
|----|------|--------|-----|--------|---------|
| A1 | Emit & ship `dist/index.d.ts`; point `types`/`exports.*.types` there | #1, assess[High] | P0 | 🟡 | ✗ |
| A2 | Split preflight → **vars-only `tokens.css`**; utilities/reset opt-in (`styles.css`) | #3, RFC-T1, assess[High] | P0 | 🟡 | ✗ |
| A3 | Move router-coupled components to a subpath (`/router`); keep primitives router-free | #2, assess[High] | P0 | 🟡 | ✗ |
| A4 | Tier the `exports` (primitives/patterns/templates); stop exporting doc-shell from the barrel | #4, assess[Med] | P1 | 🟡 | ✗ |
| A5 | Ship `CONSUMING.md` inside the package (`files`) + fix stale version | #5 | P0 | ✅ `8b11a83` | — |
| A6 | Drop `engines.pnpm` (keep `packageManager`) | #10 | P2 | ✅ `8b11a83` | — |
| A7 | Tighten `files` so doc-shell/full source stops shipping to consumers | cruft-T3, assess | P1 | 🟡 | ✓ |

## WS-B — Brand theming at product scale

| ID | Task | Source | Pri | Status | Sandbox |
|----|------|--------|-----|--------|---------|
| B1 | Document `--semantic-accent-*` override contract + jade example + "don't invert" anti-pattern | P1, #2 | P0 | ✅ `8b11a83` | — |
| B2 | `createBrandTheme({hue,chroma})` — derive ramp at the **system's** lightness targets (per-hue contrast solve) | P2, #2 | P1 | 🟡 | ✓ |
| B3 | Contrast-safe on-accent ink — auto black/white from resolved accent lightness | P4, #2 | P1 | 🟡 | ✓ |
| B4 | Rename accent ramp off `blue` (`--primitive-color-accent-*`); keep `blue` as a literal palette | P3, assess | P1 | 🟡 | ✗ |
| B5 | Normalize accent ramp to oklch (`blue.500` is hex) | #9, assess[Low] | P2 | 🟡 | ✓ |
| B6 | Decouple `feedback.info` from the brand hue | #7, assess[Med] | P1 | 🟡 | ✓ |

> Sequencing: B4 → B5/B6 → B2 → B3 (rename once; oklch + info before deriving; ink last).

## WS-C — Multi-stack token pipeline (Style Dictionary)

| ID | Task | Source | Pri | Status | Sandbox |
|----|------|--------|-----|--------|---------|
| C1 | SD multi-format emitter (CSS/SCSS/JS/JSON/RN), live parity-gated | RFC-T1, assess | P1 | ✅ `2be1d8b` | ✓ |
| C2 | **MUI preset** `hdsMuiThemeOptions()` consuming the literal tree | RFC-T2, assess | P1 | ✅ `c70f532`⁶ | ✓¹ |
| C3 | **Native targets: iOS (Swift) + Android (XML resources)** + RN production-ready (hex not oklch) | RFC-T1, **user ask** | P2 | ✅ `0155bb2`⁴ | ✓ |
| C4 | Color-space + dimension transforms: `oklch→hex/rgb`, `px→dp`, durations→ms, resolve aliases | RFC, assess ("var() everywhere") | P1 | ✅ `0155bb2` | ✓ |
| C5 | Phase-2 composites in SD: typography/motion/elevation/shadow expansion | RFC, SD-POC gaps | P2 | 🟡 | ✓ |
| C6 | Real mode model — DTCG `$modes`/theme files; retire the Figma-extension dark-mode hack | assess | P1 | 🟡 | ✗² |
| C7 | Native DTCG ingestion — SD reads canonical `$value` directly (confirm ownership of the `usesDtcg`→0-tokens issue) | assess[Med] | P2 | 🟡 | ✓ |
| C8 | Fully **generate** the `hds` JS bridge (kill hand-maintenance / mixed shapes) | assess, prior | P1 | 🟡 | ✗² |
| C9 | Resolved-**literal** targets (`tokens.literal.css/js`) for color-math frameworks | assess | P2 | ✅ `c70f532`⁶ | ✓ |
| C10 | **Rails / ViewComponent interop** — token CSS/SCSS into the asset pipeline; ERB/ViewComponents consume the vars (`docs/integrations/RAILS.md`). Rationale: Rails-heavy employer target (Two Barrels) | Rails Q | P2 | ✅ `d97cc5f`⁵ | ✓⁵ |
| C11 | **Web Components** — compile primitives to framework-agnostic custom elements, themed by the same vars. The true write-once path; serves **Rails, Vue, Svelte, plain HTML** with no React | RFC-T3 | P2 | 🟡 | ✗ |
| C12 | **Headless behavior split** — expose the Radix behavior contracts separately so non-Tailwind *React* styling can reuse behavior | RFC-T3 | P2 | 🟡 | ✗ |
| C13 | Framework presets — **Tailwind v3 done** (`presets/tailwind.mjs`); Vue, vanilla-extract, Panda/StyleX remain | RFC-T2 | P2 | ◐ `c70f532` | ✓¹ |

¹ logic validatable node-only; full verification wants the consuming build.
² touches the canonical generator + repo guardrails → needs full build.
³ partially delivered by C1's RN/resolved target + the MUI preset path.
⁴ light-mode values only until the DTCG mode model (C6); vivid out-of-sRGB stops are gamut-clamped.
⁶ light-mode only until C6; preset returns a plain options object (validated by shape, not against a live `@mui createTheme`).
⁵ token consumption works node-only; depends on A2 (vars-only CSS) so Rails apps don't inherit the Tailwind preflight. Components are either re-implemented as ViewComponents (no React) or mounted as React islands via vite_rails / Inertia.

> **Multi-stack reach summary.** Tokens (C1/C4) travel everywhere today. Per-stack
> component strategy: React+Tailwind = native HDS · MUI/other-React = presets
> (C2/C13) · Rails = ViewComponents over tokens, or React islands (C10) ·
> Vue/Svelte/plain-HTML/Rails-without-React = Web Components (C11). Behavior
> (Radix) is React-only unless C11/C12 land.

## WS-D — Token correctness

| ID | Task | Source | Pri | Status | Sandbox |
|----|------|--------|-----|--------|---------|
| D1 | Collapse tenant drift to one seam; generate `tenants.ts` + `tenants.css` from `tenants/*/tokens.json` | #6, assess[Med] | P1 | 🟡 | ✓ |

*(info-hue and oklch normalization tracked as B6/B5.)*

## WS-E — Agentic productization  *(the differentiator)*

| ID | Task | Source | Pri | Status | Sandbox |
|----|------|--------|-----|--------|---------|
| E1 | Ship manifest + `component-api.json` + `llms.txt` + Code Connect as **documented** package surfaces | assess | P1 | 🟡 | ✓ |
| E2 | Machine-readable **consumer recipes** (per-component usage for agents) | assess | P2 | 🟡 | ✓ |
| E3 | Generate framework bindings from the manifest | assess | P2 | 🟡 | ✗ |

## WS-F — Security hardening (dev bridges; not shipped, no leaks found)

| ID | Task | Source | Pri | Status | Sandbox |
|----|------|--------|-----|--------|---------|
| F1 | Bind `hds-bridge` to `127.0.0.1` | sec H1 | P1 | ✅ `4aeaae7` | ✓ |
| F2 | Scope CORS to localhost on both bridges (origin-less clients still allowed) | sec H2 | P1 | ✅ `4aeaae7`⁷ | ✓ |
| F3 | Replace `new Function()` eval of `templates.js` | sec M1 | P2 | 🟡 | ✓ |
| F4 | Hash-check plugin-fetched scripts before eval | sec M2 | P2 | 🟡 | ✓ |
| F5 | Auth/loopback guard on `/update-manifest` | sec M3 | P2 | 🟡 | ✓ |
| F6 | De-shape the `ghp_…` doc placeholder so scanners don't flag it | sec L2 | P2 | ✅ `4aeaae7` | ✓ |
| F7 | `/pending-ids` exposure | sec L3 | P2 | ✅ mitigated by F1⁷ | — |

*(#8 install advisories — resolved: `pnpm audit --prod` is clean; vulns are dev-only.)*
*(⁷ F2 uses a plugin-safe origin allow-list but is not runtime-tested against the live Figma plugin here. F7: guard left as-is — inverting it would break the dev diagnostic since the bridge runs with `NODE_ENV` unset; F1's loopback bind removes its network exposure.)*

## WS-G — Repo cleanup / lean published artifact

| ID | Task | Source | Pri | Status | Sandbox |
|----|------|--------|-----|--------|---------|
| G1 | Tier-1 cruft deletes (~39 MB archive + dead scripts/docs) | cruft-T1 | P1 | ✅ `0efc4728` | — |
| G2 | Gitignore generated `sbom.json` (−4.3 MB) | cruft-T2 | P2 | ✅ `eb328a1` | — |
| G3 | Extract `apps/concrete` + `starter-kit` to own repos | cruft-T4 | P2 | 🟡 *(decision)* | — |
| G4 | Extract doc site + drop Three.js stack | cruft-T5 | P2 | 🟡 *(decision)* | — |
| G5 | Make the published package a lean core (overlaps A4/A7) | assess | P1 | 🟡 | ✓ |

## WS-I — Accessibility conformance & portfolio visibility

Distilled from a portfolio-gap review. **Already enforced internally** (don't
rebuild): axe-core in CI (`.github/workflows/a11y.yml`), visual regression
(`visual.yml`), Lighthouse/CWV budgets (`perf.yml`), and the
`check:contrast`/`check:focus`/`check:motion` validators. The real gaps are
per-component documentation, screen-reader proof, and visibility.

| ID | Task | Source | Pri | Status | Sandbox |
|----|------|--------|-----|--------|---------|
| I1 | Per-component **WCAG 2.2 AA conformance** docs (criteria, ARIA pattern, keyboard map, focus mgmt) — `docs/accessibility/CONFORMANCE.md` | portfolio | P1 | ◐ scaffold + Button example | ✓ |
| I2 | **Screen-reader test notes** per component (NVDA/JAWS/VoiceOver), written into the conformance record | portfolio | P1 | 🟡 | ✗ (manual SR pass) |
| I3 | Bump axe target **WCAG 2.1 → 2.2 AA** in `tests/a11y.spec.ts` | portfolio | P2 | 🟡 | ✗ (needs build to run) |
| I4 | Public **Storybook + a11y addon**, deployed (visibility) | portfolio | P1 | 🟡 *(decision/build)* | ✗ |
| I5 | Surface a11y/visual/perf **CI badges** in README (once repo is public) | portfolio | P2 | 🟡 *(repo-public dep)* | ✓ |
| I6 | **Context-framing** convention per artifact (problem / orient / tradeoff / a11y note) — `docs/accessibility/CONFORMANCE.md` §4 | portfolio | P1 | ◐ doc | ✓ |

*Framework-agnostic sample (Angular/Web Components) = **C11**. Excluded as
non-repo / personal: making the repo public, CPACC credential, AI-demo deploy,
resume positioning — these are your calls, not DS tasks.*

## WS-H — Housekeeping

| ID | Task | Source | Pri | Status |
|----|------|--------|-----|--------|
| H1 | Commit signing — env signing key is an empty file; commits are correctly authored but unsigned/unpushed | env | — | ⛔ needs key provisioned outside sandbox |

---

## Recommended execution order

1. **P0 packaging unlocks (WS-A):** A1 `.d.ts` · A2 vars-only CSS · A3 router subpath · A4/A7 tier exports. *Gates every new product; needs a build env.*
2. **Brand at scale (WS-B):** B4 rename → B5/B6 oklch + info → B2 seed API → B3 ink.
3. **Multi-stack (WS-C):** C2 MUI preset → C4 color-space transform → C3 iOS/Android/RN → C5/C6/C7/C8 pipeline depth.
4. **Moat (WS-E)** + **correctness (WS-D)** + **security (WS-F)** in parallel where independent.
5. **Lean artifact (WS-G):** G3/G4 are architectural — confirm intent before extracting.

## What this sandbox can do now (no `node_modules`)
Node-only/validatable here: **B2, B3, B5, B6, C5, C7, D1, E1, E2, F3–F5**.
Needs a full build env (deferred): A1–A4, B4, C6, C8, C11, C12, E3.

## Caveats & follow-ups ledger

Carry-forward caveats on everything shipped so far — none are blockers, but each
wants a real build/runtime pass before "production."

- **No full-build validation in-session.** `node_modules` isn't installed in the
  work sandbox, so `typecheck` / `test:layout` / `vite` / the full guardrail
  suite could not run. All token/preset/security work was validated **node-only**
  (the token gates, preset shape checks, and `node --check` parsing). Re-run
  `pnpm typecheck && pnpm test:layout && pnpm check:tokens-sd && pnpm
  check:tokens-presets` in a full env before release.
- **Style Dictionary dep.** `style-dictionary` is already a devDependency; the
  in-sandbox runs used an isolated install symlinked into `node_modules`. A
  normal `pnpm install` covers it — no action needed.
- **Native + literal + MUI targets are light-mode only.** Dark values await the
  DTCG mode model (**C6**). Until then, RN/iOS/Android/`tokens.literal.*`/the MUI
  preset emit the light theme.
- **Native colour gamut-clamping.** 17 vivid out-of-sRGB accent stops are
  channel-clamped (hue shifts slightly); a chroma-reduction pass is the faithful
  follow-up. Flagged inline in the Swift/XML output.
- **MUI preset** returns a plain `ThemeOptions` object validated by **shape**,
  not against a live `@mui` `createTheme()` (MUI isn't a repo dep).
- **Tailwind preset** not verified against a real Tailwind v3 build.
- **Rails (C10):** the token path is real; vendor `tokens.vars.css` until **A2**
  ships a vars-only entry from the npm package. Component behavior (Radix) needs
  Stimulus or **C11**.
- **Security F2 (CORS)** uses a plugin-safe origin allow-list but wasn't
  runtime-tested against the live Figma plugin; **F7** intentionally left as-is.
- **Commits unsigned/unpushed** — env signing key is empty (**H1**).
- **Cleanup remainder:** Tier-3 (`files` tighten / lean surface, **A7/G5**) is
  build-gated; Tier-4/5 extractions (**G3/G4**) are decision-gated; a few small
  dead files (`morph-card.tsx`, `BACKLOG/DECISIONS/PROCESS.md`) were left
  untouched — further deletes need a go-ahead + a sonnet sub-agent per CLAUDE.md.

## Done this session
A5, A6, B1 (`8b11a83`) · C1 (`2be1d8b`) · C3, C4 (`0155bb2`) · C2, C9, C13 (`c70f532`) · C10 (`d97cc5f`) · F1, F2, F6, F7 (`4aeaae7`) · G1 (`0efc4728`) · G2 (`eb328a1`) · I1, I6 scaffolded (`docs/accessibility/CONFORMANCE.md`).
