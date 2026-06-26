# ADR-014: Prop/API Deprecation Lifecycle

**Status:** Accepted (2026-06-26, documenting a decision settled earlier)

> Retroactive ADR: this lifecycle was established in prior work (tracked as #15) but
> never recorded as an ADR.

## Context

Removing a public prop or API in one step is a breaking change for any consumer that
hasn't migrated. The system needed a predictable, enforceable path from "this is going
away" to "this is gone" — rather than ad-hoc removals or indefinite `@deprecated` tags
that never actually get removed.

## Decision

Adopt an explicit deprecation lifecycle for component props/APIs:

1. **Warn** — a runtime `warnOnce` notice fires when the deprecated prop/API is used
   (once per session, not per render).
2. **Ledger** — the deprecation is recorded so it is tracked, not forgotten.
3. **`@removeIn`** — every `@deprecated` annotation must name a future removal target.

This is enforced by the **`check-deprecations`** gate: _every `@deprecated` must have a
future `@removeIn` target_ — so a deprecation cannot be added without committing to when
it ends.

## Rationale

- A `@deprecated` with no removal date is debt that never gets collected; pairing it with
  a mandatory `@removeIn` makes the intent enforceable and time-bound.
- `warnOnce` gives consumers a migration signal without log spam.
- The lifecycle lets breaking changes ship safely across multiple releases when callsites
  can't all be updated atomically (contrast ADR-012, where they could, so no lifecycle was
  needed).

## Consequences

- New deprecations are uniform: warn + ledger + dated removal, gate-enforced.
- The gate blocks a `@deprecated` that omits `@removeIn`, preventing open-ended decay.
- This is the mechanism a future "Card diet" (removing legacy `noPadding`/`padding`/`gap`)
  would use to retire props without an abrupt break.
