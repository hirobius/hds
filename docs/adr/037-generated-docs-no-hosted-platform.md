# ADR-037: Docs, Agent Files and MCP Are Generated From Code; No Hosted Docs Platform

**Status:** Accepted (2026-10-14). Decider: Adrian.

## Context

HDS has two audiences for its documentation: people, and agents building screens. Hosted
design-system documentation platforms (zeroheight and similar) were considered. They keep
their own copy of the content, edited in their own tool.

## Decision

Not adopted. Documentation is generated from the code and checked for staleness:

- `AGENTS.md` (`scripts/generate-agents-md.mjs`), `llms.txt`, `public/llms-full.txt` and the
  topic slices (`scripts/generate-llms-txt.mjs`), and `DESIGN.md`
  (`scripts/build-design-md.mjs`) are generated from `src/app/data/component-api.json`,
  `mcp/guide.mjs`, `hirobius.tokens.json` and the docs content. Each generator has a
  `--check` mode in `pretest`, so a stale file fails the build.
- The MCP server (`mcp/hds-mcp.mjs`, `npx hds-mcp`) reads the same generated data.
- The docs site (ADR-036) renders from the same component source.
- `docs/state-surfaces.json` lists every generated file with the check that proves it fresh.

## Consequences

- One source of truth: a component change updates every surface, or a check fails.
- A hosted platform would be a second source of truth that drifts from code with no gate to
  catch it, so it is not added.
- Hand-written prose that remains (`CLAUDE.md`, the lint rules) is the known gap; move it to
  generation where it pays, rather than to a hosted tool.
