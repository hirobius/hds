---
'@hirobius/design-system': minor
---

Remove the tokens the 0.20.0 removals orphaned (hds#431): `component.lightbox.backdrop.blur` (and the `hds.effect.blur.lightboxBackdrop` export of `./tokens`), `component.nav.{bg, bgActive, borderActive, text, textActive, height, paddingX}` and the deprecated `semantic.space.sidebar.railWidth` (with its `sidebar-railWidth` Tailwind key), plus their CSS variables. `component.nav.paddingY` stays: Disclosure's `nav` variant uses it. Use `primitive.blur.16` for the 16px blur and `primitive.size.width.280` for the 280px rail. The frozen `phases` key leaves `./manifest` (hds#442): no script wrote it.
