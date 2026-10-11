---
'@hirobius/design-system': patch
---

feat(brand): the primary and display typeface is now Plus Jakarta Sans.

Satoshi's license (the Fontshare FF EULA) does not allow the font files to be redistributed, so HDS could not keep shipping them in the package or a public repo. Plus Jakarta Sans (Tokotype, SIL Open Font License 1.1) replaces it in the same three weights: 400 body, 500 UI and captions, 700 display and titles.

- `primitive.typography.family.primary` and `.display` now start with `"Plus Jakarta Sans"`, with the same system fallback stack.
- `@hirobius/design-system/fonts.css` now declares Plus Jakarta Sans 400/500/700, as Latin-subset woff2 files of about 15 KB each (Satoshi's were about 26 KB). The OFL license text ships beside the fonts in `dist/fonts/`.
- `package.json` `license` is now `MIT AND OFL-1.1`, since every bundled font is OFL.
- `ch`-based widths read a little wider in Figma, because the "0" advance is 0.732em instead of 0.683em.

Visual-only, with no API changes. If you import `fonts.css`, the new face loads with nothing else to do.
