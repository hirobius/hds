---
'@hirobius/design-system': minor
---

New `useAtLeast(bp)` and `useBreakpoint()` hooks read an HDS breakpoint in JS, for screens that render different markup per width (a Table at desktop, rows on a phone). They use the same values `sx` compiles (xs 375, sm 640, md 768, lg 1024, xl 1280), so a consumer writes no pixel width of its own. Narrow by default: on the server, in jsdom or without `matchMedia`, `useAtLeast` returns `false` and `useBreakpoint` returns `'base'`; both update live as the viewport crosses a breakpoint.
