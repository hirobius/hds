---
'@hirobius/design-system': patch
---

The published types did not resolve for any `node16`/`nodenext` ESM consumer.

`tsconfig.dts.json` compiles with `moduleResolution: "Node"`, so `tsc` emitted relative
specifiers the old CommonJS way — `from './app/components/button'`, no extension — into a
package that declares `"type": "module"`. ESM does not guess extensions, so all 150 of them
failed to resolve. `attw` reported `InternalResolutionError` against 7 of the 14 entry
points: `.`, `tokens`, `manifest`, `contexts`, `form`, `brand`, `scroll`.

In practice a Next.js app, or any `"type": "module"` project on `moduleResolution: node16`,
installed this package and got broken types for all of it.

Nothing here could see it. `tsc` typechecks `src/`, every test imports `src/`, and
`smoke:consumer` proved each subpath _imports_ cleanly — which it does; it is the `.d.ts`
resolution that was broken. The emitted output is the one artifact nothing read.

- `scripts/add-dts-extensions.mjs` rewrites each emitted specifier to what it actually
  resolves to (`./button` → `./button.js`, `./context` → `./context/index.js`), and exits 1
  on any specifier that resolves to nothing rather than emitting a path that will fail in
  someone's install. It runs as part of `pnpm build:types`.
- `scripts/check-published-types.mjs` runs `attw` over the packed tarball from
  `smoke:consumer`, so the regression cannot return. Profile `esm-only`, because this
  package has no CommonJS build and node10 cannot read `exports`; the four CSS subpaths are
  excluded because a stylesheet has no types to resolve.

Every checked entry point is now green under `node16 (from ESM)` and `bundler`.
