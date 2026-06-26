# ADR-009: Canonical ADR Location and Format

**Status:** Accepted (2026-06-26)

## Context

Decision records had drifted into two parallel homes with different conventions:

- `docs/adr/` — `NNN-kebab-title.md`, header `# ADR-NNN: Title` + `**Status:**`, no
  frontmatter. The larger body (ADR-001 … ADR-008).
- `docs/architecture/ADR-NNNN-*.md` — YAML frontmatter (`id`, `status`, `supersedes`),
  plus `ADR-template.md` and two `ADR-XXXX` placeholders. Three entries.

Neither was declared canonical, so new decisions had no obvious home and the two
schemes kept diverging. A repo that prizes a single source of truth shouldn't have
two ADR registries.

## Decision

`docs/adr/` is the **canonical ADR location**. All new ADRs are written there using the
existing house format:

```
# ADR-NNN: <Short title>

**Status:** <Proposed | Accepted | Superseded by ADR-MMM> (YYYY-MM-DD)

## Context
## Decision
## Rationale
## Consequences
```

Numbering is sequential (`NNN`, zero-padded to 3). One decision per file; files are
immutable once Accepted (a reversal is a new ADR that supersedes the old via the Status
line).

The three `docs/architecture/ADR-000X-*.md` records remain valid as history but are
**frozen** — no new ADRs are added there. Physically migrating them into `docs/adr/`
(with redirects for inbound links) is a deferred, optional cleanup, not a blocker.

## Rationale

- The `docs/adr/` series is already larger and lower-friction (no required frontmatter).
- One canonical folder removes the "which numbering do I use?" ambiguity.
- Freezing rather than immediately migrating avoids breaking the inbound references in
  `HARDENING_ROADMAP.md` and elsewhere; migration can happen later without urgency.

## Consequences

- Future ADRs are discoverable in one place, sequentially numbered.
- Short-term, two folders coexist (one active, one frozen) until an optional migration.
- The richer frontmatter of the architecture series is dropped in favor of the simpler,
  more-used format; status/supersession is carried in the `**Status:**` line instead.
