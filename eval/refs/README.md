# Design refs

A design-evolution loop. Adrian supplies taste (images); the system rebuilds each image
with HDS as it is, finds what HDS cannot do, and proposes its own changes. Adrian only
approves, rejects or defers.

```text
Drive "Design Refs"  ->  rebuild with HDS only  ->  score + gap log + text card
        (phone)              (src/App.tsx)            (ref.json, gaps.json, card.md)
                                                               |
   decisions.json  <-  phone review board  <-  proposals  <-  gaps that recur in 3+ refs
        |                (Artifact)            (proposals/<gap-id>.json)
        v
   approved: a PR that applies the change, with the evidence refs rebuilt to confirm it
```

The nightly run follows [`RUNBOOK.md`](RUNBOOK.md). The CLI that does the deterministic
half is `pnpm eval:refs -- --help` (`scripts/eval-refs.mjs`, logic in `scripts/lib/refs/`).
It never calls a model and never touches Drive.

## For build agents

Read [`INDEX.md`](INDEX.md) before building a screen. It lists every ref with its card,
so you never need the image. Each ref's `src/App.tsx` is a reference build: lint-clean,
on the system, and the closest HDS gets to that image today. Copy its patterns. A gap in
a card is something HDS cannot do yet; do not invent a one-off for it.

## Storage

| What             | Where                                    | Why there                                                      |
| ---------------- | ---------------------------------------- | -------------------------------------------------------------- |
| Source images    | Google Drive, "Design Refs"              | The repo is public; the images are other people's designs.     |
| Image cache      | `reports/refs/sources/` (gitignored)     | The nightly run downloads one image at a time to rebuild it.   |
| Rebuild + scores | `eval/refs/refs/<ref-id>/`               | Reviewable in a diff; build agents read it from `main`.        |
| Gap log          | `eval/refs/refs/<ref-id>/gaps.json`      | One log per ref; clustering reads them all.                    |
| Refs index       | `eval/refs/INDEX.md` (generated)         | One text file agents read instead of images.                   |
| Proposals        | `eval/refs/proposals/<gap-id>.json`      | The record of what was proposed and why.                       |
| Decision history | `eval/refs/decisions.json` (append-only) | What was approved, rejected (with a reason) or deferred.       |
| Live decisions   | the review board's Artifact database     | Where a tap on the phone lands; copied nightly into the above. |
| Renders          | `reports/refs/renders/` (gitignored)     | Regenerated from the rebuild on demand.                        |

## A ref

```text
eval/refs/refs/2026-10-14-pricing-cards/
  ref.json      { id, title, surface, viewport: 390|1280, theme, source: { drive: { fileId, name }, addedAt }, fidelity }
  src/App.tsx   the rebuild: @hirobius/design-system only, 0 lint violations, axe clean
  gaps.json     [{ ref, kind, id, needed, didInstead, proposal, evidence, measured?, nearest?, want? }]
  card.md       # Title / meta line / ## What works / ## Closest tokens / ## Gaps (30 lines max)
```

- `surface` is `app`, `dashboard`, `mobile-app`, `marketing`, `editorial` or `other`. A
  proposal whose evidence has no app, dashboard or mobile-app ref is flagged as possible
  drift from the North Star (`docs/ai/NORTH_STAR.md`).
- `fidelity.rubric` is the rebuilding agent's judgement after looking at both images:
  layout, spacing, type, color and components, each 0 to 4. `score` is their sum out of 100. `structure` (grayscale SSIM) and `palette` (colour histogram overlap) are measured
  by `--render --record` and keep the rubric honest: a high score over a low structure
  match is flagged.
- A gap's `id` is required, because clustering is by id. Reuse one from
  `pnpm eval:refs -- --vocab` before minting a new one. `want` (`{ scale, px }`) puts a
  token gap on a scale so a proposal can test it there.

## Proposals

A gap becomes a candidate when `threshold` distinct refs hit it (`config.json`, default 3).
Fewer stay logged and appear on the board's "Logged" list. Each proposal carries:

- **Change**: the exact token or component diff.
- **Evidence**: the refs, with the original, the rebuild now and the rebuild with the
  change, side by side on the board.
- **Blast radius**: `--blast <token>` for what reads the token; for a change to an existing
  token, `--diff` of every ref's render before and after.
- **Consistency risk**: `--scale <scale> <px>` facts (extends the scale, sits inside it,
  near-duplicates a step, off the 4px grid) plus the agent's judgement.
- **Benefit**: each evidence ref's score before and after.
- **Recommendation**: adopt, adopt modified, or reject.

## Guardrails

- Never change the system without approval. The nightly run writes refs, proposals and
  the board; only an approved proposal reaches tokens or components, as a PR.
- Prefer extending a scale over a one-off value. A value inside a scale or within 10% of
  a step is high risk by default.
- A rejected proposal is never proposed again; the reason is kept. A deferred one comes
  back only when more refs hit it than when it was deferred.
- One-off gaps stay logged, never proposed.
- `pnpm test` runs `eval-refs --check` over this directory, so a ref with a stale index,
  an unscored rebuild, a lint violation or a card that skips a gap cannot land.
