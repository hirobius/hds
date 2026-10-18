# ADR-063: Sora sets display and title type

**Status:** Accepted (2026-10-17); amended 2026-10-17 (Adrian): Sora 800 replaces Bricolage Grotesque 700, body weight 450. Builds on ADR-060 (how fonts ship, licence first). Takes up the separate display dial left open in hds#480.

## Context

Since the Satoshi swap (ADR-060, PR #585), one face, Plus Jakarta Sans, set every
role: Bold (700) for display and titles, 400 and 500 for the rest. Headings and body
differed only in size and weight.

The delight explorations (PR #783, `docs/explorations/2026-10-delight/index.html`)
showed three directions. Adrian picked the type of direction 2, "Expressive type":
a distinct display face on the display and title steps, with body, UI and table text left
alone. That direction's colours (pine and peach) and pill kickers are not part of this
decision; the accent work is #790.

## Decision

Adrian, 2026-10-17: Sora 800 for display and title, Plus Jakarta Sans body at 450. This
replaces the first pick of Bricolage Grotesque 700, which was never released.

- **Display, title and title-sm set in Sora 800.** `primitive.typography.family.display`
  leads with `Sora`, then `Plus Jakarta Sans`, then the system sans stack. The new
  `primitive.typography.weight.display` (800) is bound by `display`, `title` and
  `titleSm`; the deprecated `h1`-`h3` aliases follow `title`.
- **Body weight 450.** Plus Jakarta Sans now ships as one variable file (wght 200-800),
  so in-between weights render as themselves. Only `regular` moves
  (450, body); `medium` stays 500 and `bold` 700, the scope Adrian approved. Figma text
  styles name font instances, so the Figma model maps 450 to Regular and keeps the exact
  value in the variable.
- **Sizes, line heights and letter spacing do not change** (the #747 ramp stays). Corners
  and shadows are untouched.
- **Self-hosted, like the other faces (ADR-060).** `public/fonts/sora/sora-800.woff2`
  (about 15 KB, Latin subset) and `public/fonts/plus-jakarta-sans/plus-jakarta-sans-variable.woff2`
  (about 27 KB) replace the three static Plus Jakarta files, declared in
  `src/styles/fonts.css` and shipped in the opt-in `dist/fonts.css`. No CDN.
- **A display dial.** `--hds-font-family-display` (and `fontFamilyDisplay` on
  `HdsThemeProvider`) sets the heading face at any scope, like the body and mono
  dials (ADR-023, hds#478). Headings no longer follow `--hds-font-family`.

## Licence

Sora is by the Sora Project Authors ([source](https://github.com/sora-xor/sora-font)),
"Copyright 2019 The Sora Project Authors", under the SIL Open Font License 1.1, the same
licence as the other faces. OFL 1.1 allows bundling and redistribution with the
software, provided the licence travels with the files. `LICENSE.txt` sits beside the
woff2, `build-fonts-css` copies it into `dist/fonts/`, NOTICE.md lists the face, and the
package licence stays `MIT AND OFL-1.1`. The files come from the Fontsource builds of
Sora and Plus Jakarta Sans.

## Alternatives considered

- **Bricolage Grotesque 700** (the first pick, superseded). Dropped by Adrian for Sora.
- **Static Plus Jakarta files at 450.** More files for what one variable
  file does, and each weight would be a separate cut to keep in step.
- **Leave headings on the body dial.** A consumer setting the body face would silently
  drop the display face. A separate dial makes the two choices separate.
- **Load from Google Fonts.** Rejected by ADR-060: consumers fall back silently when a
  remote request fails, and the docs app's CLS budget needs local, preloaded files.

## Consequences

- Without `fonts.css`, headings fall down the stack, as every face does.
- The opt-in font payload is smaller than before (three files instead of five).
- Consumers that read `weight.regular` get 450 (was 400); a host that loads its own
  static Plus Jakarta files at 400/500/700 sees the nearest cut for body text.
- A consumer that set `--hds-font-family` and expects its headings to match must also
  set `--hds-font-family-display`. The 0.x minor changeset and its upgrade note say so.
- The Figma library's display and title styles still name Plus Jakarta Sans until the
  next token sync; `check:figma-drift` reports that drift until Adrian syncs and
  publishes.

## Evidence

- PR #783: the delight explorations, direction 2.
- `src/styles/__tests__/display-typeface.test.ts` pins the family, the 800 weight,
  the dial default, the self-hosted faces and that display, title and title-sm resolve
  to Sora at the title size; `font-dial.test.ts` pins the dial wiring.
