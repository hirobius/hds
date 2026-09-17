# Figma sync

`hirobius.tokens.json` is the source of truth. Sync runs one way, code → Figma.
A hand edit in Figma is drift, not a change to the source.

On a Figma Professional plan nothing in CI can read or write variables (the REST
variables API is Enterprise-only), so every Figma step is a local command that a
person, or an agent with Figma access, runs on purpose. Drift detection compares
the model against a committed snapshot of the file, not the live file.

| Command                    | What it does                                                                                                                                 | Talks to Figma?        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `pnpm figma:model`         | Builds `figma/model.json`: collections × modes × variables, text styles, effect styles, plus Brand and Density from `figma/brand-modes.json` | No                     |
| `pnpm figma:push`          | Writes the code that upserts the model into a file, to `figma/push/`                                                                         | No (you run it)        |
| `pnpm figma:snapshot`      | Prints how to take a snapshot; `--ingest <file>` verifies one and writes `figma/snapshot.json`                                               | No (you run it)        |
| `pnpm check:figma-drift`   | Model vs `figma/snapshot.json`: missing, extra, changed, per mode                                                                            | No                     |
| `pnpm figma:native-import` | Fallback: DTCG files for Figma's own Variables ▸ Import, to `figma/native-import/`                                                           | No                     |
| `pnpm figma:links`         | Projects each component's Figma node (`figmaUrl` in the manifest) into the README, Storybook, dev resources and component descriptions       | Only `--dev-resources` |

`figma/model.json`, `figma/push/` and `figma/native-import/` are generated and
gitignored. `figma/snapshot.json` is committed: it records Figma's state.

## Brand and Density

`figma/brand-modes.json` lists the tenants that become modes of the
`Hirobius/Brand` collection. **Demo tenants only.** The library is shared, so a
client tenant never goes in. `pnpm figma:model` (and every command that builds
the model) refuses a listed tenant unless:

- its `metadata.json` carries `"demo": true`, and is tier 1 with its deployment
  and legal groups present and empty. A new client tenant is also tier 1 with
  those groups empty, so the marker is what tells them apart. Neither
  `pnpm scaffold:tenant` nor `tenants/_template` writes it, and adding it is a
  person stating the tenant is not a client;
- its `tokens.json` passes the tenant overlay validator (the one
  `check-tenant-tokens` and `pnpm tokens` run);
- the base mode plus the listed tenants fit a Professional plan's 10 modes per
  collection.

Errors name the field, never its value. A tenant the file does not list is
never read.

| Collection         | Modes                                  | Holds                                                                                                                                                                                                            |
| ------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Hirobius/Brand`   | `Hirobius`, then one per listed tenant | One variable per path a listed tenant overrides: `<path>/Light` and `<path>/Dark` when the path is themed, `<path>/Comfortable` and `<path>/Compact` when a tenant gives it a Compact value, otherwise `<path>`. |
| `Hirobius/Density` | `Comfortable`, `Compact`               | One variable per compacted path, aliasing its two Brand variants. Left out when no listed tenant has a Compact value.                                                                                            |

In the `Hirobius` mode a Brand variable holds the base token's value. A tenant
mode holds that tenant's override, or the base value where it has none. The
token's own variable (for example `radius` in `Hirobius/Role`) keeps its name,
id and bindings, and its value now aliases Brand or Density. A frame resolves
theme, brand and density from three independent modes, the way `[data-theme]`,
`[data-brand]` and `[data-density]` combine in `src/styles/tenants.css`: set
`Hirobius/Semantic` to Dark, `Hirobius/Brand` to a demo tenant, and
`Hirobius/Density` to Compact.

Brand and Density variables have no scopes, so they stay out of every picker
(bind the token variable), and no `codeSyntax`, since they have no CSS variable
of their own. Aliases run both ways between them and Semantic, so the
use_figma push carries all three in `02-semantic.js`.

The model refuses, with the reason:

- a tenant theming a token that lives in a single-mode collection (theme it in
  `hirobius.tokens.json` first, which moves it to Semantic);
- one path varying by both theme and density (build-tokens writes no brand ×
  theme × density CSS);
- a composite override (typography, shadow, elevation), because text and effect
  styles have no modes;
- a Compact mode in `hirobius.tokens.json` itself, because build-tokens writes
  density CSS for tenant overlays only.

An override of a token that is not in Figma (motion, for example) is skipped.
The base density scale (`--hds-space-*` in `src/styles/theme.css`) is not a
token, so Density carries only tenant Compact values today.

## Design ↔ Code links

Each component's Figma node has one source: the `@figma` tag in its JSDoc,
which `pnpm manifest:generate` copies to `componentSpecs[<Name>].figmaUrl` in
`public/hds-manifest.json`. Everything else reads that field
(`scripts/lib/design-links.mjs`), and all of it works on a Professional plan:

| Where                                              | How                                                                                               | Needs                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| README "Design ↔ Code links"                       | `pnpm figma:links` rewrites the marked section                                                    | Nothing                                                                               |
| Storybook `parameters.design`                      | The story meta spreads `designParameters('<Name>')` (`src/stories/design-parameters.ts`)          | `@storybook/addon-designs` to show it as the Design tab                               |
| Figma dev resources "HDS source" and "HDS story"   | `FIGMA_ACCESS_TOKEN=<token> pnpm figma:links --dev-resources --dry-run`, then without `--dry-run` | A personal access token with `file_dev_resources:read` and `file_dev_resources:write` |
| Figma component description and documentation link | `figma/links/use-figma/descriptions-<file>.dry-run.js` through use_figma, then the `.js`          | Figma MCP write access to that file                                                   |

To link a component:

1. In Figma, select the component set and copy its link (Copy link to
   selection). It must carry a `node-id`.
2. Add `@figma <that URL>` to the component's JSDoc.
3. Run `pnpm manifest:generate && pnpm figma:links`.
4. If its story meta does not spread `designParameters('<Name>')` yet, add it.

`pnpm test` fails, and `pnpm figma:links --check` exits 1, when the README
section is stale, a linked component has no story or its story skips
`designParameters`, a story hardcodes a Figma URL, or a `figmaUrl` is not a node
URL.

Story links open the story file on GitHub until `storybookUrl` is set in
`figma/links.json`; then they open the Storybook docs page. The dev resources
push never deletes: a URL already on the node counts as present under any name,
and an "HDS" resource whose URL changed is updated in place. The descriptions
script replaces the description and documentation link of each linked component
set and reports the previous text; its payload carries a checksum, so a script
changed in transit writes nothing. `figma/links/` is generated and gitignored.

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
  … `05-styles.js`. Run them in order, unmodified. An agent retypes each script
  into use_figma's `code` parameter, so each checks two checksums before it reads
  or writes anything: one over its payload, and one over the source of every
  runtime function (`Function.prototype.toString`). A script whose data or code
  changed on the way stops there; only its last two call lines are not covered.
  If Figma's sandbox ever hides function source, the scripts refuse and name the
  development plugin, which Figma loads from disk. With the
  current tokens each script is 46–99 KB of code for the agent to pass through
  (a `--prune` build carries every variable's identity, so moved tokens are
  recognised, and reaches 93–119 KB), so the development plugin is the easier
  path for a full push, a prune or a snapshot.

What a push does:

- **Matches by stable key, strongest first**: the token path stored on the
  variable, collection or style as shared plugin data (namespace `hirobius`), a
  `TOKEN_MIGRATION.md` rename of that path, the variable's `codeSyntax.WEB`, then
  its name. Matching stays inside one collection and one type. A matched variable
  keeps its id, so every layer bound to it stays bound.
- **Cannot move a variable between collections** (the Plugin API has no move).
  When the model moves a token to another collection (#213 moved themed
  component tokens into `Hirobius/Semantic`), the push creates it in its new
  collection and keeps the old variable, with every binding to it. The plan
  lists it under moves and warns. Rebind its layers to the new variable, then
  delete the old one in Figma. Prune never deletes a moved variable, and drift
  reports it as an extra until it is gone.
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
- **Cannot change a collection's default mode** (`defaultModeId` is read-only).
  Figma renders the default mode wherever no mode is set, so a collection whose
  default is not the model's first mode (Semantic defaulting to Dark) is a
  warning on push and a `changed default mode` drift item. Fix it in Figma by
  making the model's first mode the collection's first mode.
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
a push would do. Every push records the model's hash in the file, and the
snapshot carries it. When that hash differs from the model the tokens build now
(the tokens or the model builder changed), or no push is recorded, the report
says the drift may be changes not pushed yet. When it matches, the drift was
made in Figma after the push.

Fix drift in Figma (push again), never in `snapshot.json`: an edited snapshot
fails its checksum.

CI (`ci.yml`, `check-figma-drift.mjs --ci`) fails only on drift a push cannot
explain: Figma was last pushed from exactly the model the tokens build now, yet
differs (edited in Figma after that push). Any other drift is a warning, because
it may be a change waiting for someone with Figma access, and a PR made without
Figma access cannot push. The rule compares model hashes, not commit dates, so a
branch whose token commit predates a snapshot committed later is not blamed.
Until a snapshot is committed the step only adds a notice.

## Native import (fallback)

`pnpm figma:native-import` writes one DTCG file per collection × mode. For each
collection, in the printed order: create the collection in Figma, then import
each file as a mode. An alias inside one file is a DTCG reference; an alias into
another collection uses `com.figma.aliasData` and also keeps the resolved value
for that mode. The importer can only link an alias to a collection that already
exists, so an alias into a collection imported later arrives as that raw value.

The order is Primitives, then Brand, then Density, then Semantic, Component and
Role. Semantic and Role alias Brand and Density, which is what makes switching a
Brand or Density mode change them, so the axes come first. Aliases also run the
other way: a Brand base mode holds the base token's own alias (the `Hirobius`
mode of `role/radius` aliases Semantic `radius/action`). Those base-mode values
import as raw values, and the command lists each one. Run `pnpm figma:push`
afterwards to restore them.

It carries variables only: no `codeSyntax`, text styles or effect styles, and no
stable keys. Run `pnpm figma:push` afterwards to adopt the imported variables
(it matches them by name) and add the rest.

## Not in Figma

Motion, z-index, breakpoints and font-size-relative multipliers stay in code.
The model lists each exclusion with its reason (`notInFigma` in
`figma/model.json`).
