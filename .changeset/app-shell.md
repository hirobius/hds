---
'@hirobius/design-system': minor
---

New `AppShell`: the app frame for web apps, with `header`, `sidebar`, page content and an optional `aside`, rendered as banner, navigation, main and complementary landmarks. From `lg` the sidebar is a rail that collapses from a toggle in the header (`collapsed` / `defaultCollapsed` / `onCollapsedChange`, and `persistKey` keeps the state in localStorage); pass `sidebar` as a function of `{ collapsed }` to draw an icon-only rail. Below `lg` the sidebar opens in a `Sheet` from a Menu button, which closes on Escape or when a link in it is followed (hds#875).
