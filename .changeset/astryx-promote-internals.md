---
'@hirobius/design-system': minor
---

Promote three previously-internal components to the public API surface (#76):

- **SideNav** (`Navigation`) — sidebar navigation row primitive (root/nested levels).
- **CommandPalette** (`Overlays`) — Cmd-K / Ctrl-K fuzzy search over the HDS manifest.
- **HdsLightbox** (`Overlays`, was internal `ImageLightbox`) — full-bleed image viewer on Radix Dialog.

Each flips `@internal`→`@public`, drops `@doc-exempt`, moves from `utility`→`primitive` tier, and gains a Storybook story, a Code Connect stub, and a public barrel export. `ImageLightbox` is renamed to `HdsLightbox` to match the Radix-overlay naming convention.

The vitest config now resolves the `virtual:hds-manifest` module (mirroring the app/lib builds) so manifest-consuming components like CommandPalette render under the story-render smoke gate.
