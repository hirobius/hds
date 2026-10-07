# Baseline run notes (2026-10-05)

Conditions: `eval/consistency/CONDITIONS.md`, baseline arm.

- Generators: `base-sonnet`, `base-opus`, `base-haiku`, Claude Code subagents
  with the configured models in CONDITIONS.md. No model fallback was reported.
- Each generator read a tarball packed from `6f0be12` (sha256 `fc16ba5f…bfb7`).
  The harness re-packed at `3f9c5e3` (sha256 `a6f36e20…7c44`). The two differ
  only in the `generatedAt` timestamp of `src/app/data/component-api.json`;
  every other file is byte-identical.
- No generator wrote outside its workspace or touched `main.tsx` / `index.html`.
  None ran shell commands (none were needed to write the file).
- Apps are committed exactly as delivered (`App.tsx` only, in each case).

Result: builds 3/3, violations 0, axe 0, Jaccard min 0.4091 (FAIL, limit
>= 0.85), light diff max 3.2096% (FAIL, limit <= 1.5%). The haiku app is the
outlier on both failing measures; the opus~sonnet pair alone scores Jaccard 0.9
and light diff 1.2446%.
