---
'@hirobius/design-system': minor
---

Directions, brands and preferences (ADR-035). The package's overlays are now **directions** (curated art directions any consumer can select) under `directions/`: `accent-lilac` and `brutalist-demo` keep their slugs, their `[data-brand="<slug>"]` CSS and their Figma Brand modes. A **brand** (one client's identity) never ships in the package: `concrete-creations` is removed from `dist/styles.css` and from the `TenantSlug` type (a consumer on that slug compiles its own block with `brandOverlayCss`, as its storefront already does). `TenantProvider`, `data-brand`, `data-tenant`, `tenants.css` and the overlay schemas keep their names. `GLOSSARY.md` defines direction, brand, preference, overlay and lever; `DESIGN.
