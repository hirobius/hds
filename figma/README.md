# Figma sync

`hirobius.tokens.json` is the source of truth. Sync runs one way, code → Figma.
A hand edit in Figma is drift, not a change to the source.

On a Figma Professional plan nothing in CI can read or write variables (the REST
variables API is Enterprise-only), so every Figma step is a local command that a
person, or an agent with Figma access, runs on purpose. Drift detection compares
the model against a committed snapshot of the file, not the live file.

| Command                    | What it does                                                                                   | Talks to Figma? |
| -------------------------- | ---------------------------------------------------------------------------------------------- | --------------- |
| `pnpm figma:model`         | Builds `figma/model.json`: collections × modes × variables, text styles, effect styles         | No              |
| `pnpm figma:push`          | Writes the code that upserts the model into a file, to `figma/push/`                           | No (you run it) |
| `pnpm figma:snapshot`      | Prints how to take a snapshot; `--ingest <file>` verifies one and writes `figma/snapshot.json` | No (you run it) |
| `pnpm check:figma-drift`   | Model vs `figma/snapshot.json`: missing, extra, changed, per mode                              | No              |
| `pnpm figma:native-import` | Fallback: DTCG files for Figma's own Variables ▸ Import, to `figma/native-import/`             | No              |

`figma/model.json`, `figma/push/` and `figma/native-import/` are generated and
gitignored. `figma/snapshot.json` is committed: it records Figma's state.

## Push

`pnpm figma:push` builds the model (it refuses to write anything if the model
breaks an invariant) and writes two carriers of the same code
(`scripts/lib/figma-runtime.mjs`):

- **Development plugin** (recommended): `figma/push/plugin/`. In Figma desktop,
  Plugins → Development → Import plugin from manifest…, pick
  `figma/push/plugin/manifest.json`. Re-run `pnpm figma:push` after a token
  change; the imported plugin picks up the new `code.js`. Commands:
  - **Plan push (dry run, writes nothing)**: the changes a push would make, and
    anything blocking it.
  - **Push**: applies the plan, re-reads the file, and fails if Figma still
    differs from the model. Built with `--prune`, this command is named "Push and
    prune extras (deletes)".
  - **Take snapshot**: see below.
- **use_figma scripts** (Figma MCP server): `figma/push/use-figma/01-primitive.js`
  … `05-styles.js`. Run them in order, unmodified. Each carries a checksum of its
  payload; a script that was changed or mistyped stops before writing.

What a push does:

- **Matches by stable key, strongest first**: the token path stored on the
  variable, collection or style as shared plugin data (namespace `hirobius`), a
  `TOKEN_MIGRATION.md` rename of that path, the variable's `codeSyntax.WEB`, then
  its name. Matching stays inside one collection and one type. A matched variable
  keeps its id, so every layer bound to it stays bound.
- **Updates before it creates.** Renames that collide (a swap, a chain) go through
  temporary names first.
- **Renames a collection's initial mode** ("Mode 1", or a hand-made "Value") to
  the model's first mode instead of adding a mode next to it.
- **Deletes nothing** unless the carriers were built with `pnpm figma:push --prune`.
  Without prune, variables, styles and modes the model does not own are reported
  as extras, and a name the model needs that an unowned variable holds stops the
  push before anything is written.
- **Refuses before writing** when a text style font is not installed, or when a
  script's aliases point at a collection that is not in the file yet.
- **Ignores collections it does not own**: they are listed as "not managed by HDS".

Each run prints `updated N · created N · deleted N`. A second push of the same
model prints all zeros and writes nothing.

`pnpm figma:push --plan` prints what a push would change against the committed
snapshot, without Figma.

## Snapshot and drift

1. Take a snapshot: the plugin's **Take snapshot** command (then **Download
   JSON**), or run `figma/push/use-figma/snapshot.js` through use_figma and save
   what it returns.
2. `pnpm figma:snapshot --ingest <file>` verifies the checksum and writes
   `figma/snapshot.json`. Commit it.
3. `pnpm check:figma-drift` exits 0 with no drift, 1 with drift (or a snapshot
   edited by hand), 2 when there is no snapshot yet. `--json` prints the report.

The drift report is the push plan read backwards, so it always agrees with what
a push would do. It warns when the snapshot is older than the last change to
`hirobius.tokens.json`: that drift may be token changes that were never pushed.
It also notes when Figma was last pushed from a different model.

Fix drift in Figma (push again), never in `snapshot.json`: an edited snapshot
fails its checksum.

## Native import (fallback)

`pnpm figma:native-import` writes one DTCG file per collection × mode. For each
collection, in the printed order: create the collection in Figma, then import
each file as a mode. Import Primitives first, since the other collections alias
it. An alias inside one file is a DTCG reference; an alias into another
collection uses `com.figma.aliasData` and keeps the resolved value for that mode.

It carries variables only: no `codeSyntax`, text styles or effect styles, and no
stable keys. Run `pnpm figma:push` afterwards to adopt the imported variables
(it matches them by name) and add the rest.

## Not in Figma

Motion, z-index, breakpoints and font-size-relative multipliers stay in code.
The model lists each exclusion with its reason (`notInFigma` in
`figma/model.json`).
