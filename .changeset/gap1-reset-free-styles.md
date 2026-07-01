---
'@hirobius/design-system': minor
---

Add a reset-free component stylesheet on a new subpath:
`@hirobius/design-system/styles.css`. It ships the full component styling
(design tokens + Tailwind utilities + embedded fonts) but **no global reset** —
HDS's own base styles are scoped to `[data-hds]`, so importing `styles.css`
styles every HDS component and changes **zero** host-element styles (`*`,
`html`, `body`, headings, `button`, `a`, form controls are untouched). This is
the clean way to run HDS alongside MUI `<CssBaseline>` / Emotion or any host with
its own global CSS.

`tokens.css` is unchanged (batteries-included: `styles.css` **plus** the global
Tailwind preflight) and remains the default for HDS-first apps. A scoped
box-model reset was added to the `[data-hds]` base so components keep their
border-box model without the global preflight. The `smoke:consumer` gate now
asserts `styles.css` carries components/utilities/fonts and no global reset.
