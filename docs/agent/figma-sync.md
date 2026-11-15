# Figma sync

Read `docs/adr/025-figma-sync-pro-architecture.md` first. It is the accepted architecture and supersedes ADR-019 §2.
The runbook is `figma/README.md`.

## The flow

Code is the source of truth. Sync runs one way.

- `pnpm figma:model` projects the tokens into `figma/model.json`.
- `pnpm figma:push` and `pnpm figma:native-import` apply the model to a Figma file. They run by hand.
- `pnpm figma:snapshot --ingest` records the file into the committed `figma/snapshot.json`.
- `pnpm check:figma-drift` compares the model and the snapshot.

## Brand

- Brand is modes of one `Hirobius/Brand` collection, directions only (`figma/brand-modes.json`, ADR-035).
- A client's brand never enters the shared library.

## The library rule

The HDS library is `libraryFileKey` in `figma/links.json` (ADR-026, as amended).

In the HDS library agents may restyle, fix, add, copy or redraw components, but never delete anything in the library and never publish (Adrian publishes).

- Each write is one `use_figma` script. The script names the node ids that it touches.
- Take screenshots before and after.
- A component removed from code moves to the "Archive" page as `_<Name> (archived <date>)`.
- A component deprecated in code moves to the "Deprecated" page.
- Tokens reach it only from code, through the Sync plugin or `delta.js`.
- Never run a `--prune` build. Only Adrian prunes.

## HDS Staging

In HDS Staging (`stagingFileKey` in `figma/links.json`), the scratch workbench, an agent drafts a new component with the library's variables and styles, then ingests it by redrawing it in the library, points its `@figma` tag at the library node and deletes the draft (agents may delete there; Sync and `delta.js` never target it).

- The steps are in `figma/README.md`, "New components: draft in staging, ingest to the library".

## Call budget

- The Pro plan allows 200 MCP calls a day. Batch the calls.
- Never retry a rate-limit error.

## Code Connect and ADR-019

- Code Connect v2 templates are generated and gated locally. Publishing needs an Organization plan.
- `docs/adr/019-figma-sync-via-mcp.md` governs §1 (first-party tools, the official Figma MCP server) and §3 (Code Connect). Its §2 is history.
- The legacy WebSocket bridge is archived on the branch `archive/figma-bridge`.
