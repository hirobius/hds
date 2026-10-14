# ADR-049: Audit the built package, not the source

**Status:** Accepted, retroactive (decided 2026-09-22; recorded 2026-10-13 from commit and PR history).

## Context

On 2026-09-22 four separate defects turned up in what `@hirobius/design-system`
actually ships. Each was invisible to the repo's checks. The commits give the same
reason every time: "every test imports src/".

- **Dead guards (hds#261).** Library code read `import.meta.env`. Vite's library build
  evaluates that at HDS's build time, so it baked to a constant inside `dist/`. `Icon`
  never warned about a missing `icon`, `warnOnce` never emitted a deprecation warning
  ("the whole deprecation channel was silent"), and `TenantProvider` never wrote
  `data-brand` or `data-tenant`.
- **No client directive (hds#268).** `dist/` carried 20 `useState` calls and zero
  `'use client'` directives while `CONSUMING.md` advertised Next.js. In the App Router a
  module is a Server Component until it says otherwise, so the first
  `import { Button }` in a Next.js page threw. `smoke:consumer` builds with Vite, which
  has no server/client boundary.
- **Unresolvable types (hds#262).** `tsconfig.dts.json` compiled with
  `moduleResolution: "Node"`, so `tsc` emitted 150 extensionless relative specifiers into
  a `"type": "module"` package. `attw` reported `InternalResolutionError` against 7 of
  the 14 entry points. A Next.js app or any `node16` ESM project got broken types.
- **Unnameable props types (hds#269).** `src/index.ts` uses `export *`, so a props type
  ships only if its module exports it. 41 did not. `(props: AlertProps) => <Alert {...props} />`
  did not compile for a consumer.

## Decision

Add gates that read the built or packed output, and fix each defect at its source.

- Library code reads `process.env.NODE_ENV`, which consumer bundlers substitute at their
  own build. `TenantProvider` takes a `slug` prop instead of an environment variable.
  `tests/no-shipped-import-meta-env.test.ts` fails on any `import.meta.env` reachable
  from shipped source. `src/lib/env.test.ts` pins the source shape.
- `'use client'` is decided per chunk. A chunk gets it if it imports React or imports a
  chunk that does. The rule lives in `scripts/lib/rsc-directive.mjs`, is applied by a
  `generateBundle` plugin, and is re-derived from the emitted files by
  `check-rsc-directives.mjs`. The gate fails in both directions: missing and spurious.
- `scripts/add-dts-extensions.mjs` rewrites emitted specifiers and exits 1 on any that
  resolves to nothing. `check-published-types.mjs` runs `attw` over the packed tarball.
- `check-props-exports.mjs` runs from `pretest`. A props type must be exported if it
  annotates the props of a component the module exports.

## Alternatives considered

- **A blanket `'use client'` banner.** Rejected. The directive makes every export of a
  module a client reference when imported from server code. `brand`, `tokens`, `cn`,
  `manifest` and `mui` are framework-free by design, so stamping them would turn
  `tokens.color.primary` into "an opaque proxy in a Server Component".
- **Wrapping the env read in `typeof process !== 'undefined' && ...`.** Tried and
  rejected. The bundler substitutes only the member expression, so the `typeof` check
  survives, a browser bundle always fails it, and the answer inverts in production.
  `env.ts` records the shape that works: a bare read inside `try`, with `catch` covering
  a runtime with no `process`.
- **Exporting every type with a `Props` suffix.** Rejected. It would add 8 types that are
  deliberately private, such as cva `VariantProps` aliases and composition bases.
- **`attw` without a profile.** Rejected. This package has no CommonJS build, so node10
  and node16-from-CJS findings are by design. The gate uses `--profile esm-only` because
  "a gate that is always red gets deleted".

## Rationale

`tsc` checks `src/`. Tests import `src/`. `smoke:consumer` proved each subpath imports,
not that its types resolve or that it survives a server boundary. "The emitted output is
the one artifact nothing read." The gates therefore read that artifact. The `'use client'`
gate checks both directions because "both failures are real".

## Consequences

- `TenantProvider` changed from an environment variable to a `slug` prop. This was a
  breaking change with no working old behaviour to preserve.
- `check-published-types`, `check-rsc-directives`, `check-pack-contents` and others run
  from `smoke:consumer`. `check-props-exports` runs from `pretest`. All of these scripts
  and `src/lib/env.ts` exist on origin/main today.
- The same pass found the registry labelled 24 of 55 gates `manual` that were reachable
  from `package.json` scripts. `check-validator-wiring` now requires `manual` to mean
  detected channel `none`.
- hds#231 (`d1cd5ee`) showed the props gate working. `HdsSelect` was never exported from
  the barrel, and `check-props-exports` failed once `Select` became reachable.
- Plugin shape and `tsconfig.typecheck.json` coverage of `vite.config.lib.ts` were fixed
  in review. The commit notes the typecheck of that seam "is checked, not exhaustively
  checked".

## Lessons

- A check that imports `src/` cannot see what the build does to `src/`. Gate the packed
  artifact.
- A framework boundary can be broken by too much marking as well as too little. Test both
  directions.
- Measure a proposed guard before trusting it. The `typeof process` form looked safe and
  inverted production behaviour.
- A gate on a design-time exception needs a profile that excludes it, or it will be
  deleted.

## Evidence

- `22ec2b5` fix(lib): three shipped guards were dead, baked by our own build (#261)
- `c2b9e86` fix(build): ship 'use client' per chunk, and gate it in both directions (#268)
- `c1561f5` fix(guardrails): the registry mislabelled 24 gates, and the published types
  resolved for nobody (#262)
- `a5d33b6` feat(api): export the 41 props types a consumer could not name (#269)
- `d1cd5ee` fix(select): export HdsSelect from the design-system barrel (hds#231)
