---
'@hirobius/design-system': patch
---

CSS-in-JS → Tailwind (#60): migrate `SideNav` to Tailwind + `cva` (`sideNavVariants`), formalizing the `level` (`root` | `nested`) axis as a cva variant alongside the existing rest/hover/focus/active/disabled `state` matrix. Replaces the inline `style` object and the removed `BG`/`TEXT` token maps with the same `--semantic-*`/`--component-*`/`--primitive-*` custom properties, bound 1:1.

The `useFrozenState` (Storybook demo-state freeze) override is preserved exactly, including its pre-existing quirks: only `hover`/`active`/`disabled`/`pressed`/`press` freeze values are recognized (unlike `NavItem`, `focused`/`rest` fall through to live interaction state), and a frozen `pressed` state shares `active`'s visual tokens but does not set `aria-current="page"` the way a frozen `active` state does. Resolved state is now exposed via `data-state`/`data-level` attributes for testability, mirroring `nav-item.tsx`'s established pattern (ADR-015). Modality-aware focus-visible detection now goes through the shared `useFocusVisible` hook instead of a duplicated inline implementation.

No breaking changes: the public prop API, defaults, RTL-aware indent math, the titleLabel/button/anchor branching, and the 44px minimum interactive size are all unchanged.
