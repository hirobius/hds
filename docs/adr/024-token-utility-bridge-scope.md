# ADR-024: Token→Utility Bridge Scope, and Style Dictionary: Not Now

**Status:** Accepted (2026-07-10); amended (2026-07-11) — `screens` exception

## Context

`scripts/build-tokens.mjs`'s `buildTailwindThemeExtend()` (~line 1283) today
returns only `{ colors, borderRadius, boxShadow }` as Tailwind
`theme.extend` output. Everything else a component author reaches for —
`p-4`, `gap-6`, `sm:`/`md:` breakpoints, `text-sm`, `border-2` — resolves to
**Tailwind's built-in defaults**, not HDS tokens. Two concrete consequences,
both blocking the epic's (#124) "aesthetics swap per client" goal:

1. `[data-density="compact"]` is a no-op for any utility-authored spacing,
   sizing, or type, because those utilities aren't wired to HDS's
   `--hds-space-*`/`--primitive-breakpoint-*`/`--semantic-borderWidth-*`/
   `--primitive-typography-size-*` vars at all.
2. ~229 arbitrary-value usages (`[var(--…)]`) exist in the codebase today
   specifically because no reachable utility exists for these token
   categories — component authors hand-wrote escape hatches instead.

ISSUE-01 (#125) is the "Red/Green" fix: extend `buildTailwindThemeExtend()`
to also emit `spacing`, `screens`, `borderWidth`, `fontSize` — each as
`var(--…)` references (never resolved values, via the existing `pathToCSSVar`
helper), so the dark/tenant/density cascade keeps working through the
utility layer exactly as it already works through direct CSS var usage. This
ADR exists to **scope that bridge** — settle what belongs in it and what
doesn't — before implementation, and to close a second open question the
epic flagged: whether to migrate the token build off hand-rolled
`build-tokens.mjs` onto Style Dictionary while touching this exact code path.

## Decision

### 1. Bridge scope: four token categories, `var()`-ref only, semantic-tier preferred

`buildTailwindThemeExtend()` gains exactly four new `theme.extend` keys,
sourced as:

| Tailwind key  | Token source                              | Fallback                                          |
| ------------- | ----------------------------------------- | ------------------------------------------------- |
| `spacing`     | `semantic.space.*`                        | `primitive.space.*`                               |
| `screens`     | `primitive.breakpoint.*`                  | — (`xs375`, `sm640`, `md768`, `lg1024`, `xl1280`) |
| `borderWidth` | `semantic.borderWidth.{default,emphasis}` | `primitive.borderWidth.{xs,sm,md}`                |
| `fontSize`    | `primitive.typography.size.*`             | —                                                 |

Every emitted value is a `var(--…)` reference produced by the existing
`pathToCSSVar` helper (~line 27) — **never a resolved literal** — with one
documented exception, `screens` (see "Amendment (2026-07-11)" below). For the
other three keys this is a non-negotiable constraint: resolving to literals
at build time would sever the dark-mode/tenant-overlay/density cascade the
moment a component switches from a hand-written CSS var to a Tailwind
utility, silently regressing exactly the theming behavior ISSUE-01 exists to
fix.

**Explicitly out of scope for this bridge** (left as future, separately
scoped work if ever needed): `colors` restructuring, animation/transition
utilities, container queries, and arbitrary-property (`[--foo:bar]`) support.
The bridge covers the four categories the Red tests (`check-tailwind-token-
coverage.mjs`, the density Playwright assertion in `tests/layout-integrity.
spec.ts`) exercise — not a general-purpose token-to-Tailwind mapping layer.

### 2. Style Dictionary: not now

Separately, `docs/architecture/style-dictionary-migration-plan.md` already
concluded a full audit: migrating `build-tokens.mjs` (1,494 LOC) to Style
Dictionary would cut it to an estimated ~350–450 LOC of custom
transforms/formats, a real ~70% reduction, with a working POC proving
byte-equivalence on primitive color/space/radius (`pnpm audit:style-
dictionary`). That plan's verdict stands and is ratified here: **"worth-
doing — but not urgently."** The token system is not a pain point today, and
Style Dictionary has no built-in support for five things HDS actually needs
(non-standard `motion`/`elevation`/`spring` composite types, the Figma-
extension-shaped dark-mode data, and per-tenant attribute-scoped CSS output)
— all five would require the same custom-format work SD is meant to save us
from writing.

Extending `buildTailwindThemeExtend()` for ISSUE-01 is exactly the kind of
change the migration plan's own trigger condition describes as _not_ a
reason to migrate — it's an incremental addition to an existing, working
function, not a "significant feature addition" that strains
`build-tokens.mjs`'s architecture. The migration plan's actual trigger
(another platform target, e.g. iOS/Android tokens, where SD's ecosystem
value is immediate) has not occurred.

## Rationale

- **Scoping the bridge to four categories with a hard `var()`-ref rule**
  keeps the change reviewable and testable against the Red tests already
  specified in #125, instead of open-endedly expanding Tailwind's
  `theme.extend` surface.
- **Semantic-tier-first, primitive-tier fallback** matches the existing
  precedent in `buildTailwindThemeExtend()`'s current `colors`/`borderRadius`
  output and the token-tier discipline documented across the ADR series
  (semantic tokens are the intended point of consumption; primitive is the
  escape hatch when no semantic token exists yet).
- **Deferring Style Dictionary** avoids doing two risky things in the same
  code path at once: extending `buildTailwindThemeExtend()`'s output shape
  _and_ rewriting its implementation engine. Landing ISSUE-01 against the
  existing hand-rolled build keeps the change small and the blast radius
  contained to the four new keys.
- Both decisions were already effectively settled in the epic's "Settled
  decisions" section (#124: _"Style Dictionary: not now (matches
  `docs/architecture/style-dictionary-migration-plan.md`)"_) and in #125's
  own Red/Green spec; this ADR's job is to make both durable, discoverable
  decisions instead of leaving them as issue-body prose that scrolls out of
  view once #124/#125 close.

## Consequences

- `tailwind.config.tokens.cjs` grows four new `theme.extend` keys once
  ISSUE-01 lands; existing arbitrary-value usages (`[var(--hds-space-md)]`
  etc.) become candidates for burndown to plain utilities (`p-4`) — tracked
  separately as ISSUE-06 (#130), not part of this ADR.
- `.size-limit.cjs` budget headroom (~20 kB on `tokens.css`/`styles.css`) is
  the guard against this bridge growing unbounded; any future category
  addition re-measures against that budget.
- `scripts/build-tokens.mjs` remains the single token compiler for the
  foreseeable future. `pnpm audit:style-dictionary` stays in place as a
  standing proof that the POC path remains viable if the trigger condition
  (new platform target, or `build-tokens.mjs` needing a significant feature
  addition) is ever met — this ADR does not retire that tooling, only
  declines to act on it now.
- Future ADRs proposing new Tailwind-reachable token categories should cite
  this ADR's scope table and extend it explicitly, rather than growing
  `buildTailwindThemeExtend()` ad hoc.

## Amendment (2026-07-11): `screens` emits concrete px, not `var()` refs

**Decision (Adrian, 2026-07-11 planning interview):** the `screens` half of
the bridge is a documented exception to the `var()`-ref-only rule above. It
emits **concrete px values**, resolved from `primitive.breakpoint.*` at
build time, instead of `var(--…)` references.

**Why:** `@media` conditions cannot evaluate CSS custom properties in any
browser — this was already flagged as an open question when the original
decision above was written (see the `screens` JSDoc note in
`buildTailwindThemeExtend()`). Emitting `var(--…)` refs there anyway (per
the original non-negotiable rule) produced entries that satisfied this ADR
and `check-tailwind-token-coverage.mjs` on paper but were never functional
breakpoints, and caused `Unexpected token Function("var")` warnings in
`pnpm build:lib` (flagged in PR #159) once Tailwind tried to compile them
into real `@media (min-width: …)` conditions.

**Scope of the exception:** `screens` only. `spacing`, `borderWidth`, and
`fontSize` keep `var(--…)` refs — those three are consumed as property
values (`padding: var(--…)`), which custom properties support fine, so the
dark-mode/tenant-overlay/density cascade through those keys is unaffected.
`screens` values are consumed as `@media` conditions, a context where a
`var()` reference was always inert; resolving to a literal px value here
loses nothing the `var()` form actually provided.

**Consequence:** `screens` breakpoints are not tenant-themeable (a tenant
overlay changing `primitive.breakpoint.*` requires a token rebuild, not a
runtime CSS var override) — this was already true in practice under the
`var()` form (the breakpoints never fired), so no cascade behavior actually
regresses; the change only makes the existing behavior functional instead
of decorative.
