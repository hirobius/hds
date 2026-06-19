---
"@hirobius/design-system": minor
---

Harden and slim the consumable package surface.

**Packaging**

- Cut the published tarball from ~49 MB / ~400 files to ~0.55 MB / ~207 files:
  the library build no longer copies the 47 MB `public/` tree (portfolio PNGs,
  fonts, JSON) into the package (`publicDir: false`), no longer ships sourcemaps
  (`sourcemap: false`), and no longer drags the whole component-preview universe
  (every component via `import.meta.glob`, the 3D mobius-scene chunk, the lab
  modules, the component-api/token-audit artifacts) into the bundle.
- Excluded demo/lab/3D source (`src/stories`, `src/app/components/lab`, the
  mobius/shaders modules) from the package `files`.

**Consumer resolution (fixes latent breakage in 0.4.0/0.4.1)**

- Externalize `motion/react` correctly so the bundle imports it (resolved via the
  `motion` dependency) instead of emitting a bare `framer-motion` import — a
  package that was never a dependency, which broke every consumer of a
  motion-based component (tooltip, alert, disclosure, …).
- Demote app-only runtime deps (`three`, `@react-three/*`, `postprocessing`,
  `express`, `cors`, `fuse.js`, `zustand`) from `dependencies` to
  `devDependencies`; consumers no longer transitively install the three.js
  ecosystem.

**API surface**

- Added subpath export `@hirobius/design-system/protocol` (bridge envelope).
- BREAKING: removed `ComponentDocPage` and `SpecimenBlock` from the main barrel
  — they are docs-shell renderers, not consumable primitives. Import them from
  the in-repo doc site directly if needed.
</content>
