# ADR-063: Bricolage Grotesque sets display and title type

**Status:** Accepted (2026-10-17). Builds on ADR-060 (how fonts ship, licence first). Takes up the separate display dial left open in hds#480.

## Context

Since the Satoshi swap (ADR-060, PR #585), one face, Plus Jakarta Sans, set every
role: Bold (700) for display and titles, 400 and 500 for the rest. Headings and body
differed only in size and weight.

The delight explorations (PR #783, `docs/explorations/2026-10-delight/index.html`)
showed three directions. Adrian picked the type of direction 2, "Expressive type":
Bricolage Grotesque on the display and title steps, with body, UI and table text left
alone. That direction's colours (pine and peach) and pill kickers are not part of this
decision; the accent work is #790.

## Decision

- **Display, title and title-sm set in Bricolage Grotesque 700.** This is a token
  change: `primitive.typography.family.display` now leads with `Bricolage Grotesque`,
  then `Plus Jakarta Sans`, then the system sans stack. The `display`, `title` and
  `titleSm` composites already point at that family, so they move with it; the
  deprecated `h1`-`h3` aliases follow `title`.
- **Body, ui, caption and mono do not change.** They keep `family.primary` (Plus
  Jakarta Sans) and `family.mono` (IBM Plex Mono).
- **The type ramp from #747 stays.** Sizes, weights, line heights and letter spacing
  are untouched. The exploration's larger display size and tighter tracking are not
  adopted here.
- **Self-hosted, like the other faces (ADR-060).** One file,
  `public/fonts/bricolage-grotesque/bricolage-grotesque-700.woff2`, declared in
  `src/styles/fonts.css` and shipped in the opt-in `dist/fonts.css`. It is the 700
  weight with the optical-size axis kept at 18-96 (the range from title-sm to
  display), cut to the same Latin character set as the Plus Jakarta Sans files: about
  34 KB. No CDN.
- **A display dial.** `--hds-font-family-display` (and `fontFamilyDisplay` on
  `HdsThemeProvider`) sets the heading face at any scope, like the body and mono
  dials (ADR-023, hds#478). Headings no longer follow `--hds-font-family`.

## Licence

Bricolage Grotesque is by Mathieu Triay ([source](https://github.com/ateliertriay/bricolage)),
"Copyright 2022 The Bricolage Grotesque Project Authors", under the SIL Open Font
License 1.1, the same licence as the other two faces. OFL 1.1 allows bundling,
subsetting and redistribution with the software, provided the licence travels with
the files and a modified version does not use the Reserved Font Name (Bricolage
Grotesque declares none). `LICENSE.txt` sits beside the woff2, `build-fonts-css`
copies it into `dist/fonts/`, NOTICE.md lists the face, and the package licence stays
`MIT AND OFL-1.1`. The file was taken from Google Fonts' build of the family.

## Alternatives considered

- **A static 700 at one optical size (about 22 KB).** 12 KB smaller, but display and
  title-sm would share one cut. The exploration used the browser's automatic optical
  sizing, and the budget (146 KB raw for `fonts.css` and the woff2 files) has room for
  the axis.
- **Leave headings on the body dial.** Keeps one dial for all sans text, but a
  consumer setting the body face would silently drop the display face. A separate dial
  makes the two choices separate.
- **Load from Google Fonts.** Rejected by ADR-060: consumers fall back silently when a
  remote request fails, and the docs app's CLS budget needs local, preloaded files.

## Rationale

Adrian chose the face from the explorations; the reasons recorded here are the
engineering ones. Pointing the existing `family.display` token at the new face moves
exactly the roles that should move and nothing else, so it is a token change with no
component edits. The licence matches the faces already shipped, so ADR-060's rules
hold unchanged. Keeping the optical-size axis is what makes one weight serve 18px
titles and 48px display alike. The display dial keeps ADR-023's promise that every
font a consumer sees can be set at any scope.

## Consequences

- Without `fonts.css`, headings fall down the stack, as every face does: Plus Jakarta
  Sans if the consumer loads it, otherwise the system sans.
- The opt-in font payload grows by about 34 KB.
- A consumer that set `--hds-font-family` and expects its headings to match must also
  set `--hds-font-family-display`. The 0.x minor changeset and its upgrade note say so.
- The Figma library's display and title styles still name Plus Jakarta Sans until the
  next token sync; `check:figma-drift` reports that drift until Adrian syncs and
  publishes.

## Evidence

- PR #783: the delight explorations, direction 2.
- `src/styles/__tests__/display-typeface.test.ts` pins the family, the dial default
  and the self-hosted face; `src/styles/__tests__/font-dial.test.ts` pins the dial
  wiring.
