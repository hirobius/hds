# ADR-028: Which Figma Plan Tier, and What Each One Buys

**Status:** Proposed (2026-09-23). Needs a decision from Adrian. Extends ADR-025's capability
table with current pricing-tier facts and ties each one to a named cost the repo is paying
today. Nothing in ADR-025 or ADR-026 is superseded.

## Context

HDS is on the **Professional** plan (ADR-025 §"What the Pro plan does allow", verified
2026-09-16; seat confirmed Full/admin in ADR-026). Two ADRs already exist _because_ of that
tier, and on 2026-09-23 the first successful push exposed a third cost. This ADR puts the
three costs and the two upgrade options in one place so the question gets answered on
evidence rather than re-litigated each time one of them bites.

Figma's tiers moved during 2026, so the figures below were re-checked on 2026-09-23 rather
than carried forward from ADR-025.

### Cost 1 — no branching, so promotion is a manual copy

ADR-026 exists solely for this. Agents write to a staging duplicate
(`2VgBbVpKiDnu0aftJEVyBQ`), and a human promotes it to the published library
(`c8MaVgwxOlxm4wr8wnH0Z4`) by hand, because:

> Figma branching is Organization-and-above (ADR-025 capability table), so "write to a branch"
> … there is no automatic merge and this step cannot be skipped.

This is the only step in the whole token pipeline with **no gate on it**. `check:figma-drift`
measures code against the _staging_ snapshot. Nothing measures staging against the published
library, and the published library has never been snapshotted at all. A silent divergence
there is invisible by construction.

### Cost 2 — Code Connect generates but cannot publish

ADR-025 §3: v2 templates are generated and gated locally, publishing needs Organization, so
no mapping is live and **Dev Mode shows designers no HDS snippets**. The work is done and
inert.

### Cost 3 — no Variables REST API, so the push is a plugin apparatus

`POST /v1/files/:key/variables` is Enterprise-only and is not sold as an add-on. Everything
in `figma/push/` exists to work around its absence: five carriers, a 36 KB embedded runtime,
per-carrier checksums, and a desktop plugin a human runs by hand.

Measured on 2026-09-22 when hirobius/hds#256 asked whether the agent path could be made to
work by chunking further:

|                                                                  |               |
| ---------------------------------------------------------------- | ------------: |
| `use_figma` code limit                                           |  50,000 chars |
| runtime in every carrier (23 of 25 functions, genuinely reached) |        36,155 |
| payload budget per carrier                                       |    **13,245** |
| total payload                                                    |       163,934 |
| **carriers required**                                            |        **13** |
| runtime re-sent across them                                      | 470,015 chars |

hirobius/hds#256 was closed plugin-only on that arithmetic. The REST API would reduce all of
it to one authenticated request.

It also cost a real hour on 2026-09-23: `pnpm figma:push` and `pnpm figma:snapshot` are
generators with imperative names, the plugin's adjacent menu entry is a dry run that writes
nothing, and three consecutive commands reported success while Figma stayed untouched. The
messages are fixed now, but the shape of the workaround is what made the confusion possible.

## What each tier buys

Re-checked 2026-09-23 against Figma's own documentation.

| Capability                              | Professional    | Organization | Enterprise | Source                                                                                         |
| --------------------------------------- | --------------- | ------------ | ---------- | ---------------------------------------------------------------------------------------------- |
| Branching / merge                       | No              | **Yes**      | Yes        | [Guide to branching](https://help.figma.com/hc/en-us/articles/360063144053-Guide-to-branching) |
| Code Connect publish (Full or Dev seat) | No              | **Yes**      | Yes        | [Code Connect](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect)           |
| Design system / library analytics       | No              | **Yes**      | Yes        | [Plans](https://www.figma.com/pricing/)                                                        |
| Private plugins                         | No              | Yes          | Yes        | ADR-025 table                                                                                  |
| **Variables REST API**                  | No              | **No**       | **Yes**    | [Variables API](https://developers.figma.com/docs/rest-api/variables/)                         |
| Variable modes per collection           | **10**          | 20           | more       | [Modes](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)           |
| MCP reads                               | 200/day, 10/min | —            | —          | ADR-026                                                                                        |

Two facts worth separating from the rest:

- **The Variables API is Enterprise, not Organization.** Upgrading one tier does _not_ remove
  the plugin. Anyone reasoning "Organization fixes the Figma sync" is wrong about Cost 3.
- **Mode limits were raised in Schema 2025.** Professional is now 10 per collection, not the
  much tighter earlier figure. HDS uses 2 (Semantic Light/Dark), 2 (Brand), 2 (Density), so
  there is real headroom already paid for — relevant to `figma/brand-modes.json` if more demo
  tenants are wanted. No upgrade needed for that.

## Decision

**Proposed: upgrade to Organization. Do not upgrade to Enterprise.**

The case for Organization is **branching**, not Code Connect. It converts the one ungated
step in the pipeline into a merge, and that step is the most likely place for silent
divergence precisely because nothing can measure it. Code Connect publishing and library
analytics come along with it.

Library analytics is undervalued in the framing so far: hirobius/hds#133 (component
right-sizing) and hirobius/hds#254 (core / pattern / fold) are both currently making
judgement calls about which components matter, with no usage evidence. Analytics is that
evidence.

The case **against** Enterprise is that it buys one thing HDS needs — the Variables API —
and that thing now works. The plugin path is measured, gated, documented, and as of
2026-09-23 has delivered a full push (drift 475 → 2). Paying Enterprise pricing to delete
working tooling is not a good trade. Revisit only if the manual push becomes a recurring
bottleneck rather than an occasional one.

## Consequences

If Organization is taken:

- ADR-026's staging-then-promote flow is replaced by branch-then-merge. ADR-026 should be
  superseded, not amended — its central constraint disappears.
- `figma/links.json`'s `stagingFileKey` stops being the write target; the branch is.
- Code Connect publishing becomes possible, so the generated v2 templates stop being inert
  and Dev Mode gains HDS snippets. This is work, not a switch.
- A gate becomes possible that nothing can express today: published-library drift, measured
  rather than assumed.

If nothing changes:

- The manual promotion stays ungated. That is tolerable while one person does every push and
  knows it is manual. It stops being tolerable the moment a second person or an unattended
  agent is in that loop.
- Dev Mode keeps showing designers no snippets, and hirobius/hds#133 / hirobius/hds#254 keep
  being decided without usage data.

## Still unverified

- Actual quoted price for Organization at this seat count. The public figure is per-editor
  per-month; what Hirobius would pay is not measured here.
- Whether Code Connect publishing needs work beyond the plan — ADR-025 says the templates
  generate and gate locally, but "generates" is not "publishes cleanly".
- Whether library analytics reports at component-set granularity, which is what
  hirobius/hds#133 would need to be useful.
