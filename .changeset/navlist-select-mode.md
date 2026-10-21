---
'@hirobius/design-system': minor
---

NavList select mode (hds#868): `<NavList.Item selected onSelect={…}>` renders a button marked `aria-current="true"` for a master-detail rail that selects in place with no routing. Same hover and selected fills as a link row; rich children unchanged. `href` and `onSelect` are exclusive. `NavListItemProps` is now a union of `NavListLinkItemProps` and `NavListSelectItemProps`.
