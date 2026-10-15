Design refs pipeline (eval/refs, scripts/eval-refs.mjs, pnpm refs:index): Drive images rebuilt with HDS only, scored (rubric + SSIM/palette), gap logs clustered at 3+ refs into proposals with scale, blast-radius and benefit facts, a phone review board (Artifact db decisions) and an append-only decisions.json; nightly RUNBOOK.md; the live stages moved to scripts/lib/consistency/live-stages.mjs for reuse.
Motion upgraded 12.23.24 -> 14.3.0 (hds#751 step 1); tests and size budget green.
ADR-064 lively motion: DESIGN.md bounce rule replaced (hds#751 step 2).
Motion tokens (hds#751 step 3): springs as linear() (fixes invalid spring() CSS), stagger/extended, scale, blur, nudge/slide; hds.motion.springs.
