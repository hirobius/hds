# ADR-022: Per-Tenant Shape/Density Overlay Axis

**Status:** Accepted (2026-07-10)

## Context

`[data-density="compact"]` and shape (`role.radius`, `semantic.borderWidth.*`)
are today **global** dials: one value each, set on `<html>`, uniform across
every tenant. `[data-brand="<slug>"]` (the per-tenant override scope decided in
`docs/architecture/ADR-0001-multi-tenant-scope.md`) currently only carries
color and typography overrides.

The epic goal (#124) is that **layout stays constant but aesthetics — color,
type, spacing density, shape — swap per client**. With shape/density pinned
global, that goal fails on everything but color: no tenant can be "sharp +
dense" (a Brutalist exemplar) while another stays "round + airy," because
`role.radius` and `semantic.space.*` have exactly one value system-wide.
ISSUE-04 (#128) needs an architectural answer for _where this axis lives_
before a Brutalist exemplar tenant can be built.

Four options were weighed (mirroring the depth of
`docs/architecture/ADR-0001-multi-tenant-scope.md`'s option comparison):

### Option A — Flat per-tenant shape override, independent of `data-density`

`[data-brand="slug"]` sets `role.radius`/`semantic.space.*` directly as the
tenant's permanent posture; the runtime `data-density` toggle is ignored for
that tenant (or removed).

| Axis           | Verdict                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Cascade        | Simple — one override block per tenant, no combinatorics.                                                                                     |
| Expressiveness | **Loses** the existing user-facing compact/comfortable toggle for any tenant that sets a shape override — the two concerns collapse into one. |
| Migration cost | Low, but destructive to an existing dial.                                                                                                     |
| Risk           | Breaks the "four dials are independent" invariant (ADR-023) the moment a tenant uses this axis.                                               |

**Rejected** — it papers over the problem by deleting a dial instead of adding
one.

### Option B — Combinatorial `[data-brand="slug"][data-density="compact"]` blocks _(chosen)_

Tenant overlays may supply shape/density overrides per density mode. The
tenant CSS emitter gains a second combinatorial pass, mirroring the existing
`[data-brand][data-theme="dark"]` precedent from ADR-0001's build-pipeline
step.

```css
[data-brand='brutalist-demo'] {
  --semantic-radius-default: 0;
  --hds-space-md: var(--primitive-space-3); /* tightened base */
}
[data-brand='brutalist-demo'][data-density='compact'] {
  --hds-space-md: var(--primitive-space-2); /* tighter still */
}
```

| Axis           | Verdict                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cascade        | Specificity-driven, predictable — identical mental model to the dark-mode precedent.                                                                                                                            |
| Expressiveness | Tenant keeps both a comfortable _and_ a compact posture; density stays a genuine user-facing toggle layered on top of the tenant's baked-in shape identity.                                                     |
| Migration cost | Low — extends the existing tenant CSS emitter (`build-tokens.mjs` ~1388–1526) with one more attribute combination; no new attribute, no new build concept.                                                      |
| Risk           | Overlay validator (`check-tenant-tokens.mjs`) must gain the new permitted paths (`semantic.radius.*`, `semantic.space.*`, `semantic.borderWidth.*`, `role.radius`) or tenants silently fall back to base shape. |

**Why this wins:** reuses the attribute-combination pattern the team already
ships and understands (dark × brand), adds zero new dials, and keeps
`data-density` meaningful as a per-user preference independent of the tenant's
baked-in aesthetic identity.

### Option C — New standalone `data-shape="sharp"` dial

A fifth root attribute, orthogonal to brand/density/theme.

| Axis           | Verdict                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Cascade        | Clean in isolation, but multiplies the combinatorial surface: theme × density × brand × shape.                                               |
| Expressiveness | Lets a tenant's shape identity be reused across brands — a flexibility nobody has asked for.                                                 |
| Migration cost | Highest — every combinatorial CSS block doubles again, and it's a new public dial to document, version, and never break (ADR-023 territory). |
| Risk           | Violates the "four dials, held stable" contract this exact ADR series (ADR-023) is trying to ratify, the same sprint it's ratified.          |

**Rejected** — solves a problem (shape reuse across brands) that doesn't
exist yet, at a real combinatorial and API-surface cost today.

### Option D — Component-level `shape` prop, no CSS attribute

Consuming apps pass `shape="sharp"` to individual components; no root
attribute, no CSS cascade involved.

| Axis           | Verdict                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cascade        | None — resolved in JS per component instance.                                                                                                                                   |
| Expressiveness | Per-instance override, which is more granular than a tenant needs.                                                                                                              |
| Migration cost | High — every shape-sensitive component needs new prop plumbing.                                                                                                                 |
| Risk           | Breaks the "zero JavaScript" override contract (ADR-023): a tenant should re-skin by setting attributes on a root element, not by threading props through every component tree. |

**Rejected** — wrong altitude. Tenant identity is a root-level concern; this
option pushes it down into every consuming call site.

## Decision

Adopt **Option B**: shape and density-at-rest become part of the per-tenant
overlay surface, expressed as combinatorial `[data-brand="slug"][data-density="compact"]`
CSS blocks alongside the existing `[data-brand][data-theme="dark"]` pattern.

Concretely:

1. `docs/architecture/tenant-token-overlay-format.md` R1 gains four new
   permitted override paths: `semantic.radius.*`, `semantic.space.*`,
   `semantic.borderWidth.*`, `role.radius`.
2. The tenant CSS emitter in `scripts/build-tokens.mjs` emits a
   `[data-brand="slug"][data-density="compact"]` block per tenant whenever
   that tenant's overlay declares a density-varying value, exactly mirroring
   the existing dark-mode combinatorial emit.
3. `tenants/_template/tokens.json` documents the new override surface with a
   commented shape/density block so contributors discover it by reading the
   template (the same discovery pattern ADR-0001 established for color).
4. One exemplar tenant (Brutalist demo) exercises the full axis: `role.radius: 0`
   and a tightened `semantic.space.*` scale, proving a card's `border-radius`
   computes to `0` and padding tightens under `data-brand="brutalist-demo"`.

## Rationale

- Reuses a cascade mechanism contributors already understand (attribute
  combination), so the mental-model cost is zero — same reasoning ADR-0001
  used to select `[data-tenant]` over `@layer` in the first place.
- Keeps `data-density` a genuine, independent user preference: a tenant's
  baked-in shape identity and a viewer's density preference compose instead
  of colliding.
- Does not introduce a fifth root dial, keeping the "four dials" contract
  (ADR-023) accurate the same release it's formally ratified.
- Low migration cost — extends an existing emitter pass rather than
  architecting a new one.

## Consequences

- `check-tenant-tokens.mjs` must validate the four new permitted paths;
  tenants that set them without the validator update would silently fall back
  to base shape (a fail-open risk to guard against explicitly in the
  guardrail).
- The combinatorial CSS surface grows by one more per-tenant block class
  (brand × density) on top of the existing brand × theme block — bounded and
  linear in tenant count, not exponential, since theme and density combine
  with brand independently rather than with each other.
- Tenants that don't declare shape/density overrides emit no new CSS —
  additive, zero-cost for existing tenants (`concrete-creations`,
  `lilac-bonds`).
- Unblocks ISSUE-04's Brutalist exemplar and, transitively, the visual
  baseline snapshots in ISSUE-02 (#126).
