# DECISIONS

Archive pointer only.

Architecture decisions now live under the process archive so they stop competing with active launch work for context.

## Archive

The `docs/archive/` tree was deleted on 2026-05-06. All historical content is retained in Git history and can be retrieved if needed.

## Rule

Do not add new ADRs by default. Only create or update decision records when Adrian explicitly asks for that documentation.

## Retained: publishable-package hardening decisions (from deleted `CLEANUP_RUN.md`, 2026 hardening pass)

Salvaged during the #53 root-doc consolidation because these are still-live build decisions, not run-log noise:

- **Sourcemaps off** (`sourcemap: false` in `vite.config.lib.ts`) — consumers don't need them; debugging happens against this repo.
- **`publicDir: false`** in the lib build — the 47MB `public/` tree must never be copied into the published package; fonts resolve against the consumer's own web root.
- **Barrel curation** — `SpecimenBlock`/`ComponentDocPage` were removed from the `src/index.ts` barrel because they transitively pulled in `componentPreviewRegistry.tsx` (every component, every lab module, the 3D scene) via `import.meta.glob`. They stay importable by direct path for the in-repo doc surface only.
- **Source trimming** — the package still ships `src` (types-from-source contract, see `CONSUMING.md` §6), excluding only provably-private trees via `files` negations: `src/stories`, `src/app/components/lab`, and the 3D modules (`mobius-*`, `shaders`, `mobiusStore`/`mobiusCurve`).
- **Generated artifacts are generated, not committed** — Figma variable exports (`hirobius.figma-variables*.json`) are deterministic outputs of `hirobius.tokens.json`; gitignored, regenerated via `pnpm figma-variables`.
- **`three`/`@react-three/*`/`express`/`cors`/`fuse.js`/`zustand`** are `devDependencies`, not `dependencies` — none are imported by the published bundle.
