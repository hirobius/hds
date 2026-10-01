# Migrations

How HDS deprecates and removes public API, and the removals shipped so far.
Token renames live in [TOKEN_MIGRATION.md](TOKEN_MIGRATION.md).

## The cycle

1. **Deprecate.** The new path ships and the old one keeps working. The old one
   carries `@deprecated` and `@removeIn` JSDoc that names the replacement.
2. **Give a codemod.** A script in `codemods/` rewrites consumer code, supports
   `--check` (exit 1 when a rewrite is needed, writes nothing) and `--dry-run`,
   and has unit tests against fixture files.
3. **Run it on a real consumer.** The dry-run diff is filed as an issue on the
   consumer's repo. HDS never pushes to it.
4. **Remove** at the announced window. Before 1.0 a removal may ship in a 0.x
   minor: semver allows the break, and a caret range such as `^0.19` never
   resolves to 0.20. Each one is announced here in a dated section, one row per
   removed name, with the codemod where a consumer imports the name. From 1.0 on,
   removals ship only in a major. ADR-014's 2026-10-01 amendment records the rule
   (hds#389).

## Pattern components move to `/patterns`

- **Deprecated in:** 0.17 (hds#254). 21 pattern-tier components are still
  exported from the package root, each marked `@deprecated`. They are also
  exported from `@hirobius/design-system/patterns`.
- **Removed from the root in:** 0.20.0 (hds#389 R1). The root no longer
  exports these 21 components or anything else from their modules (props types,
  parts, hooks, `*Variants`). `/patterns` keeps six of them with every name:
  AssetImg, CodeBlock, ErrorPattern, Form, Page and Reveal. The other 15 are
  removed outright in the same release, from `/patterns` too (hds#394 wave 4a).
  See [0.20.0 removals](#0200-removals-2026-10-01).
- **Codemod:** `codemods/patterns-subpath.mjs`, also installed as the
  `hds-patterns-subpath` binary. The names it moves are everything
  `/patterns` exports and the root does not (`pnpm codemod:names`), never
  listed by hand. A name of the 15 removed modules has nowhere to move: the
  codemod reports a named import or re-export of it as removed in 0.20.0 for
  a manual edit, and `--check` exits 1 (the list is
  `codemods/removed-0.20.json`). A removed name read through a namespace
  import or a dynamic `import()` is left to the type checker.

```bash
# Preview what would change, writes nothing
npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root . --dry-run

# CI guard: exit 1 while any root pattern import remains
npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root . --check

# Rewrite in place
npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .
```

Other named imports stay on the root. Aliases (`Page as Screen`), `type`
modifiers and multi-line layout are kept, and a pattern name joins an existing
`/patterns` import instead of adding a second one. Default plus named imports
(`import HDS, { Page }`), `export { Page } from` re-exports and indented imports
are handled. `--dry-run` prints each import line before (`-`) and after (`+`).
Some statements hide the names, so the codemod cannot rewrite them; `--check`
exits 1 and lists them for a manual edit: `export * from '@hirobius/design-system'`,
and a namespace import (`import * as HDS`) or a dynamic `import()`, `require()`,
`vi.mock`, `jest.mock` (and the other test-runner loaders) of the root in a file
that reads a pattern name off something: `HDS.Page`, `m['Page']`,
`import('@hirobius/design-system').then((m) => m.Page)`,
`const { Page } = require(…)`. A bare `Page`, such as the `/patterns` import the
codemod wrote, does not count, so a migrated file passes `--check`.
Comments in the braces move with their specifier, and an import after `;` or a
comment on its line is read too (hds#434). A file the codemod cannot read to its
end is listed as unreadable and keeps `--check` at exit 1: in JSX text, a lone
backtick or a `/*` (as in `src/*.ts`) opens a template or comment that never
closes, so write it as ``{'`'}`` or `{'/*'}`.
`node_modules`, `dist` and `.git` are skipped.

Upgrade the package to 0.17 first: `/patterns` does not exist in 0.16.

### First consumer run

Ops (`hirobius/ops`) pins `^0.16.0`. A read-only dry run on 2026-09-29 found 11
import sites in 11 files, all four names being `Page`, `ErrorPattern`,
`AssetImg` and `CodeBlock`. The rewrite is tracked as an issue on the Ops repo.
A second dry run on 2026-10-01 (ops main 76ef65e) found the same 11 sites;
with StatusTile on `/patterns` (hds#395) it moves 12, the extra one in
`ClientDashboardPage.tsx`.

## Spacing names move to the t-shirt scale

- **Deprecated in:** 0.17 (hds#206). Spacing is one scale,
  `semantic.space.scale.{xs,sm,md,lg,xl}` (8/16/24/32/48px). The old names
  keep computing exactly what they did, at both densities, and carry
  `$deprecated` in `hirobius.tokens.json`.
- **Removed in:** not yet, and not in 0.20.0. Before 1.0 it may go in a 0.x
  minor (step 4), but no window is set: steps 2 and 3 come first, and removing
  the token paths also deletes their Figma variables.
- **Warning:** in a development build, Box `sx`'s `'tight'` to `'spacious'`
  each log one `[HDS deprecation]` console warning naming the step to use.
  Production builds stay silent. The token paths cannot warn at runtime.
- **Codemod:** `scripts/codemod-spacing-vocabulary.mjs` rewrites the token
  references below, but only inside HDS's own `src/`. A consumer codemod in
  `codemods/` with `--root`, `--check` and `--dry-run` does not exist yet.

| Old                                                  | New                                |
| ---------------------------------------------------- | ---------------------------------- |
| `semantic.space.component.gap`                       | `semantic.space.scale.xs`          |
| `semantic.space.layout.tight`                        | `semantic.space.scale.sm`          |
| `semantic.space.layout.normal`                       | `semantic.space.scale.md`          |
| `semantic.space.layout.inset`                        | `semantic.space.scale.lg`          |
| `semantic.space.layout.spacious`                     | `semantic.space.scale.xl`          |
| `semantic.space.component.padding`                   | `semantic.space.surface.padding`   |
| `semantic.space.layout.gutter`                       | `semantic.space.region.gutter`     |
| Box `sx` `'tight'` `'normal'` `'inset'` `'spacious'` | `'sm'` `'md'` `'lg'` `'xl'`        |
| Box `sx` integer `2` `4` `6` `8` `12` (4px units)    | `'xs'` `'sm'` `'md'` `'lg'` `'xl'` |

The CSS variables follow the paths (`--semantic-space-layout-tight` becomes
`--semantic-space-scale-sm`). `surface.padding` and `region.gutter` are not
scale steps: tenants and `theme.css` override them at runtime, always with a
scale step.

Compact density: each swap in the table is pixel-identical at the default
density, but not under `data-density="compact"`. `component.gap`,
`layout.tight|normal|inset|spacious`, Box `sx`'s `'tight'` to `'spacious'` and
Box `sx` integers are fixed pixels. The `scale.*` steps that replace them
tighten one step under compact (8, 16, 24, 32, 48px become 6, 12, 20, 24,
40px). Moving to the scale therefore tightens compact screens, the way Stack's
gaps already do. To keep the old compact pixels exactly, use the fixed step
instead: `hds.space.px8|px16|px24|px32|px48`, or
`--primitive-space-2|4|6|8|12`.

Stack's `gap` keeps its old names for now, because its `'xs'` is the 2px
subgrid step, not `scale.xs`. Its `'tight'` to `'spacious'` read the scale
steps, so unlike Box `sx`'s same four names they tighten under compact. That
difference stays until both sets of names are removed. Stack's numbers (raw px)
and anything else untyped callers pass render what they did before.

Upgrade first: Box `sx` takes `'xs'` to `'xl'` only from the first release after
0.19.1. On 0.19.1 and earlier the string passes through, so `p: 'sm'` becomes
`padding: sm`, which is invalid CSS and renders no padding.

`hds.density.*` (the `hds` token bridge) is deprecated from that release too,
with the same removal window (`@removeIn 1.0.0`). Its names sit one step off the
scale, and each replacement computes the same pixels at both densities:

| Old                                         | New                                                                |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `hds.density.sm` (`var(--hds-space-sm)`)    | `hds.semantic.space.scale.xs`                                      |
| `hds.density.md` (`var(--hds-space-md)`)    | `hds.semantic.space.scale.sm`                                      |
| `hds.density.lg` (`var(--hds-space-lg)`)    | `hds.semantic.space.scale.md`                                      |
| `hds.density.xl` (`var(--hds-space-xl)`)    | `hds.semantic.space.scale.lg`                                      |
| `hds.density.xl2` (`var(--hds-space-2xl)`)  | `hds.semantic.space.scale.xl`                                      |
| `hds.density.xs`, `hds.density.xl3`, `.xl4` | no scale step; `hds.space.px4`, `px64`, `px80` (not density-aware) |

## 0.20.0 removals (2026-10-01)

The first removal batches under step 4. hds#389 R1 removes names deprecated in
an earlier 0.x release: 79 root names that moved to `/patterns`, six `Hds*`
aliases and five docs/lab components (12 names). hds#394 wave 4a then removes,
without a deprecation release, 32 components no consumer imports (87 names,
from the root and `/patterns`) and makes the 38 remaining root `*Variants` cva
helpers private (hds#389's 2026-10-01 decision update). Wave 4b removes 13
components that fold into a survivor hds#393 shipped (27 root names; StatusDot
stays for now). hds#395 (B5) removes the two that ops renders, NotFoundPattern
and TileGrid (3 root names), each with a codemod of its own, and moves
StatusTile from the root to `/patterns` (3 names). Nothing else left the public
API. Ops, the one consumer that imports components, pins a caret range below
0.20, so nothing breaks until it upgrades; run the codemods first.

```bash
# Preview, then rewrite in place. `-p` runs the bins from the 0.20 package
# (hds-prefix first ships in 0.20.0), so npx never looks the bin name up on
# its own in the registry. Works before or after you upgrade.
npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root . --dry-run
npx -p @hirobius/design-system@^0.20.0 hds-prefix --root . --dry-run
npx -p @hirobius/design-system@^0.20.0 hds-not-found-pattern --root . --dry-run
npx -p @hirobius/design-system@^0.20.0 hds-tile-grid --root . --dry-run
npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .
npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .
npx -p @hirobius/design-system@^0.20.0 hds-not-found-pattern --root .
npx -p @hirobius/design-system@^0.20.0 hds-tile-grid --root .
```

The four run in any order and reach the same files. Each one's `--check`
exits 0 once nothing is left for it, and `hds-patterns-subpath --check` also
stays at 1 while a NotFoundPattern or TileGrid import remains.

After upgrading, the installed copies run without a download:
`pnpm exec hds-prefix --root .`, or
`node node_modules/@hirobius/design-system/codemods/hds-prefix.mjs --root .`.

### Pattern components leave the root

The 21 pattern modules are no longer re-exported from the package root (hds#254).
Six of them (AssetImg, CodeBlock, ErrorPattern, Form, Page, Reveal) export every
name unchanged on `@hirobius/design-system/patterns`; their names are below. The
other 15 are removed outright in the same release, from `/patterns` too: their
names are under [Components removed with no survivor](#components-removed-with-no-survivor-hds394-wave-4a).

| Removed from `@hirobius/design-system` | Use instead                                                         | Codemod                                                                |
| -------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `AssetImg`                             | `AssetImg` from `@hirobius/design-system/patterns`                  | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `AssetImgProps`                        | `AssetImgProps` from `@hirobius/design-system/patterns`             | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `blockCodeTextVariants`                | `blockCodeTextVariants` from `@hirobius/design-system/patterns`     | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `blockContainerVariants`               | `blockContainerVariants` from `@hirobius/design-system/patterns`    | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `blockHeaderVariants`                  | `blockHeaderVariants` from `@hirobius/design-system/patterns`       | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `chevronVariants`                      | `chevronVariants` from `@hirobius/design-system/patterns`           | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `CodeBlock`                            | `CodeBlock` from `@hirobius/design-system/patterns`                 | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `CodeBlockProps`                       | `CodeBlockProps` from `@hirobius/design-system/patterns`            | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `collapsibleToggleVariants`            | `collapsibleToggleVariants` from `@hirobius/design-system/patterns` | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `copyButtonVariants`                   | `copyButtonVariants` from `@hirobius/design-system/patterns`        | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `ErrorPattern`                         | `ErrorPattern` from `@hirobius/design-system/patterns`              | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `ErrorPatternProps`                    | `ErrorPatternProps` from `@hirobius/design-system/patterns`         | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FieldWiring`                          | `FieldWiring` from `@hirobius/design-system/patterns`               | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FieldWiringInput`                     | `FieldWiringInput` from `@hirobius/design-system/patterns`          | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `Form`                                 | `Form` from `@hirobius/design-system/patterns`                      | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FormField`                            | `FormField` from `@hirobius/design-system/patterns`                 | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FormFieldProps`                       | `FormFieldProps` from `@hirobius/design-system/patterns`            | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FormFieldShell`                       | `FormFieldShell` from `@hirobius/design-system/patterns`            | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FormFieldShellProps`                  | `FormFieldShellProps` from `@hirobius/design-system/patterns`       | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FormProps`                            | `FormProps` from `@hirobius/design-system/patterns`                 | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `inlineCodeTextVariants`               | `inlineCodeTextVariants` from `@hirobius/design-system/patterns`    | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `inlineWrapperVariants`                | `inlineWrapperVariants` from `@hirobius/design-system/patterns`     | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `Page`                                 | `Page` from `@hirobius/design-system/patterns`                      | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `PageProps`                            | `PageProps` from `@hirobius/design-system/patterns`                 | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `prePanelVariants`                     | `prePanelVariants` from `@hirobius/design-system/patterns`          | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `Reveal`                               | `Reveal` from `@hirobius/design-system/patterns`                    | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `RevealAnimation`                      | `RevealAnimation` from `@hirobius/design-system/patterns`           | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `RevealProps`                          | `RevealProps` from `@hirobius/design-system/patterns`               | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `useFieldWiring`                       | `useFieldWiring` from `@hirobius/design-system/patterns`            | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |

### `Hds*` aliases

The six `Hds`-prefixed spellings (hds#315) are gone; each component is exported
under its bare name only. The `hds-prefix` codemod (`codemods/hds-prefix.mjs`)
rewrites the import specifier and nothing else: `import { HdsCheckbox }` becomes
`import { Checkbox as HdsCheckbox }`, so the file keeps its local name and every
reference (JSX tags, values, `typeof`, spreads, string keys) still resolves to
the same component. An existing alias stays (`HdsSelect as Pick` becomes
`Select as Pick`), `type` modifiers, comments and layout are kept, and a
re-export keeps its own export name (`export { Toggle as HdsToggle }`). Only
imports whose source is exactly `@hirobius/design-system` change. Renaming the
local binding to `Checkbox` afterwards is optional and a manual edit. Running it
twice changes nothing. It cannot see through `export * from '@hirobius/design-system'`,
or through a namespace import or a dynamic `import()`, `require()`, `vi.mock` or
`jest.mock` of the root in a file that reads an alias off something
(`HDS.HdsSlider`, `m['HdsToggle']`, `const { HdsRadio } = require(…)`);
`--check` exits 1 and lists those for a manual edit.
It also lists a file it cannot read to its end, as `hds-patterns-subpath` does.

| Removed from `@hirobius/design-system` | Use instead | Codemod                                                      |
| -------------------------------------- | ----------- | ------------------------------------------------------------ |
| `HdsCheckbox`                          | `Checkbox`  | `npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .` |
| `HdsRadio`                             | `Radio`     | `npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .` |
| `HdsSelect`                            | `Select`    | `npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .` |
| `HdsSlider`                            | `Slider`    | `npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .` |
| `HdsToggle`                            | `Toggle`    | `npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .` |
| `HdsTooltip`                           | `Tooltip`   | `npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .` |

Ops imports `HdsCheckbox` in one file. A read-only dry run on 2026-10-01 (ops
main 76ef65e) rewrites that import in
`src/app/pages/ops/leads/LeadSweepPanel.tsx` to `Checkbox as HdsCheckbox` and
leaves its JSX tag as written; no other `Hds*` alias is imported.

### Docs and lab components

Five components that existed to build the HDS docs and token lab (hds#232,
deprecated in 0.16) are deleted, source and stories included. No consumer
imports any of them, so there is no codemod. Their two drawings in the Figma
staging file were never promoted and leave the promotion list.

| Removed from `@hirobius/design-system` | Use instead                                                                                                  | Codemod                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| `CinematicLink`                        | No replacement; the animated editorial link treatment is dropped. A plain link in body copy is `InlineLink`. | none: no consumer imports it |
| `CinematicLinkProps`                   | No replacement; dropped with `CinematicLink`.                                                                | none: no consumer imports it |
| `ComponentInstanceMatrix`              | No replacement; the docs-page variant and state specimen matrix is dropped.                                  | none: no consumer imports it |
| `FoundationSwatch`                     | No replacement; the colour-token specimen swatch is dropped.                                                 | none: no consumer imports it |
| `FoundationSwatchProps`                | No replacement; dropped with `FoundationSwatch`.                                                             | none: no consumer imports it |
| `Sketch`                               | No replacement; the generative-canvas page shell is dropped.                                                 | none: no consumer imports it |
| `SketchProps`                          | No replacement; dropped with `Sketch`.                                                                       | none: no consumer imports it |
| `Token`                                | No replacement; the token-path node specimen is dropped.                                                     | none: no consumer imports it |
| `TokenProps`                           | No replacement; dropped with `Token`.                                                                        | none: no consumer imports it |
| `tokenLabelVariants`                   | No replacement; dropped with `Token`.                                                                        | none: no consumer imports it |
| `tokenNodeInlineVariants`              | No replacement; dropped with `Token`.                                                                        | none: no consumer imports it |
| `tokenShellVariants`                   | No replacement; dropped with `Token`.                                                                        | none: no consumer imports it |

### Components removed with no survivor (hds#394 wave 4a)

Thirty-two components fail hds#389's survival rule and have no replacement in
HDS (ADR-034 covers the date pickers). None is imported by a consumer: ops
origin/main (76ef65e) has 0 import sites for any of them, folio and concrete
import only `variables.css`, and site-engine has no HDS dependency. So there is
no codemod to run. `hds-patterns-subpath --check` reports a named import or
re-export of any of these names from the root or from `/patterns` as "removed
in 0.20.0, no replacement" for a manual edit (the list is
`codemods/removed-0.20.json`). It reads named imports only: a removed name read
through a namespace import or a dynamic `import()` is left to the type checker.
Their stories, manifest specs, Figma disposition rows, Code Connect exemptions
and staging-promotion entries go with them, and so do the `styles.css` and
`tokens.css` rules only they used: `.hds-doc-link-card` (DocLinkCard),
`.hds-stepper-input` (StepperField), `.hds-doc-section-header` and
`.hds-doc-section-copy-icon` (TextLockup), and `.hds-page-enter` with its
keyframes (HdsSystemDocLayout). ButtonGroup, ContextMenu and
HoverCard also leave the curated core set; with Menu, Popover, Tooltip and HdsRouterProvider added (hds#393) it is 43 components.

| Removed                     | From        | Use instead                                                                                                                                     | Codemod                                                                        |
| --------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `activityAvatarVariants`    | `/patterns` | No replacement; dropped with `ActivityFeed`.                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `ActivityEvent`             | `/patterns` | No replacement; dropped with `ActivityFeed`.                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `ActivityFeed`              | `/patterns` | No replacement; the activity feed is dropped.                                                                                                   | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `ActivityFeedProps`         | `/patterns` | No replacement; dropped with `ActivityFeed`.                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `ActivityStatus`            | `/patterns` | No replacement; dropped with `ActivityFeed`.                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `ActivityTone`              | `/patterns` | No replacement; dropped with `ActivityFeed`.                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `activityToneVariants`      | `/patterns` | No replacement; dropped with `ActivityFeed`.                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `AppShell`                  | `/patterns` | No replacement; the app shell is dropped. Compose `Sidebar` for a navigation and content split.                                                 | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `AppShellProps`             | `/patterns` | No replacement; dropped with `AppShell`.                                                                                                        | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `appShellVariants`          | `/patterns` | No replacement; dropped with `AppShell`.                                                                                                        | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `ButtonGroup`               | root        | No replacement; the joined button row is dropped. Lay buttons out with `Stack direction="row"`.                                                 | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `ButtonGroupProps`          | root        | No replacement; dropped with `ButtonGroup`.                                                                                                     | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `buttonGroupVariants`       | root        | No replacement; dropped with `ButtonGroup`.                                                                                                     | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `Calendar`                  | `/patterns` | The calendar picker is dropped (ADR-034). Use `Input type="date"`.                                                                              | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `CalendarProps`             | `/patterns` | No replacement; dropped with `Calendar`.                                                                                                        | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `Carousel`                  | `/patterns` | No replacement; the carousel is dropped.                                                                                                        | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `carouselControlVariants`   | `/patterns` | No replacement; dropped with `Carousel`.                                                                                                        | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `CarouselProps`             | `/patterns` | No replacement; dropped with `Carousel`.                                                                                                        | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `CaseStudyLayout`           | root        | No replacement; the case-study page template is dropped. Compose `Container` and `Stack`.                                                       | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `CaseStudyLayoutProps`      | root        | No replacement; dropped with `CaseStudyLayout`.                                                                                                 | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `cmdkDescriptionVariants`   | `/patterns` | No replacement; dropped with `CommandPalette`.                                                                                                  | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `cmdkKindBadgeVariants`     | `/patterns` | No replacement; dropped with `CommandPalette`.                                                                                                  | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `cmdkRowVariants`           | `/patterns` | No replacement; dropped with `CommandPalette`.                                                                                                  | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `CommandPalette`            | `/patterns` | No replacement; the command palette is dropped.                                                                                                 | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `CommandPaletteProps`       | `/patterns` | No replacement; dropped with `CommandPalette`.                                                                                                  | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `ContextMenu`               | root        | No replacement; the right-click menu is dropped. `Menu` covers a menu behind a visible trigger.                                                 | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `DateInput`                 | root        | The date picker is dropped (ADR-034). Use `Input type="date"`.                                                                                  | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `DateInputProps`            | root        | No replacement; dropped with `DateInput`.                                                                                                       | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `DateRangeInput`            | root        | The date-range picker is dropped (ADR-034). Use two `Input type="date"` fields.                                                                 | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `DateRangeInputProps`       | root        | No replacement; dropped with `DateRangeInput`.                                                                                                  | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `DateTimeInput`             | root        | The date-and-time picker is dropped (ADR-034). Use `Input type="datetime-local"`.                                                               | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `DateTimeInputProps`        | root        | No replacement; dropped with `DateTimeInput`.                                                                                                   | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `defaultActivityEvents`     | `/patterns` | No replacement; dropped with `ActivityFeed`.                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `DocLinkCard`               | `/patterns` | No replacement; the docs link card is dropped. Compose `Card` and `InlineLink`.                                                                 | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `DocLinkCardProps`          | `/patterns` | No replacement; dropped with `DocLinkCard`.                                                                                                     | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `docLinkCardVariants`       | `/patterns` | No replacement; dropped with `DocLinkCard`.                                                                                                     | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `ErrorBoundary`             | root        | No replacement; the render-error boundary is dropped. Use a React error boundary of your own with `ErrorPattern` (`/patterns`) as its fallback. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `ErrorBoundaryProps`        | root        | No replacement; dropped with `ErrorBoundary`.                                                                                                   | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `FileInput`                 | `/patterns` | No replacement; the styled file picker is dropped. Use a native `<input type="file">`.                                                          | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `FileInputProps`            | `/patterns` | No replacement; dropped with `FileInput`.                                                                                                       | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `fileInputVariants`         | `/patterns` | No replacement; dropped with `FileInput`.                                                                                                       | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `HdsDocsShell`              | root        | No replacement; the docs-site shell (nav and contents rails) is dropped.                                                                        | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `HdsDocsShellProps`         | root        | No replacement; dropped with `HdsDocsShell`.                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `HdsSystemDocLayout`        | root        | No replacement; the docs-page column layout is dropped.                                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `HeadingStack`              | root        | `Stack` + `Text`: a heading `Text` and a `text-muted-foreground` body `Text` in a `Stack gap="gap"` (docs/rules/REACT_COMPONENTS.md).           | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `headingStackLevelVariants` | root        | `Stack` + `Text`: a heading `Text` and a `text-muted-foreground` body `Text` in a `Stack gap="gap"` (docs/rules/REACT_COMPONENTS.md).           | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `HeadingStackProps`         | root        | `Stack` + `Text`: a heading `Text` and a `text-muted-foreground` body `Text` in a `Stack gap="gap"` (docs/rules/REACT_COMPONENTS.md).           | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `headingStackVariants`      | root        | `Stack` + `Text`: a heading `Text` and a `text-muted-foreground` body `Text` in a `Stack gap="gap"` (docs/rules/REACT_COMPONENTS.md).           | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `HistoryCard`               | root        | No replacement; the commit-history card is dropped.                                                                                             | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `HistoryCardCommit`         | root        | No replacement; dropped with `HistoryCard`.                                                                                                     | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `HistoryCardProps`          | root        | No replacement; dropped with `HistoryCard`.                                                                                                     | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `HoverCard`                 | root        | No replacement; the hover preview card is dropped. `Tooltip` covers a short hint, `Popover` richer content.                                     | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `Lightbox`                  | `/patterns` | No replacement; the full-screen image viewer is dropped. `AssetImg` stays.                                                                      | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `LightboxProps`             | `/patterns` | No replacement; dropped with `Lightbox`.                                                                                                        | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `NavGroup`                  | root        | No replacement; the collapsible navigation group is dropped.                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `navGroupLabelVariants`     | root        | No replacement; dropped with `NavGroup`.                                                                                                        | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `NavGroupProps`             | root        | No replacement; dropped with `NavGroup`.                                                                                                        | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `navIndicatorVariants`      | `/patterns` | No replacement; dropped with `NavItem`.                                                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `NavItem`                   | `/patterns` | No replacement; the navigation item is dropped.                                                                                                 | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `navItemVariants`           | `/patterns` | No replacement; dropped with `NavItem`.                                                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `NavProps`                  | `/patterns` | No replacement; dropped with `NavItem`.                                                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `OverflowList`              | `/patterns` | No replacement; the "+N" overflow list is dropped.                                                                                              | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `OverflowListProps`         | `/patterns` | No replacement; dropped with `OverflowList`.                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `SideNav`                   | `/patterns` | No replacement; the side navigation is dropped.                                                                                                 | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `SideNavLevel`              | `/patterns` | No replacement; dropped with `SideNav`.                                                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `SideNavProps`              | `/patterns` | No replacement; dropped with `SideNav`.                                                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `sideNavVariants`           | `/patterns` | No replacement; dropped with `SideNav`.                                                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `StackedCardRail`           | `/patterns` | No replacement; the pinned card rail is dropped.                                                                                                | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `StackedCardRailCard`       | `/patterns` | No replacement; dropped with `StackedCardRail`.                                                                                                 | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `StackedCardRailProps`      | `/patterns` | No replacement; dropped with `StackedCardRail`.                                                                                                 | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `Step`                      | `/patterns` | No replacement; dropped with `Stepper`.                                                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `stepMarkerVariants`        | `/patterns` | No replacement; dropped with `Stepper`.                                                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `Stepper`                   | `/patterns` | No replacement; the step indicator is dropped.                                                                                                  | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `StepperField`              | root        | No replacement; the number stepper is dropped. Use `Input type="number"`.                                                                       | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `StepperFieldProps`         | root        | No replacement; dropped with `StepperField`.                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `StepperProps`              | `/patterns` | No replacement; dropped with `Stepper`.                                                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `TextLockup`                | root        | `Stack` + `Text`: a heading `Text` and a `text-muted-foreground` body `Text` in a `Stack gap="gap"` (docs/rules/REACT_COMPONENTS.md).           | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `TextLockupProps`           | root        | `Stack` + `Text`: a heading `Text` and a `text-muted-foreground` body `Text` in a `Stack gap="gap"` (docs/rules/REACT_COMPONENTS.md).           | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `Tokenizer`                 | root        | No replacement; the token (chip) input is dropped.                                                                                              | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `TokenizerProps`            | root        | No replacement; dropped with `Tokenizer`.                                                                                                       | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `Toolbar`                   | `/patterns` | No replacement; the toolbar is dropped. A row of buttons is `Stack direction="row"`.                                                            | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `ToolbarComponent`          | `/patterns` | No replacement; dropped with `Toolbar`.                                                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `TopNav`                    | `/patterns` | No replacement; the top navigation bar is dropped.                                                                                              | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `TopNavProps`               | `/patterns` | No replacement; dropped with `TopNav`.                                                                                                          | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `TreeList`                  | `/patterns` | No replacement; the tree list is dropped.                                                                                                       | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `TreeListProps`             | `/patterns` | No replacement; dropped with `TreeList`.                                                                                                        | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `TreeNode`                  | `/patterns` | No replacement; dropped with `TreeList`.                                                                                                        | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |

### Components folded into a survivor (hds#394 wave 4b)

Thirteen components fold into a survivor that hds#393 shipped, so 0.20.0 removes
them from the root with their props types. Each row gives the survivor and maps
every prop; `tests/prune-wave-4b-survivors.test.tsx` renders each recipe. Ops
origin/main (76ef65e) imports none of the thirteen, so there is no rewrite
codemod: `hds-patterns-subpath --check` reports a named import of one for a
manual edit and names its survivor ("removed in 0.20.0, use Button iconOnly
…", from `replaced` in `codemods/removed-0.20.json`). The layout recipes use
`Box` with `style`, not `sx`, because `sx` injects its rule on the client only
and server-rendered HTML would lose the layout. Spacing comes from the token
bridge (`import hds from '@hirobius/design-system/tokens'`): the old `tight`,
`normal`, `inset` and `spacious` are `hds.semantic.space.scale.sm`, `.md`,
`.lg` and `.xl`. Their stories, manifest specs, Figma disposition rows and
staging-promotion entries go with them.

StatusDot is not removed. Badge `dot` takes its `tone`, `size` and `label`, but
ops passes StatusDot a `style` (`src/app/pages/ops/audit/FleetAuditPage.tsx`),
and Badge takes no `style` (it is className-only, `check-no-style-prop`), so no
codemod can rewrite that import mechanically. It is deprecated instead, for
removal in 0.21.0: see [StatusDot is deprecated](#statusdot-is-deprecated-removed-in-0210-hds395).

| Removed                 | Use instead                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Codemod                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `AspectRatio`           | `Box` with `style`: `<Box style={{ aspectRatio: '16 / 9' }}>`. `ratio={r}` becomes `style.aspectRatio` (`String(r)` or `'16 / 9'`). Radix positioned the child absolutely; give it `width: '100%'` and `height: '100%'` instead.                                                                                                                                                                                                                                                                              | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `AspectRatioProps`      | `BoxProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `Bleed`                 | `Box` with `style`: ``<Box style={{ marginInline: `calc(-1 * ${hds.semantic.space.scale.md})` }}>``. `amount` becomes the scale step it negated (`tight` sm, `normal` md, `inset` lg, `spacious` xl). `axis="x"` (default) is `marginInline`, `"y"` is `marginBlock`, `"both"` is `margin`. `as`, `className` and `style` are Box's.                                                                                                                                                                          | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `BleedProps`            | `BoxProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `Center`                | `Container` + `Box`: `<Container maxWidth="content">` with `<Box style={{ paddingInline: hds.semantic.space.scale.md }}>` inside for the gutter. `maxWidth` is the same (Center defaulted to `'content'`, Container defaults to `'max'`: pass it). `gutter` becomes the inner Box's `paddingInline` step. For `as` or `ref`, use one `Box` with `style={{ marginInline: 'auto', maxWidth: 'var(--semantic-layout-width-content)' }}`.                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `CenterProps`           | `ContainerProps` (and `BoxProps` for the gutter)                                                                                                                                                                                                                                                                                                                                                                                                                                                              | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `CircularProgress`      | `<Progress variant="circular">`. `value`, `max`, `size` (sm 16px, md 24px, lg 32px), `tone` and `label` are the same; `indeterminate` becomes leaving `value` out. `label` now defaults to `'Progress'`.                                                                                                                                                                                                                                                                                                      | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `CircularProgressProps` | `ProgressProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `Cluster`               | `<Stack direction="row" wrap="wrap" align="center">`. `gap` reads the same steps with the same `tight` default. Pass `align` (Cluster defaulted to `center`, a Stack row to `stretch`). `justify`, `as`, `className`, `style` and `ref` are the same.                                                                                                                                                                                                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `ClusterProps`          | `StackProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `Cover`                 | `Box` with `style`: `<Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh', gap: hds.semantic.space.scale.md }}>`, with the main region in `<Box style={{ marginBlock: 'auto', width: '100%' }}>`. `minHeight` and `gap` (as a scale step) move into `style`. `header` and `footer` become a `<Box style={{ flexShrink: 0 }}>` before and after the main region, and `centerSlot` or `children` its content. `Stack direction="column"` with `style={{ minHeight }}` is the same shell. | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `CoverProps`            | `BoxProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `Frame`                 | `Box` with `style`: `<Box style={{ aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: hds.borderRadius.md }}>`. `ratio` becomes `style.aspectRatio`, `radius` becomes `hds.borderRadius.sm`, `.md` (default), `.full` or `[0]` (`none`). Give the media `width: '100%'`, `height: '100%'` and `objectFit: 'cover'`.                                                                                                                                                                                     | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `FrameProps`            | `BoxProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `IconButton`            | `<Button iconOnly label="…" iconLeft={<Icon icon={X} size="medium" />} />`. `icon` moves into `iconLeft` as an `Icon`, sized `small`, `medium` or `large` for a `sm`, `md` or `lg` button (`iconSize` is the Icon's `size`, `iconColor` its `color`). `label` or `aria-label` becomes `label`, which names the button. `variant`, `size`, `disabled` and the other button props are the same.                                                                                                                 | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `IconButtonProps`       | `ButtonProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `InputGroup`            | `<Input prefix={…} suffix={…} />`. `leading` becomes `prefix` and `trailing` `suffix`; `size`, `disabled` and the native input props are the same, and `className` is still the outer wrapper's. Input adds `label`, `helperText` and `errorMessage`.                                                                                                                                                                                                                                                         | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `InputGroupProps`       | `InputProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `MultiSelector`         | `<Combobox multiple options={…} value={…} onChange={…} />`. `options` (`{ value, label }`), `value` (`string[]`), `onChange(next)`, `placeholder`, `disabled` and `className` are the same, and the trigger still reads "N selected". Combobox adds search and a removable chip per value.                                                                                                                                                                                                                    | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `MultiSelectorOption`   | `ComboboxOption`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `MultiSelectorProps`    | `ComboboxMultipleProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `SelectableCard`        | `<Card selectable selected={…} onSelectedChange={…}>`. `selected` and `onSelectedChange` are the same. `disabled` becomes `aria-disabled` with no `onSelectedChange`, since the card is a `div` with `role="checkbox"`, not a `button`. `data-state="checked"` becomes `data-selected="true"`.                                                                                                                                                                                                                | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `SelectableCardProps`   | `CardProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `TimeInput`             | `<Input type="time" />`. `size`, `value` (`HH:mm`), `onChange`, `min`, `max`, `step` and the other native props are the same, and like TimeInput it shows no clear button. Input adds `label`, `helperText` and `errorMessage`.                                                                                                                                                                                                                                                                               | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `TimeInputProps`        | `InputProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `ToggleButton`          | `<Button pressed={…} onPressedChange={…}>`. `pressed`, `defaultPressed`, `onPressedChange`, `size`, `disabled` and `aria-label` are the same, as is `variant="secondary"`; `variant="ghost"` becomes `variant="tertiary"`. `data-state="on"` becomes `data-pressed="true"`.                                                                                                                                                                                                                                   | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |
| `ToggleButtonProps`     | `ButtonProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | none: no consumer imports it; `hds-patterns-subpath --check` names the survivor |

### Components ops renders, each with a codemod (hds#395 B5)

Ops imports three names in hds#389's prune set: NotFoundPattern, TileGrid and
StatusTile. Under the decision update a name ops imports goes in 0.20.0 once a
codemod rewrites every ops site, so each has one:

- **NotFoundPattern** took no props and rendered
  `<ErrorPattern displayText="404" message="Page not found" />`. The
  `hds-not-found-pattern` codemod (`codemods/not-found-pattern.mjs`) writes that
  element in its place and imports ErrorPattern from `/patterns`. It joins an
  existing `/patterns` import, reuses an ErrorPattern the file already
  imports, and keeps an alias as the file's name (`NotFoundPattern as Missing`
  becomes `ErrorPattern as Missing`). Attributes the tag already has (`key`)
  stay. A spread, or a `displayText` or `message` NotFoundPattern ignored, is
  left for a manual edit.
- **TileGrid** folds into `Grid`, which renders its recipe since hds#393:
  `<TileGrid minTileWidth="280px">` becomes
  `<Grid layout="auto-fill" minItemWidth="280px" gap="medium">`. TileGrid's
  `gap="sm"` (12px, its default) is Grid's fixed 12px `medium` step, and
  TileGrid's 260px default width is written out because Grid defaults to
  280px. An expression width that can be undefined keeps that fallback:
  `minTileWidth={w}` becomes `minItemWidth={w ?? '260px'}`. One that never is
  (a string or template literal, or a conditional whose branches all are) is
  written through as it is, since TypeScript rejects `??` on it (TS2869), and
  one the codemod does not read (a concatenation, a cast) is left for a manual
  edit. The `hds-tile-grid` codemod
  (`codemods/tile-grid.mjs`) makes the rewrite, and the rendered tracks and
  gap are the same as TileGrid's under every tenant and density
  (`scripts/__tests__/grid-tile-grid-parity.test.mjs`, in Chromium, for each
  ops tag). It leaves for a manual edit `gap="xs"` and `gap="md"`: TileGrid
  fixed them at 8px and 16px, and Grid's nearest steps, `tight` and `normal`,
  tighten to 6px and 12px under compact density. It does the same for a gap
  or spread it cannot read, a self-closing tag (Grid needs children) and an
  import of `TileGridProps`.
- **StatusTile** is not removed. It leaves the root for `/patterns`
  (hds#389 D5), with `StatusTileProps` and `StatusTileTone`, and
  `hds-patterns-subpath` moves the import like any other `/patterns` name.

Both new codemods keep comments and layout, change only imports whose source
is exactly `@hirobius/design-system`, and change nothing on a second run. A
file with any use they cannot rewrite (`typeof TileGrid`, a value use, a
re-export, a namespace or dynamic import that reads the name, or a file they
cannot read to its end) is left as written, and `--check` exits 1 and lists
it. Their stories, manifest specs and Figma disposition rows go with them.

| Removed from `@hirobius/design-system` | Use instead                                                                                                                              | Codemod                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `NotFoundPattern`                      | `<ErrorPattern displayText="404" message="Page not found" />` from `@hirobius/design-system/patterns`                                    | `npx -p @hirobius/design-system@^0.20.0 hds-not-found-pattern --root .`     |
| `TileGrid`                             | `<Grid layout="auto-fill" minItemWidth="…" gap="medium">` (`minTileWidth` is `minItemWidth`, 260px when unset; `gap="sm"` is `"medium"`) | `npx -p @hirobius/design-system@^0.20.0 hds-tile-grid --root .`             |
| `TileGridProps`                        | `GridProps`                                                                                                                              | none: the codemod lists an import of it for a manual edit; ops imports none |
| `StatusTile`                           | `StatusTile` from `@hirobius/design-system/patterns`                                                                                     | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .`      |
| `StatusTileProps`                      | `StatusTileProps` from `@hirobius/design-system/patterns`                                                                                | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .`      |
| `StatusTileTone`                       | `StatusTileTone` from `@hirobius/design-system/patterns`                                                                                 | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .`      |

A read-only dry run on 2026-10-01 (ops main 76ef65e) rewrites:
`hds-not-found-pattern` 1 file, 1 site (`src/app/pages/NotFoundPage.tsx`);
`hds-tile-grid` 2 files, 7 sites (`src/app/pages/ops/ClientDashboardPage.tsx`
6, `src/app/pages/ops/agentic-os/SurfacesRail.tsx` 1). `hds-patterns-subpath`
now moves 12 import sites in the same 11 files: `ClientDashboardPage.tsx`
imports StatusTile in a second statement, next to the one that imports Page.
With `hds-prefix` that is 14 ops files, and each codemod's `--check` exits 0
after the run.

### StatusDot is deprecated (removed in 0.21.0, hds#395)

StatusDot stays in 0.20.0 and is deprecated: its JSDoc carries `@deprecated`
with `@removeIn 0.21.0`, and in a development build it logs one
`[HDS deprecation]` console warning. Its survivor is `<Badge dot>`: `tone` (all
six), `size` (`sm`, `md` by default, `lg`) and `label` (a `role="status"` with
that `aria-label`; decorative without one) are the same, and so is the dot.

| Deprecated       | Use instead                                   | Codemod                                                      |
| ---------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `StatusDot`      | `<Badge dot tone={…} size={…} label={…} />`   | none: a `style` has no Badge mapping, so the edit is by hand |
| `StatusDotProps` | `BadgeProps` (`dot`, `tone`, `size`, `label`) | none                                                         |

There is no codemod because Badge takes no `style` (it is className-only,
`check-no-style-prop`), and ops passes StatusDot one:
`<StatusDot tone={stateTone(row.state)} style={s.dot} />` in
`src/app/pages/ops/audit/FleetAuditPage.tsx`, where `s.dot` is
`{ marginTop: hds.space.px8 }`. Before 0.21.0 ops first replaces `style={…}`
with a wrapper or a `className`, then swaps the component:

```tsx
// A wrapper. display: flex makes it the dot's height, not a line box's.
<span style={{ display: 'flex', ...s.dot }}>
  <Badge dot tone={stateTone(row.state)} />
</span>

// Or a class the app owns.
<Badge dot tone={stateTone(row.state)} className="fleet-audit-dot" />
```

### Root `*Variants` helpers become private (hds#394)

The root no longer exports any `*Variants` cva helper. Each one still styles
its own component inside the package; it is just not public API any more, so a
component's look changes only through its props. No consumer imports one (ops
origin/main: 0 sites). `hds-patterns-subpath --check` reports an import of one
for a manual edit. The `/patterns` modules keep their exports, `*Variants`
included. The helpers of the removed components above are listed in that table.

| Removed from `@hirobius/design-system` | Module              | Use instead                                                                                   | Codemod                                                                        |
| -------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `badgeVariants`                        | `badge`             | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `blockquoteVariants`                   | `blockquote`        | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `buttonVariants`                       | `button`            | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `cardVariants`                         | `card`              | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `circularProgressVariants`             | `circular-progress` | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `crumbLabelVariants`                   | `breadcrumb`        | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `disclosureTriggerVariants`            | `disclosure`        | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `fieldValueVariants`                   | `field`             | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `hdsTimeInputVariants`                 | `time-input`        | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `hdsToggleButtonVariants`              | `toggle-button`     | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `inlineCodeVariants`                   | `inline-code`       | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `inputVariants`                        | `input`             | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `kbdVariants`                          | `kbd`               | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `metadataListVariants`                 | `metadata-list`     | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `overflowBubbleVariants`               | `avatar-group`      | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `progressTrackVariants`                | `progress`          | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `segmentedControlDescriptionVariants`  | `segmented-control` | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `segmentedControlFocusRingVariants`    | `segmented-control` | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `segmentedControlIndicatorVariants`    | `segmented-control` | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `segmentedControlItemVariants`         | `segmented-control` | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `segmentedControlLabelVariants`        | `segmented-control` | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `segmentedControlRailVariants`         | `segmented-control` | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `segmentedControlWrapperVariants`      | `segmented-control` | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `selectableCardVariants`               | `selectable-card`   | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `skeletonVariants`                     | `skeleton`          | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `spinnerVariants`                      | `spinner`           | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `statusDotVariants`                    | `status-dot`        | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `statusListItemDotVariants`            | `status-list-item`  | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `statVariants`                         | `stat`              | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `surfaceVariants`                      | `surface`           | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `tableDataCellVariants`                | `table`             | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `tableHeaderCellVariants`              | `table`             | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `tableSortButtonVariants`              | `table`             | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `tagButtonVariants`                    | `tag`               | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `tagPillVariants`                      | `tag`               | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `textareaVariants`                     | `textarea`          | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `textVariants`                         | `text`              | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
| `toastIconVariants`                    | `toast`             | No replacement; the cva helper is private to its module. Style through the component's props. | none: no consumer imports it; `hds-patterns-subpath --check` reports an import |
