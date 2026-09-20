# ADR-026: Agents May Write to Figma, on a Staging File

**Status:** Accepted (2026-09-20). Supersedes ADR-025's agent-write constraint (Consequences, "Live Figma reads and writes need Adrian's authenticated MCP session"). Every other part of ADR-025 stands.

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
