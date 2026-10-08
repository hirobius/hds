# Upgrade ledger

Each release of `@hirobius/design-system` gets one machine-readable record of
what it changed for a consumer: `upgrade/releases/<version>.json`, from 0.17.0
on (see [The floor](#the-floor)). The upgrade
command (`npx @hirobius/design-system@latest upgrade`, hds#452) reads it to run
the codemods and report what is left, and UPGRADING.md, `upgrade/index.json`
and the `release` object of `status.json` are compiled from it
([What it compiles to](#what-it-compiles-to)). All of it ships in the package
except `upgrade/pending/`, `upgrade/sources/`, `upgrade/published.json` and
this README.

## What a ledger holds

- **Release:** `version`, `date`, `bump`, a `summary` of 140 characters at
  most, and `backfilled` (true when the record was written after the release
  shipped). `date` is the day `pnpm changeset:version` cut the release (its
  Version PR as last regenerated; the PR publishes when it merges), or, for a
  backfilled release, the day npm published it.
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
  - `done`, in the same shape, says the consumer has already made the change:
    for a step that asks them to add something, such as an import.
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
   export names of each entry (tooling entries such as `./eslint-plugin`
   included) with the module that declares them, dependencies,
   peers with their optional flag, engines, exports keys, bins and files.
2. **Diff.** `node scripts/upgrade/diff.mjs <previous> <version>` lists the
   facts between two snapshots: exports removed, moved or added, exports keys,
   dependencies, peers, engines and bins.
3. **Steps.** Every fact except an addition needs a step that lists it in
   `facts`. Changes the diff cannot see (how something looks or behaves, a
   deprecation, a rename) come from the CHANGELOG and cite its line.

Releases that shipped before their ledgers were written are backfilled:
0.17.0 to 0.21.0. `node scripts/upgrade/build-ledger.mjs <version>` builds each one from
its two snapshots and inputs frozen in `upgrade/sources/<version>/`:
`release.json` (the release fields, how its removed and moved names are
classified, and the steps only the CHANGELOG records, each with its line and
the text that finds it) and any data file it names. For 0.20.0 those are
copies of `codemods/removed-0.20.json` and the `RENAMES` map in
`codemods/hds-prefix.mjs` as 0.20.0 published them, so a later edit to the
live codemod data, or to the CHANGELOG, can never rewrite a shipped ledger. A
test keeps every committed ledger equal to the build of its sources
(`build-ledger.mjs --check`), and another that each cited line still holds its
text.

The 0.16.0 to 0.19.1 diffs hold only additions (`/patterns`, `/icons`, the
`hds-patterns-subpath` bin, new names), so those ledgers carry the look,
behavior and deprecation steps from each CHANGELOG section. 0.18.0 and 0.19.1
have no step: nothing in them asks anything of a consumer. Every tarball from
0.16.0 on has `dist/types` for each JS entry, so `snapshot.mjs` reads them all
unchanged; a tarball without one would stop it with the entry named, rather
than record a guess.

A deprecated step's `removeIn` is what its release announced. When the release
named no removal, it is the target a later release set, and the `$comment` of
`upgrade/sources/<version>/release.json` cites it: 0.17.0 kept its seven
spacing aliases with no removal release, and their 1.0.0 comes from 0.20.0. A
later release may remove the name sooner: 0.17.0 deprecated the root pattern
imports and the `Hds*` names for 1.0.0, and 0.20.0 removed them. UPGRADING.md
keeps such a deprecation in its release's Coming next and says which release
took it away ("Removed early, in 0.20.0"), name by name when only some of its
names went; `upgrade/index.json` lists only what is still deprecated.
`scripts/__tests__/upgrade-deprecations.test.mjs` fails while a `@deprecated`
on the public surface has no deprecation step (Divider `strong` and
InlineCode `compact`, deprecated before the floor, are recorded from 0.22.0).

0.21.0 shipped with an upgrade note for each of its seven changesets, but
before the compiler (hds#451), so its ledger is built the same way from the
notes themselves, frozen at `upgrade/sources/0.21.0/notes/` when their
changesets were consumed. `release.json` lists them under `notes`, each citing
its changeset's CHANGELOG entry. Each note step becomes a ledger step field for
field (impact, plain, detect, done, removeIn, facts), with the version on its
id. These steps are not marked `backfilled`, because they were written before
the release.

From 0.21.0 on, each changeset carries an `upgrade/pending/<name>.json` note
(hds#448; how to write one is in `.changeset/README.md`, and `pnpm
upgrade:note` pre-fills it). `scripts/check-upgrade-ledger.mjs` runs in
`pretest` and fails when a fact since the last release snapshot has no step,
a changeset has no note, or something breaking ships under less than a minor
below 1.0. It also fails what `pnpm changeset:version` would refuse or
misfile: a note step that lists a fact the diff no longer has (a reverted
removal), and a note with no changeset of its name (hds#541). `pnpm changeset:version` compiles the notes into the release's
ledger ([At release time](#at-release-time)). CSS facts, such as removed classes and changed variable
values, come with hds#449; until then a step of kind `removed` written by hand
covers one, and the gate counts it as breaking.

## At release time

`pnpm changeset:version` (which the release workflow runs to open the Version
PR) runs `changeset version`, then `node scripts/upgrade/compile.mjs
--release`, which records the release it just cut:

1. It builds the ledger in memory from the notes in `upgrade/pending/` and
   the snapshot of the tree, read from source with no build. A fact no note
   step lists, or a step listing a fact the diff lacks, stops it with nothing
   written. A `look`, `behavior` or `breaking` note with no steps becomes one
   step from its plain line (`<kind>/<changeset>`; kind `manual` when it is
   breaking).
2. It writes `docs/api/releases/<version>.json`, freezes each note byte for
   byte at `upgrade/sources/<version>/notes/<name>.json`, writes
   `upgrade/sources/<version>/release.json` (each note cites its changeset's
   CHANGELOG entry, found by the commit that added the changeset, as
   `changeset version` writes it, else by the changeset's first line read
   back from git at HEAD; `.changeset/<name>.md` when neither finds one, which
   `check-upgrade-ledger` then fails on the Version PR, naming the fix) and
   builds `upgrade/releases/<version>.json` from them with `build-ledger.mjs`,
   so every ledger, backfilled or not, is built from frozen sources.
3. It puts an `### Upgrade` block at the top of the new CHANGELOG section,
   before the citations are numbered: the command (the one command once the
   package ships it, the exact install until then), then at most five lines,
   so the GitHub Release leads with it.
4. It adds the version to `upgrade/published.json` (the Version PR publishes
   when it merges), deletes the merged notes and regenerates UPGRADING.md,
   `upgrade/index.json` and `status.json` `release`. A rerun replaces the
   Upgrade block rather than adding a second one.

For a prerelease (changesets pre mode, `.changeset/pre.json`, or any version
with a prerelease tag such as `0.22.0-next.0`) it records nothing: the
prerelease's notes stay in `upgrade/pending/` for the release that follows it,
and `check-upgrade-ledger` treats them as that release's, so a note with no
changeset still fails.

The release workflow (changesets/action) regenerates the Version PR from main
on every push to main, so an edit made on the PR itself is lost at the next
push. Everything the record needs therefore comes from main. The summary is
counted from the steps ("1 change to make by hand (1 breaking) and 1 that
looks different.") unless main has `upgrade/pending/summary.txt`: one line of
at most 140 characters, which becomes the summary and is deleted with the
notes. The gate checks its length; write it in the PR that readies the
release.

## What it compiles to

`node scripts/upgrade/compile.mjs` writes, from the committed ledgers only:

- **UPGRADING.md.** Its first lines say it only knows the releases up to the
  installed version and where newer steps come from; then how to upgrade (the
  one command when `package.json#bin` has `design-system`, hds#452; the manual
  route until then: the exact version, the codemods, the Do by hand list);
  then every release, newest first, with its summary and four lists. Each step
  lands in exactly one: a `deprecated` step in **Coming next** (with the
  release that took it away, when a later step removes, moves, renames or
  folds it); a step with `auto` in **Fixed for you**; a `look` step that
  neither takes something away nor is `manual` in **Looks different**;
  anything else in **Do by hand**, breaking first. An empty list is left out.
  Steps of one list whose sentences differ only in the name share one bullet
  that lists the names.
- **`upgrade/index.json`**: every release with its breaking count, the
  [floor](#the-floor) and what is deprecated today with its `removeIn`: each
  imported name and class still deprecated, or the step's subject (a token
  path, a prop) when it lists neither.
- **`status.json` `release`**: the newest release for the fleet dashboard.

`node scripts/upgrade/compile.mjs --check` runs in `pretest` and fails,
naming the file and the fix, when any of the three differs from what it would
write. UPGRADING.md and `upgrade/index.json` are in `.prettierignore`.

## Recording a release by hand

A release cut without `pnpm changeset:version` (so without `compile.mjs
--release`) is recorded by hand once npm has published it, in one follow-up
PR with `skip-changeset` in its commit message (nothing in it ships):

1. `node scripts/upgrade/snapshot.mjs --from-npm <version>` writes
   `docs/api/releases/<version>.json`; the same command with `--check` must
   then pass.
2. Move each note whose changeset the release consumed (its
   `.changeset/<name>.md` is gone) from `upgrade/pending/<name>.json` to
   `upgrade/sources/<version>/notes/<name>.json`, unchanged. A note whose
   changeset is still pending stays where it is.
3. Write `upgrade/sources/<version>/release.json`, with
   `upgrade/sources/0.21.0/release.json` as the model: `version`, `previous`,
   `date`, `summary`, `backfilled: true`, and under `notes` each moved note's
   name with the `source` of its changeset's CHANGELOG entry
   (`CHANGELOG.md:<line>`, numbered as the file read when the release shipped:
   `changelogSource()` in `scripts/upgrade/ledger.mjs` gives it) and the
   `needle` text that finds that line.
4. `node scripts/upgrade/build-ledger.mjs <version>` writes
   `upgrade/releases/<version>.json`. It stops on a fact no note step lists.
5. Add the version to `upgrade/published.json`, and move the ranges in this
   README ("0.17.0 to <version>").
6. `pnpm test`.

Until that PR lands, `package.json` names a version with no snapshot. Once
changesets are pending again, the gate treats each note in `upgrade/pending/`
whose changeset is gone as that release's: its steps still cover their facts,
but neither it nor those facts count toward the next bump (its Version PR
already checked them), and the gate prints these steps with the release's
version and notes filled in.

## The floor

The floor is the oldest version the upgrade command can upgrade from. Below
it, the command changes nothing and exits 2; follow CHANGELOG.md by hand up to
the floor. It is 0.16.0, the oldest committed snapshot: the 0.17.0 to 0.21.0
ledgers cover every release after it through 0.21.0, so a consumer still on
0.16.0 crosses no change up to 0.21.0
that a step does not report.

`upgrade/published.json` lists every version npm has published. A test fails
while a release after the floor has no snapshot or no ledger, so a release
that ships without them (as 0.21.0 first did) fails the next `pnpm test`.
`compile.mjs --release` adds each release there with its snapshot and its
ledger on the Version PR ([At release time](#at-release-time)); a release cut
without it is added by hand
([Recording a release by hand](#recording-a-release-by-hand)). The upgrade
command will refuse to report "done" across a release that has no ledger.

`floor()` in `scripts/upgrade/history.mjs` computes the floor, for `floor` in
`upgrade/index.json`. Its `historyProblems()`, run by a test, fails
when a snapshot after the floor has no ledger, a ledger names the wrong bump,
or a fact between two consecutive snapshots (an export removed or moved, a
dependency, peer, engine, exports key or bin) has no step. It reads only
committed snapshots; the published list is what catches a missing one. A
release cut without `compile.mjs --release` is in neither, so it stays
invisible to the test; the gate's "not recorded" line above is the prompt.

## Who is a consumer

One rule, used by `pnpm upgrade:consumers` (`scripts/upgrade/consumers.mjs`, hds#453) and by the ops
dashboard (hirobius/ops#444), so both always count the same repos.

A repo is an HDS consumer when:

1. It belongs to the `hirobius` org and `HDS_FLEET_TOKEN` can see it, public or private.
   `hirobius/hds` itself never counts.
2. On its default branch, the root `package.json` or a workspace `package.json` lists
   `@hirobius/design-system` in `dependencies`, `devDependencies` or `peerDependencies`. Each
   such `package.json` is one importer. Workspaces are the globs in package.json `workspaces`
   (an array, or `{ "packages": [...] }`) and in pnpm-workspace.yaml `packages`, `!` globs
   excluded, matched against the repo tree; nothing under `node_modules` is a workspace.
3. Its installed version, per importer, is what the root lockfile resolves: pnpm-lock.yaml (v6,
   v9), npm-shrinkwrap.json or package-lock.json (v2, v3), yarn.lock (v1, berry) or bun.lock.
   With several lockfiles, package.json `packageManager` picks one. With none, the version is
   unknown. A lockfile that resolves more than one version holds two copies of HDS. The parsers
   are `codemods/lib/installed-version.mjs`, shared with the upgrade command (hds#452).

A consumer stays in the list but is marked **skip**, and gets no upgrade notice, when it is
archived, has issues disabled, or has the `hds-frozen` topic.

**Names stay private.** hds and ops are public, so the list is never committed. Anything posted
to a public surface (a PR comment, an Actions log) goes through `redact()`: public repos are
named, and each private one becomes "private consumer N" with its ranges, versions and counts,
but no name, path or package name. `pnpm upgrade:consumers --out` writes the full list to
`.upgrade-consumers.json`, which is gitignored; the command refuses a path inside the repo that
git would track.

Token: `HDS_FLEET_TOKEN`, a fine-grained token with Contents and Metadata read on the org's
repositories (create it at https://github.com/settings/personal-access-tokens, then save it at
https://github.com/hirobius/hds/settings/secrets/actions). `GITHUB_TOKEN` is accepted locally,
never inside GitHub Actions, where it can only see hds.
