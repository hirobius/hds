# ADR-038: Consumer-Side Verification Gates the Publish

**Status:** Accepted, retroactive (decided 2026-06-19; recorded 2026-10-13 from commit and PR history). Grew through 2026-06-30.

## Context

`@hirobius/design-system` 0.4.0 and 0.4.1 were published by hand. The release
pipeline had never run green: the Release workflow failed on every push to main
(runs #1 to #3) before it reached publish. Nothing checked what a consumer would
actually receive.

The first consumer smoke test (`26ea66c`, 2026-06-19) found two bugs that were
"both latent in the live 0.4.0/0.4.1":

- `vite.config.lib.ts` externalized the exact string `motion`, not `motion/react`.
  Vite bundled the wrapper and emitted a bare `framer-motion` import. That package
  was not a dependency, so every consumer of a motion-based component broke.
- `three`, `@react-three*`, `postprocessing`, `express`, `cors`, `fuse.js` and
  `zustand` sat in `dependencies` though the published bundle imports none of them.

On 2026-06-30 a second gap showed up (`3f48fc9`). `types` and `exports[*].types`
pointed at raw `./src/index.ts`. A consumer's `tsc --noEmit` compiled that source and
hit `import.meta.env` and imports of files pruned from the tarball. "skipLibCheck
can't help: it skips `.d.ts`, not `.ts`/`.tsx`."

## Decision

Verify the package from the consumer's side, and make `pnpm release` fail if that
check fails.

- `scripts/smoke-consumer.mjs` builds, runs `npm pack`, installs the tarball and
  peers into a throwaway app, resolves every public subpath and imports the JS ones.
- `release` runs `smoke:consumer --skip-build` between `build:lib` and
  `changeset publish` (`390a877`), "so a package that fails consumer resolution can
  never be published."
- The smoke test grew in three steps:
  - a jsdom render probe (`0e1aff6`): mounts Button, Spinner and InlineLink, and
    checks that `tokens.css` still ships vars, fonts and `[data-hds]` scoping;
  - a consumer `tsc --noEmit` and `publint` (`3f48fc9`);
  - a clean-room consumer `vite build` with only Button imported (`2c8ca1c`).
- Ship built `.d.ts` (`build:types` into `dist/types`) and stop shipping `src`.

## Alternatives considered

- Publish with a direct `npm publish` to get past a GitHub Packages 403 on
  `changeset publish`'s `npm info` read (`3432a6f`). It worked once, then was
  reverted in `453dad9`: `npm publish` "is not idempotent", and every later push
  retried 0.5.0 and failed with 409 "Cannot publish over existing version".
- A single rolled-up `.d.ts` (API Extractor) for node16 resolution. The commit
  calls it "a tracked follow-up". The package is ESM and targets bundler resolution.

## Rationale

The package had been judged by its own build, not by what a consumer resolves.
The first consumer-shaped test found two live bugs in minutes. Putting the same test
in the release script makes it impossible to skip by hand.

## Consequences

- 0.5.0 was the first green publish (`b47cead`: "The release pipeline (previously
  never green) now works end-to-end"). It went to GitHub Packages then; see ADR-041
  for the move to public npm.
- The publish saga cost five commits on 2026-06-19: pnpm pin via `packageManager`
  (`068f04e`), the `npm publish` detour, a `PACKAGES_PAT` fallback after the
  Actions token got 403 `write_package` (`85823ed`), and a fix for "Multiple versions
  of pnpm specified" across nine workflows (`453dad9`).
- The CI render probe crashed on Node 20 with `navigator is not defined` (`18af1fe`,
  hds#35) and blocked a publish until jsdom's navigator was provided.
- Still in force on origin/main: `release` is `pnpm build:lib && pnpm smoke:consumer
--skip-build && changeset publish`. `smoke:consumer` now also runs
  `check-published-types`, `check-rsc-directives`, `check-pack-contents` and
  `check-upgrade-css`. `package.json` `types` still points at `dist/types`.

## Lessons

- Test the artifact a consumer installs, not the repo that built it.
- Put the check in the publish command. A gate someone must remember is skipped.
- A publish step in CI must be idempotent, or each later push re-fails it.
- A consumer-side check has its own environment bugs (Node 20 lacks `navigator`).
  Run it in CI early.

## Evidence

- `26ea66c` test(release): add consumer smoke test; fix motion + dep resolution
- `390a877` release: make publishing reproducible via changesets + smoke gate
- `0e1aff6` test(smoke): add jsdom render probe to consumer smoke (P2)
- `18af1fe` fix(release): provide navigator global in smoke-consumer render probe (#35)
- `3f48fc9` fix(pkg): ship built .d.ts so the package typechecks in consumers (A+B) (#36)
- `2c8ca1c` feat(pkg): host-safe variables.css + consumer vite-build gate (C/D/E) (#38)
- `068f04e`, `3432a6f`, `85823ed`, `453dad9` ci(release): the publish saga
- `b47cead` docs: mark 0.5.0 published; only ops re-pin remains
