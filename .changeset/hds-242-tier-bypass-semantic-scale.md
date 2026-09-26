---
'@hirobius/design-system': minor
---

Add `semantic.size.{control,icon,avatar,row}` and `semantic.zIndex.{control,sticky}`
to `hirobius.tokens.json` per Adrian's 2026-09-26 decision on hds#242, plus
`semantic.radius.control` (checkbox glyph corner radius, a real design-scale
value distinct from `semantic.radius.action`) and `semantic.motion.distance`
(scroll-reveal `translateY` offset). Repoints all 15 `check-tier-bypass`
judgement-call violations named in hds#242 — activity-feed, checkbox,
code-block, radio, slider, table, `scroll-motion.css` — onto the new semantic
tokens, and adds `// tier-ok:` exemptions (matching #186's precedent) for the
two `radius-full` "fully round, one possible value" references that share a
line with a now-fixed size token. `pnpm check:tier-bypass` is green (was 15).

`scripts/lib/figma-model.mjs`: `semantic.radius.control` needed its own
`$type` (siblings inherit it from a group `$type` that `semantic.radius`
doesn't set); `semantic.motion.distance` is declared in `NOT_IN_FIGMA` (a
translateY offset has nothing to bind to in Figma, same as duration/easing).
