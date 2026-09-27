---
'@hirobius/design-system': patch
---

hds#206 review fix: the previous codemod commit rewrote two spacing-token
sites onto `semantic.space.scale.md` when it should not have, because that
scale token has no runtime override where the original alias did:

- `semantic.space.layout.gutter` — `theme.css` overrides
  `--semantic-space-layout-gutter` to 32px desktop / 16px under 639px;
  `scale.md` is a fixed 24px. Reverted `tokens.ts`'s `layout.gutter` accessor
  and `shell-controls.tsx`'s `paddingInlineStart` back to the alias var.
- `semantic.space.component.padding` — `tenants.css` overrides
  `--semantic-space-component-padding` per tenant/density (brutalist-demo).
  Reverted the `tokens.ts` `component.padding` accessor and its 14
  consumption sites (`callout.tsx`, `code-block.tsx` x2, `container.tsx`,
  `surface-padding.ts`, `surface.tsx`, `table.tsx` x2, `static.css`
  `.hds-card`, `legacy-token-detail.tsx`, `shell-controls.tsx`
  `paddingInlineEnd`, `sketch-controls.tsx`, `sketch.tsx`) back to the alias
  var so tenant/density and responsive overrides keep working.

`semantic.space.component.gap` and `semantic.space.layout.normal` (also
touched by the codemod) have no such override and are left on `scale.xs`/
`scale.md` — genuinely pure renames.
