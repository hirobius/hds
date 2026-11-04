---
'@hirobius/design-system': patch
---

Board's first column no longer collapses at tablet width and up, and the visually-hidden count text in off-screen columns no longer widens the page. The track's single-column template now applies only below the Board's `@3xl` container width (`@max-3xl:grid-cols-1`), so every column keeps its 16rem floor, and the track is the containing block for the hidden text so the Board's own horizontal scroll clips it (hds#1114).
