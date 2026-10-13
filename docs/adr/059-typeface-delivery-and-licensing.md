# ADR-059: Typefaces: how fonts ship, and only what the license allows

**Status:** Accepted, retroactive (decided 2026-10-10; recorded 2026-10-13 from commit and PR history). Reverses the 2026-06-29 base64 embedding (see Consequences).

## Context

Fonts have been delivered three ways, and the last change was forced by a license.

**June.** `tokens.css` pointed at fonts by absolute `/fonts/...` URLs. In the words of
`a37eef7`, these "resolved against the consumer's web root, so consumers silently fell
back to system fonts". The first fix used relative URLs, so Vite inlined the three
woff2 files into `dist/tokens.css` as base64. The commit states the trade-off:
"tokens.css grows to ~226KB raw / ~111KB gzip". Then `cc486e3` found that the same
relative URLs made the docs app emit hashed `/assets/*.woff2` files instead of the
preloaded `/fonts/` paths. The late font swap caused "a layout shift (Lighthouse CLS
0.11 vs ≤0.005 budget, perf 0.63 vs 0.79)".

**October.** The type ramp cut (`14eb027`, PR #521, hds#479) stopped embedding fonts
at all. The code font changed from Geist Mono to IBM Plex Mono (`8edd926`, PR #535).

**The license.** hds#574 opened on 2026-10-10 with doubt about whether Satoshi's
license allowed bundling. The thread zigzags. A first comment records that Adrian
kept Satoshi. A second says Adrian checked the license and found bundling fine. A
third reopens the issue after reading the license text itself. It quotes §02:
"The Fonts may not … be distributed, duplicated, loaned, resold or licensed in any
way … uploading them in a public server". HDS had the files in a public GitHub repo
and base64 data in the public npm package.

## Decision

- **App and package differ.** The app keeps absolute `/fonts/` URLs served from
  `public/`. The package never inlines fonts (`cc486e3`, then hds#479).
- **Fonts are opt-in.** `scripts/build-fonts-css.mjs` writes `dist/fonts.css` and
  `dist/fonts/*.woff2`. A consumer imports `@hirobius/design-system/fonts.css` or
  brings its own fonts. `tokens.css` keeps the font-family variables and falls back
  to the stack.
- **Only licensed fonts ship.** `29af78f` (PR #585, closes hds#574) replaced Satoshi
  with Plus Jakarta Sans (OFL 1.1) in the same 400/500/700 ramp. Each family's
  license is copied into `dist/fonts/`. `package.json` license is now
  `MIT AND OFL-1.1`, and NOTICE.md was updated.

## Alternatives considered

- Relative URLs everywhere (`a37eef7`). Lost on Lighthouse CLS and visual diffs in the
  docs app.
- Keep Satoshi and serve it from the Fontshare API, with the package no longer
  embedding it. Proposed in the hds#574 thread, with 2026-10-17 as the default date.
  The commit that closed the issue chose a replacement instead, and the commits do not
  record why this option lost.
- Keep Satoshi after a first reading of the license. Reversed once the §02 text was
  read.
- Other OFL families named in hds#574: Inter, Geist, Figtree, IBM Plex Sans. The
  commits do not record why Plus Jakarta Sans was picked.

## Rationale

For delivery, the recorded reasons are consumers falling back to system fonts, and the
CLS and perf budget in the docs app. For the license, the reason is the quoted
sentence from the commit: "Satoshi's Fontshare FF EULA forbids redistributing the font
files (§02), and HDS shipped them in a public repo and in the npm package."

## Consequences

- Still in force on origin/main. `public/fonts/` holds `plus-jakarta-sans` and
  `ibm-plex-mono`, each with `LICENSE.txt`, and `package.json` license is
  `MIT AND OFL-1.1`.
- Plus Jakarta Sans files are Latin-subset, about 15 KB each against about 26 KB.
  The Figma model's character-width basis was re-measured and the goldens re-captured.
- Consumers lost fonts from `tokens.css`. The 0.21.0 upgrade note tells them to add the
  `fonts.css` import "or text renders in the system font".
- The Satoshi files stay in git history. Fixing that is outside what the commits
  record, and I found no record of a decision to rewrite history.

## Lessons

- Read the license text before bundling a font. Two comments in hds#574 concluded the
  opposite of the third because the text was not at hand.
- A package that ships fonts takes on redistribution rights. Opt-in delivery shrinks
  that exposure.
- Keep app and library asset delivery separate. One setting that suits a library can
  break the app's preload and its layout budget.

## Evidence

- `a37eef7` feat(fonts): bundle web fonts into the package (P0.3, option a)
- `cc486e3` fix(fonts): keep app font delivery on /fonts/, embed only in lib (merged in `0282d95`, PR #17)
- `14eb027` feat(tokens): cut the type ramp to 5 roles plus mono (PR #521, hds#479)
- `8edd926` feat(tokens): replace Geist Mono with IBM Plex Mono 400 as the code font (PR #535)
- `29af78f` feat(brand): switch the typeface from Satoshi to Plus Jakarta Sans (PR #585)
- hds#574: Satoshi stays, but its license forbids redistribution
