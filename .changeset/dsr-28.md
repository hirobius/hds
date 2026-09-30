---
'@hirobius/design-system': patch
---

Compound components no longer mutate the Radix Root export: `AlertDialog`, `Dialog` and `Card` are assembled with one pure `Object.assign` around a wrapper of their own (parts, names and types unchanged), so consumers on webpack/esbuild get smaller Button-only bundles. Every top-level `forwardRef` / `cva` / `createContext` / `withHdsPortal` call under `src/` now carries `/* @__PURE__ */`, enforced by a new pre-commit gate (`scripts/check-pure-annotations.mjs`, `--fix` available), and the Button-only budget probe also bundles with esbuild and fails if any `@radix-ui/react-dialog` or `@radix-ui/react-alert-dialog` code reaches a Button-only consumer.
