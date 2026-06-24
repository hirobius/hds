# HDS codemods

[jscodeshift](https://github.com/facebook/jscodeshift) transforms that migrate
consumer code across breaking changes in `@hirobius/design-system`. Every
breaking API change ships with a codemod here, referenced from its Changeset, so
upgrading is a single command rather than a manual find-and-replace.

## Running

```bash
pnpm codemod -t codemods/<name>.cjs <path-to-your-src>
# e.g.
pnpm codemod -t codemods/alert-tone-to-danger.cjs src
```

`pnpm codemod` is `jscodeshift --parser=tsx --extensions=tsx,ts`. Preview without
writing using `--dry --print`. jscodeshift reprints touched files via recast, so
**run your formatter (Prettier) afterwards**.

## Available codemods

| Codemod                     | Migrates                                                             | Shipped with                     |
| --------------------------- | -------------------------------------------------------------------- | -------------------------------- |
| `alert-tone-to-danger.cjs`  | `<Alert variant=…>` → `<Alert tone=…>`, value `"error"` → `"danger"` | Alert feedback-vocab unification |
| `remove-button-isdark.cjs`  | drops the no-op `isDark` prop from `<Button>` / `<IconButton>`       | `isDark` removal                 |
| `segmentedcontrol-size.cjs` | `<SegmentedControl size="default\|compact">` → `"md"\|"sm"`          | SegmentedControl size ramp       |

## Authoring a new codemod

1. Add `codemods/<name>.cjs` exporting `function transformer(fileInfo, api)`,
   returning `root.toSource()` when changed and `null` otherwise (so untouched
   files aren't reprinted).
2. Operate on `root.findJSXElements('ComponentName')` and its
   `openingElement.attributes` — handle both `StringLiteral` and `Literal`
   attribute value nodes (babel vs estree).
3. Verify with `pnpm codemod -t codemods/<name>.cjs --dry --print <fixture>`.
4. Reference it from the Changeset for the breaking change it backs.
