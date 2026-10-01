# Upgrade ledger

Every release of `@hirobius/design-system` has one machine-readable record of
what it changed for a consumer: `upgrade/releases/<version>.json`. The upgrade
command (`npx @hirobius/design-system@latest upgrade`, hds#452) reads it to run
the codemods and report what is left, and UPGRADING.md and `upgrade/index.json`
are compiled from it (hds#451).

## What a ledger holds

- **Release:** `version`, `date`, `bump`, a `summary` of 140 characters at
  most, and `backfilled` (true when the record was written after the release
  shipped).
- **Steps,** one per change:
  - `id` is `<version>/<kind>/<subject>`, such as `0.20.0/moved/Page`.
  - `kind` says what changed: removed, moved, renamed, folded, deprecated,
    value-changed, look, behavior, dependency, peer, engines, exports, tenant or
    manual.
  - `impact` says what happens to a consumer that does nothing: none, additive,
    look, behavior or breaking.
  - `plain` is one sentence a non-expert can act on.
  - `auto` names the codemod bin that applies the step.
  - `detect` says how to find a use in consumer code: named `imports`, `jsx`
    tags, `cssVars` read, `cssVarWrites`, `classes`, `bareImports` of other
    packages, or a `regex`.
  - `removeIn` is the release that removes a deprecated name.
  - `facts` lists the snapshot-diff facts the step accounts for.
  - `source` is a CHANGELOG line (numbered as the file read when the release
    shipped), a codemod data file, or the snapshot diff.

The shape is `upgrade/schema.json`. It is generated from the zod source in
`scripts/upgrade/schema.mjs`, and `node scripts/upgrade/schema.mjs --check`
runs in `pretest`. Its `$defs` also hold the shapes of `upgrade/index.json` and
of a release snapshot.

## How a release fills it

1. **Snapshot.** `node scripts/upgrade/snapshot.mjs --from-npm <version>`
   writes `docs/api/releases/<version>.json` from the published tarball: the
   export names of each entry with the module that declares them, dependencies,
   peers with their optional flag, engines, exports keys, bins and files.
2. **Diff.** `node scripts/upgrade/diff.mjs <previous> <version>` lists the
   facts between two snapshots: exports removed, moved or added, exports keys,
   dependencies, peers, engines and bins.
3. **Steps.** Every fact except an addition needs a step that lists it in
   `facts`. Changes the diff cannot see (how something looks or behaves, a
   deprecation, a rename) come from the CHANGELOG and cite its line.

0.20.0 is the first ledger. `scripts/upgrade/build-ledger-0.20.mjs` builds it
from the 0.19.1 and 0.20.0 snapshots, `codemods/removed-0.20.json`, the
`RENAMES` map in `codemods/hds-prefix.mjs` and the CHANGELOG, and a test keeps
the committed file equal to its output. Next, each changeset carries an
`upgrade/pending/<name>.json` note (hds#448) and `changeset version` compiles
the notes into the release's ledger (hds#451). CSS facts, such as removed
classes and changed variable values, come with hds#449.

## The floor

The floor is the oldest version the upgrade command can upgrade from. Below
it, the command changes nothing and exits 2; follow MIGRATIONS.md by hand up to
the floor. It is `floor` in `upgrade/index.json` and will be 0.16.0 once the
0.17.0 to 0.19.1 ledgers are backfilled (hds#450). Today only 0.20.0, from
0.19.1, has a ledger.
