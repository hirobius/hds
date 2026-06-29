---
'@hirobius/design-system': minor
---

Components no longer require react-router. Navigation is sourced from an injectable adapter (`RouterContext`): by default links render as plain anchors and navigation falls back to `window.location`, so HDS works with zero router. react-router / Next.js consumers inject their router once at the app root via `<HdsRouterProvider adapter={...}>`. `react-router` is now an optional peer dependency.
