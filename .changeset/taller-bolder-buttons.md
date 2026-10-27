---
'@hirobius/design-system': minor
---

Taller, bolder buttons (hds#760): every Button size is one step taller (sm 32→36px, md 40→44px, lg 48→52px; icon-only squares follow) and the label is weight 600 (was 500). Both come from tokens the component now binds by var(): `component.button.size.{sm,md,lg}.height` (new primitives `size.36`, `size.44`, `size.52`) and the new `component.button.fontWeight` (new primitive `typography.weight.semibold`, 600). The manifest also stops writing fields that carried nothing: `figmaId` (always null) is gone, and `hidden` / `docExempt` appear only when true, which keeps the manifest under its 65 kB gzip budget.
