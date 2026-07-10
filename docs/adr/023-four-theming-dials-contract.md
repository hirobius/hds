# ADR-023: The four theming "dials" contract (`data-theme` / `data-density` / `data-brand` / `--hds-font-family`)

- **Status:** Accepted
- **Date:** 2026-07-10
- **Decider:** Ralph (autonomous loop), applying existing implemented behavior
- **Related:** #124 (Tailwind × multi-tenant epic), #131 (this ADR's tracking issue),
  ADR-0001 (per-brand token overlay strategy), ADR-013 (escape-hatch policy),
  `theme.css`, `src/app/context/hds-theme.tsx`

## Context

Consumers style HDS with zero JavaScript by setting attributes/CSS custom
properties on a root or scope element. `theme.css:35-43` and
`hds-theme.tsx:1-30` both document this contract already — it has shipped and
been in use since the brand-overlay work (ADR-0001) and the density work
(`[data-density="compact"]` in `theme.css`) landed. What was missing was a
citation both files could point to: `theme.css:35` cites "ADR-020 §3" and
`hds-theme.tsx:107` / `context.test.tsx:337` cite "ADR-020 §4" — but ADR-020
is the react-day-picker/date-fns decision for the Tier-3 date/time family and
has no §3/§4, or any relationship to theming. The citation was never correct;
it appears to be a copy/paste artifact from adjacent work landing around the
same time.

This ADR has two jobs: ratify the four-dial seam as stable public API (so
future work — the shape/density overlay axis in #128, the token→utility
bridge in #131's sibling ADR-024 — has a contract to build against instead of
re-deriving it), and give the citation a real home.

## Decision

The four theming dials are the **stable, public override contract** for HDS.
Consumers set some or all of the following on a root or scope element (or via
the typed `<HdsThemeProvider>` convenience, `src/app/context/hds-theme.tsx`):

| dial    | attribute / var                                | values                            | default              |
| ------- | ---------------------------------------------- | --------------------------------- | -------------------- |
| theme   | `data-theme`                                   | `"dark"` (light = unset)          | light                |
| density | `data-density`                                 | `"compact"` (comfortable = unset) | comfortable          |
| brand   | `data-brand` (+ `data-tenant` alias)           | overlay slug, e.g. `"acme"`       | base (no overlay)    |
| font    | `--hds-font-family` / `--hds-font-family-mono` | any CSS `font-family` value       | Satoshi / Geist Mono |

Rules that make this a _contract_ rather than incidental behavior:

1. **Attribute and CSS-variable names are stable.** Renaming any of the four
   is a breaking change requiring a new ADR that supersedes this one.
2. **Zero-JS first.** Every dial must work by setting a plain HTML attribute
   or CSS custom property — no required JavaScript runtime, so the same
   markup works from a static Astro layout or a React app. `HdsThemeProvider`
   is a typed convenience over this, not a requirement.
3. **Dials compose independently.** Any combination (e.g.
   `data-theme="dark" data-density="compact" data-brand="acme"`) is valid;
   generated CSS follows the existing compound-selector pattern already used
   for brand+dark (`tenants.css` `[data-brand="slug"][data-theme="dark"]`)
   and is the basis for the brand+density compounding tracked in #128.
4. **`data-tenant` is a permanent back-compat alias for `data-brand`**, not a
   fifth dial — both attributes are set together by `HdsThemeProvider` and
   both selectors are emitted for every brand overlay (see #62).
5. **Defaults are the unset state.** Light theme, comfortable density, and
   base brand all correspond to the _absence_ of the attribute, not an
   explicit value — this keeps the base case free of specificity overhead.

## Rationale

- The contract already exists in shipped code (`theme.css`, `hds-theme.tsx`)
  and downstream consumers (`hirobius/clients`) already depend on it; ratifying
  it costs nothing and prevents accidental drift.
- A named, numbered ADR gives every future citation (docs, code comments,
  tests) one correct place to point instead of the copy/paste-prone "the ADR
  about the date picker" mistake this ADR fixes.
- Explicitly stating "attribute names are stable, renaming is breaking"
  matters for a published npm package (AGENTS.md quality bar: "Public npm
  package. Backward compatibility matters.") — without a written contract,
  a future refactor could rename `data-brand` without realizing it is public
  API.

## Consequences

- `theme.css:35`, `hds-theme.tsx:107`, and `context.test.tsx:337` are updated
  in this change to cite ADR-023 instead of the stale ADR-020 reference.
- ADR-022 (per-tenant shape/density axis, #128) and ADR-024 (token→utility
  bridge scope) can now cite this ADR as the dial contract they extend,
  rather than re-describing it.
- No code behavior changes — this is a documentation-only ratification of
  what is already shipping.
