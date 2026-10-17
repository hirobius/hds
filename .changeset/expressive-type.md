---
'@hirobius/design-system': minor
---

Display and title type now set in Bricolage Grotesque 700 (SIL OFL 1.1, ADR-063). `primitive.typography.family.display` leads with `Bricolage Grotesque`, then falls back to Plus Jakarta Sans and the system sans stack, so the `display`, `title` and `titleSm` roles (and the deprecated `h1`-`h3`) change face. Body, ui, caption and mono are unchanged, and so are every size, weight, line height and letter spacing. The opt-in `fonts.css` gains one self-hosted file, `fonts/bricolage-grotesque-700.woff2` (about 34 KB, Latin subset, optical-size axis 18-96), with its licence beside it. A new display dial, `--hds-font-family-display` (`fontFamilyDisplay` on `HdsThemeProvider`), sets the heading face; headings no longer follow `--hds-font-family`, so a consumer that set only the body dial and wants its headings to match should set the display dial too.
