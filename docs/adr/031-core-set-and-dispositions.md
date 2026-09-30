# ADR-031: The Core Set and the Component Dispositions

**Status:** Accepted (2026-09-26). Ratified by Adrian in hds#254; recorded 2026-09-30 by hds#374, which also published the result.

## Context

By September 2026 the package root exported 109 component modules. The count
was accurate and said nothing about judgment: nothing separated a system
primitive (`Button`, `Stack`) from a product-specific surface (`ActivityFeed`,
`AssetImg`), and an external reviewer on 2026-09-30 read the README's "109
public component modules" as exactly that.

The judgment had already been made. hds#254 gave each of the 113 rows of the
table in [`docs/hds-architecture-2026-09-18.html`](../hds-architecture-2026-09-18.html)
one of four dispositions:

| Disposition | Rows | Meaning                                                                  |
| ----------- | ---- | ------------------------------------------------------------------------ |
| core        | 42   | Brand-neutral and composable; the package root, and the part to perfect  |
| pattern     | 22   | Composed and product-shaped; moved to `@hirobius/design-system/patterns` |
| fold        | 41   | Absorbed into another component as a prop, variant or slot               |
| internal    | 8    | Docs tooling and demos that never belonged in a consumer's autocomplete  |

Adrian ratified the table as written on 2026-09-26. The 42 core names were
committed as `scripts/lib/core-components.mjs` (hds#339, with the hds#315
renames applied), and `check-contract-coverage --enforce` has required a
`usage.when` on all 42 since hds#340. But that file was `@internal`, the
manifest had no field for it, the doc still called itself "the proposal", and
`CONSUMING.md` described the `/patterns` subpath as 22 components when
`src/patterns.ts` re-exported 27 modules.

## Decision

1. **The core set is the 42 names in `scripts/lib/core-components.mjs`.** That
   file is the only list. Adding or removing a core component is an edit
   there followed by `pnpm manifest:generate` and `pnpm readme:counts`.
2. **`core` is a manifest flag, not a tier.** `scripts/generate-manifest.mjs`
   writes `core: true` on those 42 specs and omits the field everywhere else;
   `component-api.json` and the agent projection carry the same flag. The
   ADR-006 `tier` (primitive, pattern, template, utility) is unchanged: it
   describes a component's shape and drives documentation weight, while `core`
   records a curation decision. The two cut across each other: five core
   components (`Breadcrumb`, `Combobox`, `Disclosure`, `Pagination`,
   `ToastProvider`) are `tier: pattern`, and 37 of the 95 `tier: primitive`
   specs are core.
3. **Every consumer-facing surface is generated from the flag and gated.** The
   README "What belongs in the system" block, the llms.txt "Core set" section
   and its `[core]` markers, the `hds-consumer` skill's "Core set" section, and
   the `CONSUMING.md` rows are compared to their sources by
   `scripts/__tests__/core-set.test.mjs` and `pnpm check:consumer-skill`.
4. **`/patterns` carries 27 modules**: the 22 pattern rows of hds#254 plus the
   five screen patterns of hds#337. Twenty-one of them are still re-exported
   from the package root with `@deprecated` until 1.0, per `MIGRATIONS.md`.
5. **Folds wait for 1.0.** The 41 fold rows and the deprecated internals stay
   exported until 1.0, when the ops codemod exists. They get no sub-issues
   until 1.0 is scoped.

Out of scope, by earlier decision: removing product-specific exports (hds#133
option A). Whether the 12 `/patterns` modules whose manifest tier is still
`primitive` or `template` should be retiered is its own decision issue.

## Rationale

- **A flag, not a fifth tier.** Retiering the core set would have moved five
  `pattern` components to `primitive` (or 58 primitives out of it), changing
  the documentation weight and validator behaviour that ADR-006 attaches to
  `tier` for a reason unrelated to shape. An optional boolean is an additive,
  minor schema change that no existing reader has to learn.
- **Generated, not written.** The hand-written `CONSUMING.md` row had already
  drifted (22 against 27). A list a test compares against its source cannot
  drift without failing.
- **One list.** Every surface reads the flag or the file it comes from, so the
  README, llms.txt, the skill and the manifest cannot disagree about the set.

## Consequences

- `manifest/schema.json` and its lock gain `core`; removing it later is a
  breaking change that `check-manifest-schema-semver` reports.
- A core component that is renamed, removed or retiered to `utility` without
  updating `core-components.mjs` fails `core-set.test.mjs` and
  `check-contract-coverage --enforce` (pre-commit), and `generate-manifest.mjs`
  warns about it on every regen.
- The architecture doc now reads "Ratified 2026-09-26 (hds#254)"; it stays the
  record of each row's disposition and the evidence behind it.
