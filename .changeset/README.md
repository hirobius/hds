# Changesets

Each change a consumer can see ships with two files that travel together until
the release:

- `.changeset/<name>.md`, the release note, with the bump it gives
  `@hirobius/design-system`;
- `upgrade/pending/<name>.json`, its upgrade note: what a consumer has to do,
  in the shape `$defs.pendingNote` of `upgrade/schema.json`.

`scripts/check-upgrade-ledger.mjs` runs in `pretest` (so pre-push, CI and the
Ralph gate) and fails until both are right.

## Adding one

1. `pnpm changeset` and pick the bump:
   - **patch** for a fix or an addition;
   - **minor** for anything breaking while HDS is below 1.0: removing or moving
     an export, prop, prop value, CSS variable, class, subpath, bin or runtime
     dependency, narrowing a peer range, or raising `engines` (hds#445
     decision 3);
   - **major** never: it would cut 1.0, which waits for Adrian's call (#396).
     The gate refuses one unless `upgrade/ALLOW_1_0` exists.
2. `pnpm upgrade:note --name <name>` writes `upgrade/pending/<name>.json`. It
   adds a step for each fact the gate finds since the last release (an export
   removed or moved, an exports key, dependency or bin gone, a peer or engines
   change), each with its facts, what to detect in consumer code and a guessed
   impact.
3. Edit the note:
   - `impact`: `none`, `additive`, `look`, `behavior` or `breaking`, always
     written, `none` included;
   - `plain`: one sentence a non-expert can act on, ending in a full stop.
     Replace every `TODO` line `upgrade:note` wrote; the gate refuses them.
     With impact `none` and nothing to tell, delete it;
   - `steps`: add the changes the diff cannot see (how something looks or
     behaves, a deprecation with `removeIn`, a removed CSS variable). Give a
     step `detect` so the upgrade command can find a use, and `done` when it
     asks the consumer to add something, so the command can tell it is there.
4. Commit both files with the change.

`.changeset/README.md` and `config.json` need no note. A change that ships
nothing (tooling, tests, docs) needs no changeset: put `skip-changeset` in its
commit message. `scripts/check-record-freshness.mjs` asks for a changeset at
push time when `src/`, the shipped codemods, `mcp/`, the ESLint plugin,
`hirobius.tokens.json`, `tailwind.config.tokens.cjs` or a consumer field of
`package.json` (dependencies, peers, engines, exports, bin, files) changes.

## What the gate checks

- Every fact since the newest `docs/api/releases/<version>.json` is listed by
  a step's `facts` in some pending note.
- Every changeset has its note, and every note fits the schema.
- Something breaking (a breaking fact, a note that says `breaking`, or a step
  that removes, moves, renames or folds something) comes with a minor
  changeset below 1.0 and a major from 1.0.
- On the Version Packages PR, when the changesets are gone, the real version
  bump is checked the same way.

## Releasing

`pnpm changeset:version` consumes the changesets, bumps `package.json` and
`CHANGELOG.md`, and refreshes `docs/api/api-baseline.json`
(`scripts/__tests__/check-public-api.test.mjs` checks the two versions match).
The release compiler (hds#451) will merge the pending notes into
`upgrade/releases/<version>.json` and delete them at the same step. Until it
does, the notes stay in `upgrade/pending/` after their changesets are
consumed, and each release is recorded by hand once it publishes: its snapshot,
its notes moved to `upgrade/sources/<version>/notes/`, its ledger and its line
in `upgrade/published.json` (`upgrade/README.md`, "Recording a release by
hand"). Meanwhile the gate counts those notes as the published release's, not
the next one's, and prints what is left to record. Publishing runs from
`.github/workflows/release.yml`, never by hand.
