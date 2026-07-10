# ADR-024: Token→Utility Bridge Scope (and Style Dictionary: Not Now)

**Status:** Accepted (2026-07-10)

## Context

ADR-002 reintroduced Tailwind as HDS's CSS generation layer and established the
seam: `scripts/build-tokens.mjs` emits `tailwind.config.tokens.cjs`
(`theme.extend`) from the DTCG token graph, and Tailwind consumes it. At that
point the bridge surfaced only three token families — `colors` (from `role.*`),
`borderRadius` (from `role.radius`), and `boxShadow` (from `semantic.shadow.*`).

That covers color re-skinning but leaves a gap the tailwind-multitenant epic
(#124) exists to close: **layout should stay constant while aesthetics — color,
type, spacing density, shape — swap per client through the utility layer.** A
component authored with `p-4 sm:p-6 text-sm border-2` today hardcodes Tailwind's
default scale, so those utilities can't participate in the `data-density` /
`data-brand` dials. The spacing, breakpoint, border-width, and font-size scales
were never bridged, so utility-authored layout is frozen to Tailwind defaults
and blind to the token graph.

Two decisions had accumulated as prose (in #124's epic body and
`docs/architecture/style-dictionary-migration-plan.md`) without a ratified ADR:
**(a)** exactly which token families the bridge covers and on what principle,
and **(b)** whether to migrate the token compiler to Style Dictionary. This ADR
records both so the seam is stable API, not folklore.

## Decision

### 1. Bridge scope — which token families become utilities

The token→utility bridge surfaces the following DTCG families into
`theme.extend`, and no others by default:

| Tailwind key   | Token source                           | Utilities unlocked                        |
| -------------- | -------------------------------------- | ----------------------------------------- |
| `colors`       | `role.*`                               | `bg-*`, `text-*`, `border-*`              |
| `borderRadius` | `role.radius`                          | `rounded-*`                               |
| `boxShadow`    | `semantic.shadow.*`                    | `shadow-*`                                |
| `spacing`      | `primitive.space.*` / semantic spacing | `p-*`, `m-*`, `gap-*`, `w-*`, `h-*`       |
| `screens`      | breakpoint tokens                      | `sm:`, `md:`, `lg:` … responsive variants |
| `borderWidth`  | border-width tokens                    | `border-*`                                |
| `fontSize`     | `semantic.typography.*` size tier      | `text-*`                                  |

The first three are ADR-002's original set; the latter four (`spacing`,
`screens`, `borderWidth`, `fontSize`) are added by the #125 keystone.

**Emission rule (the load-bearing constraint):** every bridged value is emitted
as a `var(--…)` reference to a token CSS variable, **not** a resolved literal —
with the sole exception of `screens`, which Tailwind requires as concrete `px`
because breakpoints are evaluated at build time inside `@media` queries, where
CSS custom properties are not permitted. Because spacing/border-width/font-size
resolve through `var(--…)`, a `[data-density]` or `[data-brand]` overlay that
retargets those variables re-skins every utility-authored component with no
recompile — which is the whole point of the bridge.

**Boundary — what stays out, and why:**

- **Composite-only families** (`typography` beyond the size tier, `motion`,
  `elevation`) are _not_ flattened into utilities. They expand into multiple CSS
  vars with HDS-specific suffixes and are consumed via components/CVA, not
  utility classes. Surfacing them as utilities would leak composite internals
  into the class namespace.
- **Arbitrary values** (`p-[13px]`) remain a lint concern (#130), not a bridge
  concern. The bridge's job is to make the _token_ scale reachable; policing
  off-scale values is a separate guardrail.
- **Adding a new family to the bridge is an ADR-worthy change**, not a silent
  `build-tokens.mjs` edit: it widens the public utility surface consumers depend
  on. Extend `buildTailwindThemeExtend()` and record the rationale.

### 2. Style Dictionary — not now

HDS keeps its custom `scripts/build-tokens.mjs` DTCG compiler as the source of
truth for token output. We do **not** migrate to Style Dictionary at this time.
This ratifies the verdict already reached in
`docs/architecture/style-dictionary-migration-plan.md` (PLAN + POC, proven via
`pnpm audit:style-dictionary`).

**Revisit when** either trigger fires:

1. `build-tokens.mjs` needs a significant feature addition where SD's DTCG
   parsing / alias resolution would carry the weight, or
2. a new platform target (iOS / Android / Compose) is added, where SD's
   pre-built platform ecosystem pays for itself immediately.

Until then the migration plan stays a documented, POC-validated option — not a
scheduled task.

## Rationale

- **The bridge is the structural half of theming.** ADR-002 shipped color; this
  scope closes spacing/type/shape so the "layout constant, aesthetics swappable"
  goal (#124) is achievable at the utility layer, not just inside components.
- **`var(--…)` emission is what makes the dials work.** Concrete values would
  freeze utilities to one tenant/density; references let the `[data-*]` overlays
  cascade. `screens` is the deliberate, documented exception because `@media`
  can't read custom properties.
- **An explicit boundary prevents scope creep.** Naming what's out (composites,
  arbitrary values) and making bridge widening ADR-worthy keeps the utility
  namespace from silently absorbing every token family.
- **Style Dictionary is worth-doing but not urgent.** The migration plan
  estimates ~70% LOC reduction but shows the hard 20% (composite expansion, dark
  mode, tenant overlay, TS outputs) still needs bespoke SD formats. The current
  compiler works and is not a pain point; migrating now would be churn without a
  forcing function.

## Consequences

- `spacing`, `screens`, `borderWidth`, and `fontSize` utilities become
  tenant-/density-swappable; the `data-density` dial reaches utility-authored
  components (the #125 keystone unblocks #126/#128/#129/#130).
- Consumers gain a documented, stable contract for which utilities are
  token-backed. Renaming or dropping a bridged family is a breaking change.
- `build-tokens.mjs` remains the single token compiler; no `style-dictionary`
  runtime/build dependency is taken on. The POC and migration plan stay as the
  on-ramp if a trigger fires.
- Companion records: ADR-002 (Tailwind reintegration, the seam this extends) and
  ADR-023 (the four theming dials the bridge feeds). ADR-022 (per-tenant
  shape/density axis) will document the overlay side once #128 lands.
