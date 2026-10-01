---
'@hirobius/design-system': minor
---

Every root deprecation now says when it is removed (hds#390, hds#389 D6). The 27 deprecated root exports carry `@removeIn 1.0.0`: the 21 pattern-tier names that should be imported from `@hirobius/design-system/patterns` (ActivityFeed, AppShell, AssetImg, Calendar, Carousel, CodeBlock, CommandPalette, DocLinkCard, ErrorPattern, FileInput, Form, Lightbox, NavItem, OverflowList, Page, Reveal, SideNav, Stepper, Toolbar, TopNav, TreeList) and the six `Hds*` aliases (HdsCheckbox, HdsRadio, HdsSelect, HdsSlider, HdsToggle, HdsTooltip). So do the three deprecated `hds.semantic.space` tokens on the `/tokens` entry: `component.padding`, `component.gap` and `layout.gutter`. The deprecation notices are unchanged and nothing is removed: every name still works in 0.x and goes at 1.0.0. Imports from `/patterns` are not deprecated.
