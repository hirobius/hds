# ADR-035: Directions, Brands and Preferences

**Status:** Accepted (2026-10-12, Adrian). Amends ADR-0001 (`docs/architecture/ADR-0001-multi-tenant-scope.md`) and ADR-023; changes no attribute, selector or file name they ratified.

## Context

The fleet had three words for one idea and one word for two ideas.

- HDS called an art direction a **demo tenant** (`brutalist-demo`, `accent-lilac`, marked `"demo": true`) and a client a **tenant** (`concrete-creations`). Both lived in `tenants/`, compiled into the same `tenants.css`, and shipped in `dist/styles.css` with every release. Three gates told them apart by the flag: the Figma Brand model (`scripts/lib/figma-brand-modes.mjs`), the no-private-names rule (hds#614) and the explorations spec (hds#628).
- site-engine calls the same idea a **skin** (`packages/schema/src/skins.ts`, ADR-0003 there): a curated bundle of hero variant, type pairing, palette family and dials, selected by one config key, on a token spine it forked from this package in July 2026.
- The one real client in `tenants/` was a scaffold with a legal entity and a Vercel project in its `metadata.json`, and its slug sat in the public `TenantSlug` type. The client's own storefront (`hirobius/concrete`) already compiles its overlay from the published `variables.css` with its own `scripts/generate-tenant-overlay.mjs`, so the package copy themed nothing.
- `@hirobius/design-system/brand` (`src/brand/overlay.ts`) already exists for exactly this: a consumer turns a six-colour palette into the semantic variables at build or run time, and HDS never holds a client roster.

## Decision

Three nouns, used the same way in HDS, site-engine, ops, Figma and folio. `GLOSSARY.md` holds the definitions.

1. **Direction**: a curated, reviewed art direction any consumer can select. In this repo a direction is a DTCG overlay under `directions/<slug>/` (`tokens.json`, `metadata.json`, `README.md`), in the format `docs/architecture/tenant-token-overlay-format.md` specifies, validated by `check-tenant-tokens`, compiled by `build-tokens.mjs` into `src/styles/tenants.css` as `[data-brand="<slug>"]` blocks (plus the dark and compact combinations, ADR-022). The folder is the statement that an overlay is a direction and not a client; the `demo` marker is retired (still accepted, ignored). `tenants/` is gone.
2. **Brand**: one client's identity. It never lives in this repo or the shared Figma library. A consumer applies it through the brand bridge (`brandOverlayStyle` for an inline style, `brandOverlayCss` for a `[data-brand="<slug>"]` block) or compiles its own overlay in its own repository, as the storefront does. `concrete-creations` is removed from the package and from `TenantSlug`.
3. **Preference**: the viewer's runtime choices, `data-theme` and `data-density`. Unchanged.
4. **The Figma `Hirobius/Brand` collection holds directions only.** `figma/brand-modes.json` lists slugs under `directions/`; the model refuses metadata with a deployment, a legal entity or a tier above 1, so a client filed under `directions/` by mistake still fails.
5. **The levers are one vocabulary across render targets.** Each target implements what it needs; the names and closed values are the contract site-engine's ADR-0005 cites.

| Lever             | HDS                                                                                 | site-engine                                                            | Shared name                                                              |
| ----------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Accent            | `semantic.accent.rest`, one ramp; a supporting accent is an open proposal (hds#628) | `--brand-primary` + `--brand-accent`                                   | `accent`, `accentSupporting`                                             |
| Surfaces and text | `surface.page / raised`, `content.primary / secondary / onAccent`                   | `--brand-bg / muted / fg / on-primary` through the bridge              | the bridge's `BrandPalette` keys                                         |
| Shape             | `role.radius`, one px value                                                         | `brand.radius` none / sm / md / lg / xl                                | `radius`, a closed enum mapped to `role.radius`                          |
| Density           | `data-density` compact / comfortable (a preference)                                 | `brand.spacingDensity` compact / comfortable / airy (a direction dial) | `density`; a direction may pin a tier, the viewer toggle stays two-state |
| Type family       | `--hds-font-family`; display dial proposed (hds#480)                                | `brand.fontPairing`, heading + body                                    | `fontPairing`                                                            |
| Type scale        | ramp roles (hds#483, hds#520)                                                       | `brand.typeScale` standard / compact / display (planned there, #86)    | `typeScale`, orthogonal to the role count                                |
| Shadow            | elevation roles, no lever                                                           | `brand.shadow` flat / soft / hard                                      | `shadow`                                                                 |
| Motion            | `scroll-motion.css`, Reveal pattern                                                 | `brand.motion` none / subtle / rich                                    | `motion`                                                                 |

## What does not change

- `data-brand` (and the `data-tenant` alias), `data-theme`, `data-density` and the font variables: ADR-023's four dials stay the whole public theming surface. A direction is selected the way a tenant was.
- `src/styles/tenants.css`, `hirobius.tenant-tokens.schema.json`, `hirobius.tenant-metadata.schema.json`, `check-tenant-tokens` and `TenantProvider` / `TenantSlug` keep their names. Renaming them is a deprecation cycle with a codemod, filed separately; this ADR changes meaning, not API.
- The cascade mechanism (ADR-0001) and the brand-by-density combinations (ADR-022).
- The overlay format rules R1 to R9.

## Rationale

- One word per layer, fleet-wide, because three repos were about to build the same thing three times under three names (hds#628's "Ceiling" builds, this repo's demo tenants, site-engine's skins), and a reviewer cannot tell a shared direction from a client's brand while both are "tenants".
- A folder, not a flag, because a boolean a person sets is the weakest gate there is; a folder shows in every listing and every pull request, and the Figma gates read it for free.
- The client leaves the package because a shared library that carries one client's brand is one `data-brand` away from leaking it into every consumer and into the shared Figma library; the storefront already compiles its own overlay from the published `variables.css`, so nothing is lost.
- Runtime names stay because the meaning change is worth shipping today and the identifier rename is worth a codemod tomorrow, not a same-day break for ops and the storefront.

## Considered and rejected

- **Keep `tenants/` and the `demo` flag, change only the docs.** The three gates would keep inferring "client or not" from a boolean a person sets; a folder is visible in every file listing and every pull request, and a client's overlay cannot be filed there without a reviewer seeing it.
- **Rename every `tenant` identifier now.** It would break `TenantProvider` for ops and the storefront on the same day the meaning changes, for a name. The meaning change ships first; the rename waits for a codemod.
- **Bring site-engine back onto the npm package.** The factory consumes no React, the package would add 69 dependencies, and every release would restyle client sites. site-engine shares the names, the bridge and the levers instead (its ADR-0005).

## Consequences

- `dist/styles.css` no longer carries `[data-brand="concrete-creations"]`. The storefront ships its own block already; any other consumer on that slug compiles one with `brandOverlayCss`.
- `TenantSlug` is `'hirobius' | 'accent-lilac' | 'brutalist-demo' | (string & {})`.
- hds#628's `soft-demo` and `accent-pair-demo` are created under `directions/`, never with a deployment or a legal entity.
- The Figma collection is still named `Hirobius/Brand`; renaming it to `Hirobius/Direction` is a Figma-side change for a later sync, not a code change.
- Each consumer themes itself: ops and the storefront through the bridge or a local overlay, site-engine through its skins. No repo other than this one holds a direction; no repo at all holds another client's brand.
