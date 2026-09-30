# Migrations

How HDS deprecates and removes public API, with the one cycle run so far. Token
renames live in [TOKEN_MIGRATION.md](TOKEN_MIGRATION.md).

## The cycle

1. **Deprecate.** The new path ships and the old one keeps working. The old one
   carries `@deprecated` and `@removeIn` JSDoc that names the replacement.
2. **Give a codemod.** A script in `codemods/` rewrites consumer code, supports
   `--check` (exit 1 when a rewrite is needed, writes nothing) and `--dry-run`,
   and has unit tests against fixture files.
3. **Run it on a real consumer.** The dry-run diff is filed as an issue on the
   consumer's repo. HDS never pushes to it.
4. **Remove** at the announced window, in a major.

## Pattern components move to `/patterns`

- **Deprecated in:** 0.17 (hds#254). 21 pattern-tier components are still
  exported from the package root, each marked `@deprecated`. They are also
  exported from `@hirobius/design-system/patterns`.
- **Removed from the root in:** 1.0 by default. The window is set under
  hds#254, so the date changes only if that decision does.
- **Codemod:** `codemods/patterns-subpath.mjs`, also installed as the
  `hds-patterns-subpath` binary. The names it moves are generated from
  `src/index.ts` (`pnpm codemod:names`), never listed by hand.

```bash
# Preview what would change, writes nothing
npx hds-patterns-subpath --root . --dry-run

# CI guard: exit 1 while any root pattern import remains
npx hds-patterns-subpath --root . --check

# Rewrite in place
npx hds-patterns-subpath --root .
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

## Spacing names move to the t-shirt scale

- **Deprecated in:** 0.17 (hds#206). Spacing is one scale,
  `semantic.space.scale.{xs,sm,md,lg,xl}` (8/16/24/32/48px). The old names
  still resolve to the same computed values and carry `$deprecated` in
  `hirobius.tokens.json`.
- **Removed in:** not before 1.0, because removal happens in a major (step 4).
  No window is set yet: steps 2 and 3 come first.
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
scale step. Stack's `gap` keeps its old names for now, because its `'xs'` is the
2px subgrid step, not `scale.xs`.

Upgrade first: Box `sx` takes `'xs'` to `'xl'` only from the first release after
0.19.1. On 0.19.1 and earlier the string passes through, so `p: 'sm'` becomes
`padding: sm`, which is invalid CSS and renders no padding. From the same
release, a number on Stack's `gap` resolves the way Box `sx` does, as a count of
4px units (it used to pass through as raw px). Stack's types never allowed a
number, so only untyped callers see this.

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
