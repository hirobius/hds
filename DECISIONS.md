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
- **Generated artifacts are generated, not committed** — Figma variable exports (`hirobius.figma-variables*.json`), the Figma model (`figma/model.json`), the push carriers (`figma/push/`) and the native-import files (`figma/native-import/`) are deterministic outputs of `hirobius.tokens.json`; gitignored, regenerated via `pnpm figma-variables` / `pnpm figma:model` / `pnpm figma:push` / `pnpm figma:native-import`. The exporter is pinned by a golden snapshot of a fixture graph instead. The exception is `figma/snapshot.json`: it records Figma's state, which no build can regenerate, so it is committed.
- **`three`/`@react-three/*`/`express`/`cors`/`fuse.js`/`zustand`** are `devDependencies`, not `dependencies` — none are imported by the published bundle.

## Deleted: componentPreviewRegistry island (Adrian, 2026-09-26, hds#286)

**Decision: delete, don't revive.** `src/app/components/componentPreviewRegistry.tsx` +
its two exclusive consumers (`specimen-block.tsx`, `variant-preview-deck.tsx`; ~900 lines
total) removed together. All three were reachable from nothing (knip-flagged, no export
from `src/index.ts`) — the remains of the docs SPA deleted in #90, which took the consumer
but left the island. The Storybook-built component reference site (#280) now renders every
component from real story args, which is what this registry was reaching for by hand.

Why delete over revive: the registry's own `DEFAULT_PREVIEW_PROPS` table — a hand-written
map of component → example props — had decayed to 46 entries covering 30 of 139 manifest
components, with 16 entries naming components that no longer exist. That decay is the
generic failure mode of any hand-authored "example props per component" table; Storybook's
`composeStories` avoids it because all 447 stories compose with their own real args, so no
separate table exists to go stale.

Worth keeping — the two-part discovery pattern the registry got right, in case a future
preview surface needs it again:

- **Module discovery**: `import.meta.glob('./*.tsx')` (plus `'./lab/*.tsx'`) built a
  `path → dynamic import()` map at build time, so a preview surface can lazy-load any
  component by its manifest `filePath` without a hand-maintained switch statement.
- **Per-component preview metadata read from the manifest, not hard-coded**: each
  component's `hds-manifest` entry can carry a `componentSpecs[name].preview` object with
  `exportName` (the module's export to render, when it differs from the component name —
  falls back to `componentName` then `.default`) and `sizing` (`'compact' | 'panel' |
'full'`, controlling the preview frame's max-width). 132 of 139 components still carry
  these fields post-deletion; they are otherwise unused now and free to repurpose or prune.

Cleanup that shipped with the deletion: `.size-limit.cjs`'s comment listing
`componentPreviewRegistry.tsx` as one of `component-api.json`'s three importers, and the
two `exceptions-audit.md` rows for its now-gone `audit-ok`/`eslint-disable` lines.

## Type ramp: base-size decision (Adrian, 2026-09-26, hds#283)

**Decision: lift Tailwind 4's ten default `fontSize` steps into `primitive.typography.size.*`, verbatim.** No golden-ratio formula — the audit on hds#283 measured 7 published design-system token packages (HeroUI, Primer, Polaris, Carbon, Atlassian, Radix, Mantine, Tailwind) and found no shared ratio, but 12/14/16/20px land in 7 of 7. HDS's prior rungs (13/15/17/80) were in 0 of 7.

- `xs` 13→12, `sm` 15→14, `base` 17→16, `lg` 20→18, `xl` 24→20, `2xl` 30→24, `3xl` 36→30, `4xl` 48→36, `5xl` 72→48, `6xl` 80→60.
- Rendered sizes for `display`/`h1`/`h2`/`h3` barely move (only the _rung name_ they point at changes, to keep the primitive scale monotonic): `display` 72→60px, `h1`/`h2`/`h3` unchanged in px. Rendered sizes that do change: `body` 17→16px, `ui` 15→14px, `eyebrow`/`caption` 13→12px (the eyebrow/caption duplicate this closes), `mono` 13→14px (repointed off `xs` since `xs` alone would give 12px, too small for code).
- Rationale for Tailwind specifically over the other 6: `tailwind.config.tokens.cjs` already wires `fontSize.2xs..6xl` straight onto these primitive vars, so this closes a live scale fork between HDS and the `hirobius/concrete` storefront (which uses Tailwind's stock scale via `extend`) for free, on top of matching the measured convergence.
- Full audit trail, per-system tables, and the corrected/superseded drafts: `hds#283` issue body + comments.
- Not done in this pass (tracked in `hds#283`'s remaining scope): concrete's duplicated `display`/`h1` CSS clamp mins, Figma `figma:push`/`figma:snapshot --ingest` re-sync, `ops`'s 54 call sites on the `xs` rung (no visual gate there).
