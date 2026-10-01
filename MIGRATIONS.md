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
  parts, hooks, `*Variants`); `/patterns` exports all of it. See
  [0.20.0 removals](#0200-removals-2026-10-01).
- **Codemod:** `codemods/patterns-subpath.mjs`, also installed as the
  `hds-patterns-subpath` binary. The names it moves are everything
  `/patterns` exports and the root does not (`pnpm codemod:names`), never
  listed by hand.

```bash
# Preview what would change, writes nothing
npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root . --dry-run

# CI guard: exit 1 while any root pattern import remains
npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root . --check

# Rewrite in place
npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .
```

Other named imports stay on the root. Aliases (`SideNav as Nav`), `type`
modifiers and multi-line layout are kept, and a pattern name joins an existing
`/patterns` import instead of adding a second one. Default plus named imports
(`import HDS, { Page }`), `export { Page } from` re-exports and indented imports
are handled. `--dry-run` prints each import line before (`-`) and after (`+`).
Namespace imports (`import * as HDS`, `export *`) hide the names, so the codemod
cannot rewrite them: `--check` exits 1 and lists them for a manual edit.
`node_modules`, `dist` and `.git` are skipped.

Upgrade the package to 0.17 first: `/patterns` does not exist in 0.16.

### First consumer run

Ops (`hirobius/ops`) pins `^0.16.0`. A read-only dry run on 2026-09-29 found 11
import sites in 11 files, all four names being `Page`, `ErrorPattern`,
`AssetImg` and `CodeBlock`. The rewrite is tracked as an issue on the Ops repo.
A second dry run on 2026-10-01 (ops main 76ef65e) found the same 11 sites.

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

The first removal batch under step 4 (hds#389 R1). Every name below was
deprecated in an earlier 0.x release: 79 root names that moved to `/patterns`,
six `Hds*` aliases and five docs/lab components (12 names). Nothing else left
the public API. Ops,
the one consumer that imports components, pins a caret range below 0.20, so
nothing breaks until it upgrades; run the codemods first.

```bash
# Preview, then rewrite in place. `-p` runs the bins from the 0.20 package
# (hds-prefix first ships in 0.20.0), so npx never looks the bin name up on
# its own in the registry. Works before or after you upgrade.
npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root . --dry-run
npx -p @hirobius/design-system@^0.20.0 hds-prefix --root . --dry-run
npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .
npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .
```

After upgrading, the installed copies run without a download:
`pnpm exec hds-prefix --root .`, or
`node node_modules/@hirobius/design-system/codemods/hds-prefix.mjs --root .`.

### Pattern components leave the root

The 21 pattern modules are no longer re-exported from the package root (hds#254).
Every name they exported is unchanged on `@hirobius/design-system/patterns`.

| Removed from `@hirobius/design-system` | Use instead                                                         | Codemod                                                                |
| -------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `activityAvatarVariants`               | `activityAvatarVariants` from `@hirobius/design-system/patterns`    | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `ActivityEvent`                        | `ActivityEvent` from `@hirobius/design-system/patterns`             | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `ActivityFeed`                         | `ActivityFeed` from `@hirobius/design-system/patterns`              | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `ActivityFeedProps`                    | `ActivityFeedProps` from `@hirobius/design-system/patterns`         | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `ActivityStatus`                       | `ActivityStatus` from `@hirobius/design-system/patterns`            | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `ActivityTone`                         | `ActivityTone` from `@hirobius/design-system/patterns`              | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `activityToneVariants`                 | `activityToneVariants` from `@hirobius/design-system/patterns`      | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `AppShell`                             | `AppShell` from `@hirobius/design-system/patterns`                  | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `AppShellProps`                        | `AppShellProps` from `@hirobius/design-system/patterns`             | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `appShellVariants`                     | `appShellVariants` from `@hirobius/design-system/patterns`          | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `AssetImg`                             | `AssetImg` from `@hirobius/design-system/patterns`                  | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `AssetImgProps`                        | `AssetImgProps` from `@hirobius/design-system/patterns`             | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `blockCodeTextVariants`                | `blockCodeTextVariants` from `@hirobius/design-system/patterns`     | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `blockContainerVariants`               | `blockContainerVariants` from `@hirobius/design-system/patterns`    | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `blockHeaderVariants`                  | `blockHeaderVariants` from `@hirobius/design-system/patterns`       | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `Calendar`                             | `Calendar` from `@hirobius/design-system/patterns`                  | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `CalendarProps`                        | `CalendarProps` from `@hirobius/design-system/patterns`             | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `Carousel`                             | `Carousel` from `@hirobius/design-system/patterns`                  | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `carouselControlVariants`              | `carouselControlVariants` from `@hirobius/design-system/patterns`   | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `CarouselProps`                        | `CarouselProps` from `@hirobius/design-system/patterns`             | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `chevronVariants`                      | `chevronVariants` from `@hirobius/design-system/patterns`           | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `cmdkDescriptionVariants`              | `cmdkDescriptionVariants` from `@hirobius/design-system/patterns`   | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `cmdkKindBadgeVariants`                | `cmdkKindBadgeVariants` from `@hirobius/design-system/patterns`     | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `cmdkRowVariants`                      | `cmdkRowVariants` from `@hirobius/design-system/patterns`           | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `CodeBlock`                            | `CodeBlock` from `@hirobius/design-system/patterns`                 | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `CodeBlockProps`                       | `CodeBlockProps` from `@hirobius/design-system/patterns`            | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `collapsibleToggleVariants`            | `collapsibleToggleVariants` from `@hirobius/design-system/patterns` | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `CommandPalette`                       | `CommandPalette` from `@hirobius/design-system/patterns`            | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `CommandPaletteProps`                  | `CommandPaletteProps` from `@hirobius/design-system/patterns`       | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `copyButtonVariants`                   | `copyButtonVariants` from `@hirobius/design-system/patterns`        | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `defaultActivityEvents`                | `defaultActivityEvents` from `@hirobius/design-system/patterns`     | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `DocLinkCard`                          | `DocLinkCard` from `@hirobius/design-system/patterns`               | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `DocLinkCardProps`                     | `DocLinkCardProps` from `@hirobius/design-system/patterns`          | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `docLinkCardVariants`                  | `docLinkCardVariants` from `@hirobius/design-system/patterns`       | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `ErrorPattern`                         | `ErrorPattern` from `@hirobius/design-system/patterns`              | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `ErrorPatternProps`                    | `ErrorPatternProps` from `@hirobius/design-system/patterns`         | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FieldWiring`                          | `FieldWiring` from `@hirobius/design-system/patterns`               | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FieldWiringInput`                     | `FieldWiringInput` from `@hirobius/design-system/patterns`          | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FileInput`                            | `FileInput` from `@hirobius/design-system/patterns`                 | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FileInputProps`                       | `FileInputProps` from `@hirobius/design-system/patterns`            | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `fileInputVariants`                    | `fileInputVariants` from `@hirobius/design-system/patterns`         | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `Form`                                 | `Form` from `@hirobius/design-system/patterns`                      | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FormField`                            | `FormField` from `@hirobius/design-system/patterns`                 | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FormFieldProps`                       | `FormFieldProps` from `@hirobius/design-system/patterns`            | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FormFieldShell`                       | `FormFieldShell` from `@hirobius/design-system/patterns`            | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FormFieldShellProps`                  | `FormFieldShellProps` from `@hirobius/design-system/patterns`       | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `FormProps`                            | `FormProps` from `@hirobius/design-system/patterns`                 | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `inlineCodeTextVariants`               | `inlineCodeTextVariants` from `@hirobius/design-system/patterns`    | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `inlineWrapperVariants`                | `inlineWrapperVariants` from `@hirobius/design-system/patterns`     | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `Lightbox`                             | `Lightbox` from `@hirobius/design-system/patterns`                  | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `LightboxProps`                        | `LightboxProps` from `@hirobius/design-system/patterns`             | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `navIndicatorVariants`                 | `navIndicatorVariants` from `@hirobius/design-system/patterns`      | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `NavItem`                              | `NavItem` from `@hirobius/design-system/patterns`                   | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `navItemVariants`                      | `navItemVariants` from `@hirobius/design-system/patterns`           | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `NavProps`                             | `NavProps` from `@hirobius/design-system/patterns`                  | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `OverflowList`                         | `OverflowList` from `@hirobius/design-system/patterns`              | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `OverflowListProps`                    | `OverflowListProps` from `@hirobius/design-system/patterns`         | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `Page`                                 | `Page` from `@hirobius/design-system/patterns`                      | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `PageProps`                            | `PageProps` from `@hirobius/design-system/patterns`                 | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `prePanelVariants`                     | `prePanelVariants` from `@hirobius/design-system/patterns`          | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `Reveal`                               | `Reveal` from `@hirobius/design-system/patterns`                    | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `RevealAnimation`                      | `RevealAnimation` from `@hirobius/design-system/patterns`           | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `RevealProps`                          | `RevealProps` from `@hirobius/design-system/patterns`               | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `SideNav`                              | `SideNav` from `@hirobius/design-system/patterns`                   | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `SideNavLevel`                         | `SideNavLevel` from `@hirobius/design-system/patterns`              | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `SideNavProps`                         | `SideNavProps` from `@hirobius/design-system/patterns`              | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `sideNavVariants`                      | `sideNavVariants` from `@hirobius/design-system/patterns`           | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `Step`                                 | `Step` from `@hirobius/design-system/patterns`                      | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `stepMarkerVariants`                   | `stepMarkerVariants` from `@hirobius/design-system/patterns`        | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `Stepper`                              | `Stepper` from `@hirobius/design-system/patterns`                   | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `StepperProps`                         | `StepperProps` from `@hirobius/design-system/patterns`              | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `Toolbar`                              | `Toolbar` from `@hirobius/design-system/patterns`                   | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `ToolbarComponent`                     | `ToolbarComponent` from `@hirobius/design-system/patterns`          | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `TopNav`                               | `TopNav` from `@hirobius/design-system/patterns`                    | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `TopNavProps`                          | `TopNavProps` from `@hirobius/design-system/patterns`               | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `TreeList`                             | `TreeList` from `@hirobius/design-system/patterns`                  | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `TreeListProps`                        | `TreeListProps` from `@hirobius/design-system/patterns`             | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `TreeNode`                             | `TreeNode` from `@hirobius/design-system/patterns`                  | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |
| `useFieldWiring`                       | `useFieldWiring` from `@hirobius/design-system/patterns`            | `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath --root .` |

### `Hds*` aliases

The six `Hds`-prefixed spellings (hds#315) are gone; each component is exported
under its bare name only. The `hds-prefix` codemod (`codemods/hds-prefix.mjs`)
rewrites the import and renames the references to it in the same file: JSX tags,
values, `typeof`. Text keeps the old spelling: strings such as
`data-testid="HdsCheckbox-row"`, template text, comments and JSX text are not
changed, so selectors in other files still match. Where the bare name is
already taken in that file, or where renaming would change what the file exports
or looks up (`export { HdsCheckbox }`, a `{ HdsCheckbox }` shorthand property, an
`HdsCheckbox:` key, a method, a whole string `'HdsCheckbox'`), it imports
`Checkbox as HdsCheckbox` instead and leaves the uses alone. A re-export
keeps its own export name (`export { Toggle as HdsToggle }`), and
`HDS.HdsSlider` on a namespace import becomes `HDS.Slider`. It cannot see
through `export * from '@hirobius/design-system'`; `--check` lists those.

| Removed from `@hirobius/design-system` | Use instead | Codemod                                                      |
| -------------------------------------- | ----------- | ------------------------------------------------------------ |
| `HdsCheckbox`                          | `Checkbox`  | `npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .` |
| `HdsRadio`                             | `Radio`     | `npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .` |
| `HdsSelect`                            | `Select`    | `npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .` |
| `HdsSlider`                            | `Slider`    | `npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .` |
| `HdsToggle`                            | `Toggle`    | `npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .` |
| `HdsTooltip`                           | `Tooltip`   | `npx -p @hirobius/design-system@^0.20.0 hds-prefix --root .` |

Ops imports `HdsCheckbox` in one file. A read-only dry run on 2026-10-01 (ops
main 76ef65e) rewrites the import and one JSX tag in
`src/app/pages/ops/leads/LeadSweepPanel.tsx` to `Checkbox`; no other `Hds*`
alias is imported.

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
