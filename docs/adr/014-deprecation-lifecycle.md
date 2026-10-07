# ADR-014: Prop/API Deprecation Lifecycle

**Status:** Accepted (2026-06-26, documenting a decision settled earlier); amended (2026-10-01, hds#389): when a removal may ship; amended (2026-10-08, hds#465): a removal may ship with a manual step

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
4. **Remove** — the name goes in the release its window names. Before 1.0 that may be a
   0.x minor; from 1.0 on it is a major (see "Amendment (2026-10-01)" below).

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

## Amendment (2026-10-01): pre-1.0 removals may ship in a minor

**Decision (Adrian, recorded on hds#389).** The removal step of this lifecycle no
longer waits for 1.0:

- **Before 1.0:** a deprecated name may be removed in a 0.x minor. Semver allows a
  breaking change there, and a caret range (`^0.19`) never resolves to 0.20, so no
  consumer receives the removal until it chooses to upgrade.
- **Every pre-1.0 removal is announced in `MIGRATIONS.md`**, in a dated section with
  one row per removed name and its replacement. When a consumer imports the name,
  the removal also needs a codemod in `codemods/` (`--root`, `--check`, `--dry-run`,
  fixture tests), and its dry-run against that consumer is filed on the consumer's
  repo before the release ships. A name with no clean mechanical rewrite is not
  removed.
- **From 1.0 on:** removals ship only in a major, as before.

`@removeIn` keeps naming the latest release a deprecation may survive to: a tag that
says `1.0.0` may still be removed earlier, in a 0.x minor, under the rules above.
`check-deprecations` is unchanged; it fails once the package version reaches a
`@removeIn` target that is still in the code.

The first batch under this amendment is 0.20.0 (hds#389 R1): the 21 root
re-exports of `/patterns` components, the six `Hds*` aliases, and five docs/lab
components (CinematicLink, ComponentInstanceMatrix, FoundationSwatch, Sketch,
Token). 1.0 itself (#396) stays parked until Adrian says go.

## Amendment (2026-10-08): a removal may ship with a manual step

**Decision (hds#465). Default: yes, from 2026-10-08.** If Adrian does not reverse
it by that date, it stands; the first removal under it is StatusDot in 0.21.0.

The 2026-10-01 amendment says a name with no clean mechanical rewrite is not
removed. That rule would hold StatusDot back indefinitely: Badge `dot` takes its
`tone`, `size` and `label`, but Badge is className-only (`check-no-style-prop`),
so a `style` on StatusDot has no codemod. The rule is relaxed this way:

- A removal may ship **with a manual step** in place of a codemod when the
  upgrade command can find every use of the name, by import and by JSX tag
  (`detect.imports` and `detect.jsx` in the release ledger).
- The deprecation's ledger step carries `removeIn`, a plain-language recipe and
  those detect patterns. The upgrade command lists it under "Coming next" while
  the release is ahead of the consumer, and under "Do by hand" once the release
  that removes the name has shipped.
- `MIGRATIONS.md` still announces the removal in a dated section, one row per
  name, and the row's codemod column says `none` with the reason.
- Everything else in the 2026-10-01 amendment stands: 0.x minors only before
  1.0, majors from 1.0, and `check-deprecations` fails once the version reaches
  `@removeIn` while the name is still in the code.

The consumer is not surprised: a caret range such as `^0.20.0` never resolves to
0.21.0, and the dated `MIGRATIONS.md` section gives the recipe. StatusDot's
last known consumer, ops, drops it in hirobius/ops#538.
