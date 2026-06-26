# ADR-012: Standardize the Accessible-Label Prop to DOM-Style `aria-label`

**Status:** Accepted (2026-06-26)

## Context

Components exposed two different conventions for the accessible-label prop:

- `Tag`, `SegmentedControl`, `Token` used a camelCase `ariaLabel` prop.
- `IconButton` used the platform-standard DOM attribute `'aria-label'`.

No rule governed which was canonical (`check-prop-vocabulary` only covers
tone/variant/size). A custom `ariaLabel` prop is invisible to `jsx-a11y` lint and does
not pass through native attribute spreads, so the camelCase form is the weaker of the two.

## Decision

Converge all components on the **DOM-style `aria-label`** prop. `Tag`, `SegmentedControl`,
and `Token` were migrated from `ariaLabel` → `'aria-label'`; internal plumbing components
(e.g. `TokenShell`) keep a local variable name but expose `aria-label` at the public
surface. All in-repo callsites were updated in the same change, so no deprecation
lifecycle was required.

## Rationale

- `aria-label` is the platform standard and is recognized by `jsx-a11y` accessibility
  linting; a custom `ariaLabel` prop is not.
- It passes through `{...rest}` native spreads without explicit declaration.
- `IconButton`, the most-used interactive primitive, already did this — the three
  camelCase components were the outliers, not the majority.

## Consequences

- One consistent, lint-visible accessible-label convention across primitives.
- Breaking change to the public prop name, but all consumers are in-repo and were updated
  atomically.
- Follow-up debt surfaced: the rename initially missed two `tests/primitive-contracts/`
  callsites because the vitest contract suite is not part of `typecheck` or the Playwright
  a11y/layout runs used to validate the change — a reminder that prop-API changes should
  include `pnpm:test` in their acceptance checks (see ADR-011's verifier contract).
