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
