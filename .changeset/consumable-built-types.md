---
'@hirobius/design-system': minor
---

Ship built TypeScript declarations instead of source, so the package typechecks
cleanly in a consumer.

- `types` and every `exports[*].types` now point at emitted `dist/types/**/*.d.ts`
  (via a new `build:types` step using `tsconfig.dts.json`), not raw `.ts`/`.tsx`
  source. Consumers no longer compile our source, so the prior errors
  (`import.meta.env`, `Cannot find module './lab/tokenUtils'`/`'./Token.module.css'`)
  are gone — under `skipLibCheck`, `.d.ts` are skipped.
- Source is no longer published (`files` drops `src`); the tarball ships only
  `dist/` (+ protocol, tokens json, manifest). Nothing published references a
  pruned path.
- The `manifest` and raw-`tokens` exports are typed (`SystemManifest` / inlined
  DTCG shape) so the emitted `.d.ts` is self-contained (no JSON-path imports);
  CSS side-effect imports are stripped from `.d.ts`.
- Verified: a Vite-style consumer (strict, `skipLibCheck`, bundler resolution)
  can `import { Button } from '@hirobius/design-system'` (and from subpaths) and
  pass `tsc --noEmit` with only react/react-dom installed. `smoke:consumer` now
  gates on that consumer typecheck plus `publint`.
