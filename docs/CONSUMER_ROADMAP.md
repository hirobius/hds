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
| C2 | **MUI preset** `createHdsMuiTheme(mode)` consuming `tokens.js` | RFC-T2, assess | P1 | 🟡 | ✓¹ |
| C3 | **Native targets: iOS (Swift) + Android (XML resources)** + make RN production-ready | RFC-T1, **user ask** | P2 | 🟡 | ✓¹ |
| C4 | Color-space + dimension transforms: `oklch→hex/rgb`, `px→pt/dp`, resolve aliases — **gates C3 & RN** | RFC, assess ("var() everywhere") | P1 | 🟡 | ✓ |
| C5 | Phase-2 composites in SD: typography/motion/elevation/shadow expansion | RFC, SD-POC gaps | P2 | 🟡 | ✓ |
| C6 | Real mode model — DTCG `$modes`/theme files; retire the Figma-extension dark-mode hack | assess | P1 | 🟡 | ✗² |
| C7 | Native DTCG ingestion — SD reads canonical `$value` directly (confirm ownership of the `usesDtcg`→0-tokens issue) | assess[Med] | P2 | 🟡 | ✓ |
| C8 | Fully **generate** the `hds` JS bridge (kill hand-maintenance / mixed shapes) | assess, prior | P1 | 🟡 | ✗² |
| C9 | Formalize resolved-**literal** outputs for color-math frameworks (MUI `alpha()`, etc.) | assess | P2 | ◐³ | ✓ |

¹ logic validatable node-only; full verification wants the consuming build.
² touches the canonical generator + repo guardrails → needs full build.
³ partially delivered by C1's RN/resolved target + the MUI preset path.

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
| F1 | Bind `hds-bridge` to `127.0.0.1` | sec H1 | P1 | 🟡 | ✓ |
| F2 | Scope CORS to localhost on both bridges | sec H2 | P1 | 🟡 | ✓ |
| F3 | Replace `new Function()` eval of `templates.js` | sec M1 | P2 | 🟡 | ✓ |
| F4 | Hash-check plugin-fetched scripts before eval | sec M2 | P2 | 🟡 | ✓ |
| F5 | Auth/loopback guard on `/update-manifest` | sec M3 | P2 | 🟡 | ✓ |
| F6 | gitleaks allowlist for the `ghp_…` doc placeholder | sec L2 | P2 | 🟡 | ✓ |
| F7 | Invert `/pending-ids` guard to dev-only | sec L3 | P2 | 🟡 | ✓ |

*(#8 install advisories — resolved: `pnpm audit --prod` is clean; vulns are dev-only.)*

## WS-G — Repo cleanup / lean published artifact

| ID | Task | Source | Pri | Status | Sandbox |
|----|------|--------|-----|--------|---------|
| G1 | Tier-1 cruft deletes (~39 MB archive + dead scripts/docs) | cruft-T1 | P1 | ✅ `0efc4728` | — |
| G2 | Gitignore generated `sbom.json` (−4.3 MB) | cruft-T2 | P2 | ✅ `eb328a1` | — |
| G3 | Extract `apps/concrete` + `starter-kit` to own repos | cruft-T4 | P2 | 🟡 *(decision)* | — |
| G4 | Extract doc site + drop Three.js stack | cruft-T5 | P2 | 🟡 *(decision)* | — |
| G5 | Make the published package a lean core (overlaps A4/A7) | assess | P1 | 🟡 | ✓ |

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
Node-only/validatable here: **A7, B2, B3, B5, B6, C4, C5, C7, C9, D1, E1, E2, all of WS-F**.
Needs a full build env (deferred): A1–A4, B4, C6, C8, E3.

## Done this session
A5, A6, B1 (`8b11a83`) · C1 (`2be1d8b`) · G1 (`0efc4728`) · G2 (`eb328a1`).
