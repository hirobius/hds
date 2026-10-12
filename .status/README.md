# .status/

Per-PR status notes. Instead of bumping root `status.json` (which conflicts on
every PR), add `.status/<branch>.md` with one line on what changed. The
pre-push gate `scripts/check-record-freshness.mjs` accepts a note as proof the
record is current. On main, `pnpm status:fold` bumps `updatedAt`, deletes the
notes and prints them. Only `focus` and `phase` in `status.json` are written by
hand (change `focus` when the repo's direction changes); ops derives the release,
what is next and what is blocked.
