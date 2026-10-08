---
'@hirobius/design-system': patch
---

fix(components): five Tier-1 component bugs from the audit.

- **Select** no longer crashes the page when `options` is empty (async list mid-load) or when `value` matches no option; the trigger label degrades to the field name.
- **Combobox** can now be closed by clicking its trigger again (the trigger was a `Popover.Anchor`, so Radix dismissed on pointerdown and the onClick reopened).
- **Button `asChild`** now enforces the disabled/loading contract on a slotted element (e.g. an `<a>`): non-interactive (`pointer-events-none`, `tabIndex=-1`) and dimmed, since native `disabled:` utilities can't apply to it.
- **AssetImg** and **Avatar** recover when `src` changes to a working image after a prior load error, instead of staying stuck on the fallback.
