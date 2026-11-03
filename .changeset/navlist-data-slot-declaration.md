---
'@hirobius/design-system': patch
---

NavList's `data-slot` is now declared in its public data attributes: the manifest's NavList entry lists `publicDataAttributes: ["data-slot"]` and the consumer skill names it, matching what NavList already renders for its trailing-action slot (the declaration was missed when the action landed in hds#1074, which left `scripts/__tests__/public-data-attributes.test.mjs` red on main).
