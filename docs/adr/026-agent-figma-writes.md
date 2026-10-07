# ADR-026: Agents May Write to Figma, on a Staging File

**Status:** Accepted (2026-09-20); amended 2026-10-07: one library file, which agents write and tokens sync into, never deleting anything in it and never publishing it; the staging duplicate of §2 became that library; and HDS Staging, a separate scratch workbench, is where agents draft new components before redrawing them in the library (see [Amendment (2026-10-07)](#amendment-2026-10-07-one-library-agents-write-it-adrian-publishes)). Supersedes ADR-025's agent-write constraint (Consequences, "Live Figma reads and writes need Adrian's authenticated MCP session"). Every other part of ADR-025 stands.

## Context

ADR-025 (2026-09-17) ended with a constraint that reads as a platform limit but is not one:

> Live Figma reads and writes need Adrian's authenticated MCP session. Agents build and test
> against injected or mocked ports and hand live runs to Adrian.

That was written under uncertainty, not from a measurement. ADR-025's own "Still unverified"
list included _"whether the Pro upgrade is complete with a Full seat"_ — so at the time nobody
knew what the account could do. The constraint was the safe default while that was open.

Three things have since been checked, all on 2026-09-20:

1. **The account is fully provisioned.** `whoami` through the Figma MCP server returns
   `adrian@hirobius.com`, **Full seat**, **admin**, tier `pro`, on team `Hirobius`
   (`team::1107784138532077495`). This closes the ADR-025 unverified item.
2. **Reads work live from an agent session.** The library was read in-session:
   `HDS Tokens & Components` (`c8MaVgwxOlxm4wr8wnH0Z4`) returned Button
   (variant × tone × size × state), IconButton, PageButton, EmptyState, Pagination, Form and
   an Icon set — real component sets with authored descriptions, last updated 2026-07-03.
   This also corrects a reading of the manifest: the figure "1 of 120 components" counts
   `@figma` links in code, not components in Figma.
3. **ADR-025 already recorded that writes work.** Its own capability table lists
   _Plugin API variables / `use_figma`_ as **Yes** on Pro ("remote MCP on all plans; writes
   are a free beta that will become usage-billed"). The constraint therefore never followed
   from the plan. It followed from not yet knowing the seat.

Two further facts make the constraint costly rather than merely cautious:

- **The safety machinery it protects has never run.** `figma/snapshot.json` does not exist,
  so `check:figma-drift` exits 2 and the whole push / drift / snapshot apparatus is inert.
  The checksum-over-`Function.prototype.toString` guards, the four-tier stable-key matching
  and the prune modes defend a path nobody has walked, while the actual gap — 119 of 120
  components carrying no `@figma` link — is unguarded.
- **The direction changed.** As of 2026-09-20 the design system is the primary product and
  portfolio piece rather than infrastructure serving a site factory. The workflow that
  matters under that direction — an agent building a component in Figma, then syncing it to
  code and Storybook — is exactly what the constraint forbade.

Figma branching is Organization-and-above (ADR-025 capability table), so "write to a branch"
is not available on Pro. A duplicate file is.

## Decision

### 1. Agents may write to Figma through the MCP server

`use_figma` and the other write tools are available to an agent session under Adrian's
authentication, the same as reads. No separate approval per call.

### 2. Never to the published library

> Superseded 2026-10-07 by the [amendment](#amendment-2026-10-07-one-library-agents-write-it-adrian-publishes) below: the staging file became the library, and agents write it. Kept as written, as the record of the earlier rule.

The published library file — `HDS Tokens & Components`, `c8MaVgwxOlxm4wr8wnH0Z4` — is
**read-only to agents**. Every consumer of HDS resolves components and variables from it, so
an agent write there propagates instantly and irreversibly to every file that subscribes.

Agent writes target a **staging file**: a duplicate of the library, recorded in
`figma/links.json` as `stagingFileKey`. Adrian promotes staging → library by hand. Pro has no
branching, so there is no automatic merge and this step cannot be skipped.

Until `stagingFileKey` is set, an agent has no legal write target and the rule is unchanged
in practice — which is the intended failure mode. An unset key blocks writes; it does not
silently redirect them at the library.

### 3. The demo-tenant rule is untouched

`figma/brand-modes.json` still admits demo tenants only, still requires `"demo": true`, and
`scripts/lib/figma-brand-modes.mjs` still refuses anything else. A client tenant never enters
a shared file, staging included — staging is a duplicate of a shared library, not a private
scratchpad.

### 4. Budget the read limit

Pro allows 200 MCP read calls a day and 10 a minute. An agent enumerating a library burns
these fast. Batch reads, prefer `search_design_system` over walking nodes, and stop rather
than retry on a rate-limit error — a retry loop spends the day's budget in a minute.

### 5. Revisit when the write beta ends

`use_figma` writes are a free beta that Figma has said will become usage-billed. When that
lands, this ADR gets a cost line or a successor.

## Consequences

- Adrian stops being the bottleneck for exploratory Figma work. He remains the only path from
  staging to the published library, which is where the irreversibility actually lives.
- The promotion step is manual and Pro cannot automate it. That is the accepted cost of
  keeping the library safe on a plan without branching.
- `figma/links.json` gains `stagingFileKey`. A null value means agents have no write target.
- The read budget becomes a real constraint on agent sessions for the first time, because
  agents now do the reading. 200/day is not generous against a 120-component library.
- ADR-025's architecture is otherwise unchanged: the repo is still the source of truth, sync
  still runs one way, drift is still measured against a committed snapshot.
- Resolved from ADR-025's "Still unverified" list: the Pro upgrade **is** complete with a Full
  seat, and the Figma file **does** contain real published component sets. The rest of that
  list stands.

## Amendment (2026-10-07): one library, agents write it, Adrian publishes

**Decisions (Adrian, 2026-10-07, in chat).** Four, and they override §2 and the
Consequences above where they differ. §1 (agents write through the MCP server), §3 (demo
tenants only) and §4 (the read budget) stand. Code is still the source of truth (ADR-025).

### A1. Agents may write components in the HDS library

An agent may restyle or fix an existing component, add a component, and copy or redraw a
component, in the library itself. An agent **never deletes** anything in the library: no
node, component, variant, page, variable, collection, mode or style. An agent **never
publishes**: Adrian clicks Publish, so nothing an agent writes reaches a subscribing file
until he has looked at it. (HDS Staging, A4, is the one file where an agent may delete.)

### A2. Retiring a component without deleting it

- A component **deprecated in code** (`@deprecated` on the component in `src`) moves to a
  page named "Deprecated" and stays published. Its description starts
  `Deprecated: use <replacement>. Removed in <removeIn>.`, and its `@figma` link stays.
- A component **removed from code** moves to a page named "Archive" and is renamed
  `_<Name> (archived 2026-10-07)`, with the date it was archived. The leading underscore keeps
  it out of publishing. Adrian reviews the Archive page and deletes what he no longer wants.
- `figma/inventory.json` classifies the Archive page as `archive`, so
  `check-figma-coverage` never asks code to claim what waits there. A "Deprecated" page
  stays a components page: its components are still in code.

On 2026-10-07 the 37 components removed from code on main went to the Archive page
(`2083:2`). None was deprecated at component level (every `@deprecated` in
`src/app/components` is on a prop), so there is no Deprecated page yet.

### A3. The staging copy is the one library

"HDS Tokens & Components (Copy)", `2VgBbVpKiDnu0aftJEVyBQ`, the staging duplicate of §2,
became the one HDS library; Adrian renamed it "HDS Tokens & Components" and published it.
The duplicate model of §2 ends with it: there is no duplicate to promote, and nothing to
promote. The old library, `c8MaVgwxOlxm4wr8wnH0Z4`, is renamed
"HDS Tokens & Components (old)" and retired. Adrian did both renames and published the new
library on 2026-10-07; the old file was never published (Adrian, 2026-10-07), so there is
nothing to unpublish. §2 ("The published library file") and the Consequences above ("real
published component sets") call it published, as ADR-025 and older notes do; that was
wrong: it was the library file, never published, so no file ever subscribed to it.

Variables and tokens therefore sync straight into the library: the Sync plugin (ADR-032)
and `delta.js` (ADR-033) target it. Both still never delete. A deliberate prune is still
the promote plugin (`pnpm figma:push --prune`), and only Adrian runs it. No carrier an
agent runs prunes: `pnpm figma:push --prune` writes no use_figma push script, the builder
refuses `prune`, and every use_figma script (the push scripts, `snapshot.js`, `receipt.js`
and `delta.js`) first refuses any file but the library. The promote plugin, which Adrian
runs, applies Sync's file guard before any command, so it too runs in the library only.

In `figma/links.json`, `libraryFileKey` is `2VgBbVpKiDnu0aftJEVyBQ` and the old key is
listed under `retiredFiles`. `check-figma-retired-keys` rejects a reference to a retired key
in `src`, `public`, docs data, figma data, `mcp/`, `content/docs` and the files the package
ships from the repo root, and the Sync plugin, the promote plugin and every use_figma script
refuse a retired file.

### A4. HDS Staging: a workbench for new components

"HDS Staging", `C85ZXnwtVc4AteeIOZfXRC` (`stagingFileKey` and `stagingFileName` in
`figma/links.json`), is a clean file Adrian created on 2026-10-07 with the library enabled
and no local variables by design. It is not a duplicate of the library, and nothing in it
is promoted. It is where an agent drafts a **new** component:

1. **Draft** the component in HDS Staging, bound to the library's own variables and styles
   (enabled from the library, found by name), creating none.
2. **Ingest** it when it is ready: redraw it in the library with
   `figma/COMPONENT-DRAWING-RECIPE.md`, since Figma cannot copy nodes between files. The
   ingest is a library write, so the guard rails below apply to it.
3. **Link** its `@figma` tag to the library node, never the draft, and run
   `pnpm manifest:generate` and `pnpm figma:links`.
4. **Clean up:** the agent deletes the draft from HDS Staging.

Agents may delete in HDS Staging: it is a scratch file nobody subscribes to. They never
delete anything in the library. §3 holds there as in the library: demo tenants only, never
a client's, because HDS Staging is shared with whoever can open it even though it is no
longer a duplicate of the library. Sync, `delta.js` and the promote plugin never target HDS
Staging: tokens and variables sync into the library only, and staging has no local
variables to sync. No carrier bakes its key, so the Sync plugin, the promote plugin,
`delta.js` and every use_figma script refuse it as they refuse any file but the library. `check-figma-retired-keys` also fails on a link
from code (an `@figma` tag, a Code Connect template, the manifest, `figma/disposition.json`)
to HDS Staging, because a shipped component links the library. HDS Staging is optional:
without `stagingFileKey` there is no workbench, and an agent drafts nothing; `pnpm
figma:push` refuses a staging key or name that is the library's or a retired file's.

Restyling, fixing or copying an existing component needs no draft: it happens in the
library under the guard rails below. A draft in HDS Staging is for a component the library
does not have yet, so that a half-drawn one never sits in the library between publishes.

### Why

- §2 assumed that promoting staging into the library was a short manual step. It was not.
  Pro has no branching (ADR-025 capability table), so there is no merge, and promotion meant
  copying components between files by hand. That held hds#303 (components drawn in staging
  and verified live on 2026-09-27) and hds#446 (the Tooltip restyle) on Adrian's time for
  weeks. His answer: "I'm not doing this by hand."
- The copy already held everything the old library had, under the same node ids. The Figma
  stage of 2026-10-07 compared them: all 117 top-level components and all 236 variants of
  the old file exist in the copy, 41 of the 47 non-icon components differ only by the
  typography bindings and token-driven sizes the copy adds, and the one thing the old file
  had ahead, that day's Tooltip restyle, was carried over. Making the copy the library ends
  promotion instead of automating it, and re-pointing a link is a file-key swap.
- §2 said an agent write in the library "propagates instantly and irreversibly to every
  file that subscribes". A library change reaches subscribing files only when it is
  published. The irreversible step is Publish, so the gate sits there, together with
  delete, the one edit a before screenshot cannot put back.

### Guard rails for every library write

1. **One `use_figma` script per write, naming its nodes.** It lists the node ids it
   changes, or for a new component the page it lands on, returns the ids it creates, and
   touches nothing else. Its first statement throws unless `figma.fileKey` is the library
   key (in HDS Staging, the staging key). The ledger row (`figma/MCP-LEDGER.md`) names the
   file key and the node ids before the call is made.
2. **Never delete in the library.** A library script calls `remove()` on nothing and uses
   no variable, collection, mode or style API that deletes. Retiring a component is a move
   (A2). Deleting a draft in HDS Staging after its ingest is the one delete (A4).
3. **Never publish.** The agent reports what changed (component, node ids, before and
   after) and Adrian publishes.
4. **Screenshot before and after** every component the script changes (`get_screenshot`,
   as base64 where the egress proxy blocks figma.com), and check the structure with
   `get_metadata`, as in `figma/COMPONENT-DRAWING-RECIPE.md` step 7. The before screenshot
   is the record of what was there.
5. **Bind to the library's own variables and styles,** found by name. A component write
   creates no variable, collection, mode, text style or effect style: those come from code,
   through Sync or `delta.js`.
6. **Record it in the repo.** Point each `@figma` tag the write touched at its node, run
   `pnpm manifest:generate` and `pnpm figma:links`, and refresh `figma/inventory.json` with
   `pnpm figma:inventory --fetch` when components were added, moved or renamed.
7. **Budget the calls.** 200 MCP calls a day and 10 a minute (§4); count every `use_figma`
   and `get_screenshot` call. On a rate-limit error, stop and report; never retry.

### Consequences

- hds#303's components and the Tooltip restyle (hds#446) are in the published library;
  nothing is left to promote. `pnpm figma:staging-inventory` and
  `figma/STAGING-INVENTORY.md` are retired, and their rows are in `figma/inventory.json`.
- Every link from code to Figma (the `@figma` tags, the manifest, `docs/DESIGN_LINKS.md`,
  `docs/sync-map.json`, `figma/disposition.json`, the Code Connect templates) points at the
  library. Node ids were kept, so only the file key changed.
- `check-figma-staging-urls` became `check-figma-retired-keys`.
- The Sync plugin needs new files (`pnpm figma:push`) once this lands: the earlier build
  refuses a file named "HDS Tokens & Components", and the library takes that name. They
  work once this is merged and the Storybook deploy serves the new bundle. The plugin gets
  the file key (the Sync of 2026-10-07 recorded it in `figma/snapshot.json`), so Sync
  refuses c8MaVgwxOlxm4wr8wnH0Z4 by key whatever its name. Renaming the old library
  "HDS Tokens & Components (old)" before loading the new files still guards the path where
  Figma gives no key, where only the marker and Mark's link check tell the two files apart
  (ADR-032, amendment).
- No Swap library step is left: the old file was never published (A3), so no file
  subscribes to it. Should a file turn up holding instances copied from it, they are swapped
  to the library's components by name, since component keys changed with the duplicate; the
  archived ones do not map, and a binding to a variable only the old file had is lost.
- Pagination `86:194` still nests the archived IconButton for its arrows, so
  `_IconButton (archived 2026-10-07)` must stay until Pagination is redrawn with Button
  (`iconOnly`).
- The library now changes between publishes. Anyone who opens it sees unpublished agent
  edits; subscribing files do not.
- A write can still be wrong. The before screenshot, the ledger's node ids and the file's
  version history are how a bad edit is found and undone; there is no automated rollback.
- A new component reaches the library only redrawn: the draft in HDS Staging and its library
  twin are two drawings, and the library one is the one that ships. A redraw that differs
  from its draft is caught by the before and after screenshots of the ingest, not by a diff.
- The steering surfaces state this rule: `CLAUDE.md`, `figma/links.json`,
  `figma/README.md`, `figma/COMPONENT-DRAWING-RECIPE.md` and `figma/MCP-LEDGER.md`.
  `scripts/__tests__/figma-one-library-rule.test.mjs` fails when one of them drops the
  library rule (never delete in the library, never publish) or the staging rule (draft in HDS
  Staging, ingest by redrawing, Sync and `delta.js` never target it), mentions staging as
  anything but the workbench or history, or calls the library read-only to agents. It also
  fails when a refusal, `pnpm figma:push` output or a Figma script under `scripts/` still
  says agents never delete "in Figma", the rule before HDS Staging.
