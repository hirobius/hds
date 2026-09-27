# ADR-029: Figma Carriers, Measured — the Dev Plugin Pushes, use_figma Reads, the Bridge Stays Archived

**Status:** Proposed (2026-09-27). Amends ADR-025 §2 ("Push on Pro": `use_figma` as a push
carrier) and ADR-026 §2 (how the staging-only rule is enforced). Every other part of both
stands. §3 below is the part that needs Adrian's call. Until it is accepted, the component
draw carrier stays unported.

## Context

ADR-025 named two carriers for `pnpm figma:push`: `use_figma` scripts through the remote
Figma MCP server, and a local development plugin. ADR-026 let agents write, to the staging
duplicate only. The 2026-09-27 build-out handoff asked for the push and a snapshot through
`use_figma` first, falling back to the plugin only if that failed. It also asked for the
archived bridge's `draw-component` and `buildMastersBatch` to be ported into the plugin, so
the remaining components could be drawn. That session measured the following (every call is
in `figma/MCP-LEDGER.md`):

1. **`use_figma` writes work on Pro, in staging.** A throwaway collection and variable were
   created and deleted. Shared plugin data works on variables and on the document root, and
   `figma.fileKey` returns the staging key.
2. **`use_figma` cannot carry the push.** Its `code` parameter takes at most 50,000
   characters. The push runtime alone is 36 KB (22 KB minified). The Semantic chunk's
   payload is 72 KB. The generated scripts are 46–110 KB each. Carrying the push would mean
   splitting a collection across calls, which the push engine's plan, extras and verify
   steps are not designed for.
3. **`use_figma` cannot carry a snapshot.** It truncates what it returns at 20 KB. The
   staging file's snapshot is about 255 KB.
4. **The runtime self-check refused inside `use_figma`.** The 6.8 KB snapshot script failed
   `hdsVerifyRuntime`. On a second call, eight of its ten functions read back byte-identical
   to the generated source, and the same checksum passes in Node. The remaining two were not
   echoed back, so the cause is open. It does not matter while (2) and (3) hold.
5. **The staging file is ahead of the repo's record.** It already holds all six collections
   (Role, Brand, Density included), and a push is recorded in it on 2026-09-23 (model
   `8f136b88`). The committed `figma/snapshot.json` is from 2026-09-22 and shows three
   collections. The current model is `22cd71fd`, so one more push is due either way.
6. **There is nothing left to draw.** The ratified `figma/disposition.json` (hds#235) expects
   89 `library` components. 48 are linked in the library, and the other 41 are drawn in
   staging (`figma/staging-inventory.json`). A live read verified all 41: every node
   present, names and variant counts matching, every description set, no clipped sets, and
   806 paints bound to variables against 2 raw ones. The "139 components, 44 linked" framing
   counts slots, layout primitives and internals that the disposition deliberately keeps out
   of Figma.
7. **The archived masters would regress what exists.** `buildMastersBatch`
   (`archive/figma-bridge:pipeline/figma-masters-batch.mjs`) draws from a hard-coded
   approximate palette (`const C = { brand: {r: 0.05, …} }`) and rebinds only when a
   `_hdsTokenBinding` finds a match. That breaks step 4 of `figma/COMPONENT-DRAWING-RECIPE.md`
   ("bind only what code actually tokenizes"). Its 26 bespoke trees are all components the
   library already has.

## Decision

### 1. The development plugin carries every push and snapshot

`figma/push/plugin/` is the only carrier for `pnpm figma:push` and for snapshots. The
`use_figma` push and snapshot scripts are still generated. They are tested and serve as the
reference for the plugin, but no agent should try to retype them through the MCP server.
Pushing is therefore a step Adrian runs in Figma desktop: Plan, Push, Take snapshot, then
`pnpm figma:snapshot --ingest <file>`.

`use_figma` stays the agent's tool for small, bounded work: verification reads like the
one above, component descriptions, and drawing a single component by the recipe.

### 2. The plugin enforces the staging rule itself

ADR-026 made staging the only agent write target, but nothing stopped the plugin from
pushing into whichever file was open. The plugin now reads `figma.fileKey` (the manifest
sets `enablePrivatePluginApi`) and checks it against `stagingFileKey` in
`figma/links.json`. Plan and Push run only there. In the published library, in any other
file, in an unsaved draft (no key), or while `stagingFileKey` is null, they refuse before
reading anything, and name the file to open. Take snapshot only reads, so it runs anywhere.

The plugin has no command that writes to the library. How staging's variables reach the
library is Adrian's call, like every other promotion step (ADR-026 §2, and the handoff's
stop points). Pro has no branching, so that step stays manual.

### 3. The component draw carrier is not ported (Adrian to confirm)

`draw-component`, `scaffold-components` and `buildMastersBatch` stay on
`archive/figma-bridge` with the rest of the bridge (ADR-018 §2), along with the SSE
server, Ollama and `hds-bridge.mjs`. Per (6) there is no undrawn library component for
them to draw, and per (7) they would draw worse than the recipe does.

**Revisit when** either of these holds: a batch of library components needs redrawing
(for example, hds#132's `State` variant added across sets), or the disposition gains new
`library` components faster than the recipe can draw them one at a time. The carrier to
build then is a token-bound tree generator, a pure function golden-tested like
`figma:model`, running in the plugin. It is not the archived palette.

## Rationale

- **Measure the carrier before designing around it.** Both `use_figma` limits are hard
  limits of the tool, not of the plan. A carrier that cannot fit through them is a design
  for a different tool.
- **Put the rule where the write happens.** A rule stated only in an ADR and a JSON file is
  a rule a mis-click can break. The plugin is what writes, so the plugin checks.
- **Don't build for work that is done.** The disposition was ratified to answer exactly
  "what belongs in Figma". Measured against it, the draw backlog is zero.

## Consequences

- Every push and snapshot needs Adrian at Figma desktop. That was already true for the
  prune build and the full push (`figma/README.md` called the plugin "the easier path").
  Now it is stated as the only path.
- `check:figma-drift` stays warning-only until Adrian runs Plan → Push → Take snapshot in
  staging and the snapshot is ingested. That run is also what finally lands the 45
  Light/Dark-differing variables that hds#252 found identical. The model already emits them
  distinctly, so no token change is needed.
- The staging verification is now a recorded read in `figma/staging-inventory.json`, not
  "nothing can self-verify". It also found that 231 of 313 text layers across 32 staged
  components carry no text style. That is a follow-up, not a blocker.
- `use_figma` writes are still a free beta (ADR-026 §5). This ADR adds no write-heavy use.
- **Unverified:** the cause of (4), and whether `figma.fileKey` is exposed to a
  development plugin without `enablePrivatePluginApi` in every Figma desktop build. The
  guard fails closed either way: no key means no write.

Related: ADR-018 §2, ADR-025, ADR-026, ADR-028, hds#132, hds#235, hds#236, hds#252.
