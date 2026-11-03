# muse/1009-dedupe-styles

hds#1009 (F8 J2, src/styles slice): the styles contract tests share one local setup helper (`src/styles/__tests__/style-test-helpers.ts` — token source walk + generated-CSS block parsing) instead of five re-implementations; jscpd ratchet 1.50 → 1.48 (measured 1.4595%). No CSS, token or runtime change; the remaining src/styles clones are the deliberate dark-alias re-emissions (#245) and per-overlay re-anchoring, justified in the PR.
