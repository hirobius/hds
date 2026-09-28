# Brutalist Demo — Tenant Overlay

Storybook/Chromatic-only exemplar for the per-tenant shape + density overlay
axis (ADR-022, `#128`, epic `#124`). Not a real client — no deployment, no
legal entity, no primary domain.

## Brand intent

Before this overlay, `data-density` and shape (`role.radius`,
`semantic.space.*`) were **global** dials — no tenant could be "sharp +
dense" while another stayed "round + airy." Brutalist Demo exercises the
full axis to prove the architecture actually swaps shape and density per
tenant, not just color.

## What this overlay overrides

| Token path                                                          | Default (HDS base)                 | Brutalist Demo                                                                                                 | Why                                                                                                                                                                                  |
| ------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `role.radius`                                                       | `12px` (`semantic.radius.action`)  | `0px`                                                                                                          | Zero corner radius everywhere — sharp edges are the brand identity. Density-invariant (no `Compact` mode).                                                                           |
| `semantic.space.surface.padding` (was `component.padding`, hds#206) | `24px` (`semantic.space.scale.md`) | `16px` (`semantic.space.scale.sm`) at rest, `8px` (`semantic.space.scale.xs`) under `[data-density="compact"]` | Tightened baseline, tightens further under the compact density preference — density stays a genuine independent user toggle layered on top of this tenant's baked-in shape identity. |

## Status

**`scaffold`** — Storybook-only. Do not deploy this tenant to a production
domain.

## Reference

- Format spec: `docs/architecture/tenant-token-overlay-format.md` (R9 —
  density-aware overrides)
- Shape/density decision: `docs/adr/022-per-tenant-shape-density-axis.md`
- Four-dials contract: `docs/adr/023-four-theming-dials-contract.md`
- Wired into `.storybook/preview.tsx`'s `BRANDS` list (`#126` modes matrix).
