---
'@hirobius/design-system': minor
---

Menu: the content now caps its height to the room Radix measures (`max-height: var(--radix-dropdown-menu-content-available-height)`) and scrolls (`overflow-y: auto`), so a long menu of 44px phone rows no longer runs off a 390px screen while the page is scroll-locked (hds#821). New `Menu.Item tone="danger"` for destructive items: the feedback danger content colour at rest, hover and focus, with the danger tint as the highlight fill; the tone vocabulary is `neutral | danger | success | warning | info`, default `neutral`, and only `danger` changes the item (hds#822). Contrast is pinned for the danger text on the overlay and on the danger tint in light and dark.
