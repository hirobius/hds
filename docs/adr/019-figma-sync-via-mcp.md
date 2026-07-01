# ADR-019: Figma sync via the official Figma MCP server + Code Connect

- **Status:** Accepted
- **Date:** 2026-07-01
- **Decider:** Adrian
- **Related:** ADR-018 §2 (legacy bridge archived), `hirobius.tokens.json` (DTCG source of truth)

## Context

HDS previously round-tripped Figma through a hand-rolled stack: a custom Figma
plugin (`figma-agent-plugin/`), a signed WebSocket envelope protocol
(`protocol/envelope.mjs`, published as the `./protocol` subpath), a local bridge
server (`scripts/hds-bridge.mjs` + auth middleware + WSL2 port plumbing), and
smoke scripts. It predates mature first-party tooling and carried real
maintenance cost while being unused in current workflows. ADR-018 §2 archived it.

Figma now ships an official MCP server (design read/write, variables, Code
Connect) and Code Connect (mapping Figma components to real code components).
Adrian's Figma account (Hirobius team, Pro) is authenticated against that MCP
server in the working environment.

## Decision

All Figma integration goes through **first-party channels**; no custom
transport is maintained in this repo:

1. **Interactive design↔code work** — the official **Figma MCP server**
   (`get_design_context`, `use_figma`, variables APIs) driven by the agent.
2. **Tokens → Figma Variables** — `hirobius.tokens.json` remains the single
   source of truth. The existing `scripts/build-figma-variables.mjs` payload
   generator and the REST-based `sync-figma-variables.yml` workflow are
   **kept** (they never depended on the bridge). MCP variable writes may
   replace the REST call later; the payload generator is shared either way.
3. **Components → Figma** — Figma component library generated/synced from the
   HDS component inventory via MCP, then mapped back with **Code Connect** so
   Figma nodes reference the real HDS implementations and props.
4. The legacy transport (plugin, protocol, bridge server, its scripts and
   config) is deleted from `main`; it remains recoverable on the
   `archive/figma-bridge` branch.

## Consequences

- **Breaking (published surface):** the `./protocol` subpath is removed from
  the package exports — it existed only to share the bridge envelope with the
  custom plugin. Released with a breaking-change note (0.x minor per current
  semver practice). No other export changes.
- `smoke:consumer` drops its `./protocol` checks; all other subpath checks
  unchanged.
- Refines ADR-018 §2: `sync-figma-variables.yml` + `build-figma-variables.mjs`
  are explicitly **retained** (token sync, REST-based) rather than cut — only
  the transport layer was the liability.
- Build-out sequencing: (a) variables sync verified against a Figma file,
  (b) component library generation via MCP, (c) Code Connect mappings.
