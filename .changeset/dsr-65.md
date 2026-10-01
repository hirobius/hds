---
'@hirobius/design-system': minor
---

**BREAKING (0.x minor): 13 components that fold into a survivor are removed from the root, with their props types (hds#394 wave 4b, hds#389 decision update).** Each survivor shipped with hds#393, and MIGRATIONS.md ("0.20.0 removals", "Components folded into a survivor") maps every prop. Ops, the one product app, imports none of the 13.

- `IconButton` becomes `Button iconOnly` with a `label` and an `Icon` in `iconLeft`; `ToggleButton` becomes `Button pressed` (`variant="ghost"` is `variant="tertiary"`).
- `InputGroup` becomes `Input prefix` / `suffix`; `TimeInput` becomes `Input type="time"`.
- `CircularProgress` becomes `Progress variant="circular"`; `SelectableCard` becomes `Card selectable`; `MultiSelector` becomes `Combobox multiple` (`MultiSelectorOption` is `ComboboxOption`).
- `Cluster` becomes `Stack direction="row" wrap="wrap" align="center"`; `Center` becomes `Container` with a `Box` inside for the gutter.
- `Cover`, `Frame`, `Bleed` and `AspectRatio` become a `Box` with `style` (`aspectRatio`, `marginInline`, `marginBlock: 'auto'` and so on). Use `style`, not `sx`: `sx` applies on the client only.
- `StatusDot` stays: ops passes it `style`, which Badge `dot` does not take.
- `hds-patterns-subpath --check` reports a named import of any of the 13 for a manual edit and names its survivor ("removed in 0.20.0, use Button iconOnly …"), from the new `replaced` map in `codemods/removed-0.20.json`.
- `@radix-ui/react-aspect-ratio` and `@radix-ui/react-toggle` leave `dependencies`: only the removed `AspectRatio` and `ToggleButton` imported them (`@radix-ui/react-toggle-group` stays and brings its own copy of the toggle primitive).
