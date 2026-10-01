---
'@hirobius/design-system': minor
---

Every root deprecation now says when it is removed (hds#390, hds#389 D6). The 27 deprecated root exports carry `@removeIn 1.0.0`: the 21 pattern-tier names that should be imported from `@hirobius/design-system/patterns` (ActivityFeed, AppShell, AssetImg, Calendar, Carousel, CodeBlock, CommandPalette, DocLinkCard, ErrorPattern, FileInput, Form, Lightbox, NavItem, OverflowList, Page, Reveal, SideNav, Stepper, Toolbar, TopNav, TreeList) and the six `Hds*` aliases (HdsCheckbox, HdsRadio, HdsSelect, HdsSlider, HdsToggle, HdsTooltip). So do the three deprecated `hds.semantic.space` tokens on the `/tokens` entry: `component.padding`, `component.gap` and `layout.gutter`. The 27 root names are then removed in this same release (hds#389 R1, see the BREAKING entry and MIGRATIONS.md); the three tokens still work and keep their 1.0.0 target. Imports from `/patterns` are not deprecated.
