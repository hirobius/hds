# .status/

Legacy per-PR status notes. Since ops#1057 a new branch needs no note: the
receipt comment on the issue is the record, and the pre-push gate
`scripts/check-record-freshness.mjs` accepts a pushed commit that names its
issue (`hds#12`, `Refs ops#1057`, `Fixes #42`) as proof the record is current.

A `.status/<branch>.md` note still counts, so branches that already carry one
push as before. On main, `pnpm status:fold` bumps `updatedAt`, deletes any
notes and prints them. Only `focus` and `phase` in `status.json` are written by
hand (change `focus` when the repo's direction changes); ops derives the release,
what is next and what is blocked.
