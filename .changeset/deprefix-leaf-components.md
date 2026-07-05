---
'@hirobius/design-system': major
---

Drop the `Hds` prefix from 12 net-new leaf component families — step 1 of retiring the `Hds` prefix fleet-wide. These families shipped in 0.12.0/0.13.0 with zero external consumers, so the rename is safe to land as the first cut. Compound sub-exports (e.g. `HdsAlertDialog.Trigger`), `*Props`/`*Component` types, and source filenames (`hds-*.tsx` → `*.tsx`) all moved together. `scripts/scaffold-component.mjs` and `scripts/component-discovery.mjs` were flipped in the same PR: new components must now be plain PascalCase, and a leading `Hds` is the namespace violation going forward (not the absence of one).

| Old                                                                                                                                                             | New                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `HdsToggleButton`                                                                                                                                               | `ToggleButton`                            |
| `HdsAlertDialog` (+ `.Trigger`/`.Portal`/`.Overlay`/`.Content`/`.Header`/`.Footer`/`.Title`/`.Description`/`.Action`/`.Cancel`)                                 | `AlertDialog` (same compounds)            |
| `HdsHoverCard` (+ `.Trigger`/`.Content`)                                                                                                                        | `HoverCard` (same compounds)              |
| `HdsContextMenu` (+ `.Trigger`/`.Content`/`.Item`/`.CheckboxItem`/`.RadioGroup`/`.RadioItem`/`.Label`/`.Separator`/`.Group`/`.Sub`/`.SubTrigger`/`.SubContent`) | `ContextMenu` (same compounds)            |
| `HdsAspectRatio`                                                                                                                                                | `AspectRatio`                             |
| `HdsMultiSelector` (+ `HdsMultiSelectorOption`)                                                                                                                 | `MultiSelector` (+ `MultiSelectorOption`) |
| `HdsLightbox`                                                                                                                                                   | `Lightbox`                                |
| `HdsCalendar`                                                                                                                                                   | `Calendar`                                |
| `HdsTimeInput`                                                                                                                                                  | `TimeInput`                               |
| `HdsDateInput`                                                                                                                                                  | `DateInput`                               |
| `HdsDateRangeInput`                                                                                                                                             | `DateRangeInput`                          |
| `HdsDateTimeInput`                                                                                                                                              | `DateTimeInput`                           |

Consumers importing any of the above must update to the new names; there is no compatibility alias. Everything else — the `hds-` CSS class namespace, `data-*` attributes, the JSX-compiler DSL tags (`HdsFrame`/`HdsHeading`/`HdsLabel`/`HdsPhosphor`/`HdsCaption`), the provider/theme surface, the manifest type surface, and the `Form`/`FormField`/`ThemeProvider`/`Tooltip` collision families — is unchanged and out of scope for this PR.
