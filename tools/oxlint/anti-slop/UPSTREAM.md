# Vendored anti-slop

Source: [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop), commit `c44ef22`, package version `0.1.2`, MIT licensed (`LICENSE` in this directory is upstream's, kept verbatim).

Vendored on 2026-10-08 with upstream's `skills/install-anti-slop/scripts/install.mjs`, run from the repository root. Copied: the generic plugin (`index.ts`, `rules/`, `shared/`), the opt-in `effect/` plugin (not registered here, this repo does not depend on `effect`), and `vendor/eslint-stylistic/` with its own `LICENSE` and `UPSTREAM.md`.

## Local deviations

None to the vendored source. Policy lives outside this directory: `oxlint.config.ts` registers every generic rule at `warn`, and `scripts/check-anti-slop.mjs` ratchets the counts against `tools/oxlint/anti-slop-baseline.json`.

## Updating

Follow upstream's `install-anti-slop` skill, `references/update.md`. The base snapshot is upstream commit `c44ef22`.
