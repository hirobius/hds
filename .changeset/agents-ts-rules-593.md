---
'@hirobius/design-system': patch
---

The packaged `AGENTS.md` Rules now say the app is type-checked strictly: give `useState` an explicit type when the value can be `null`, and annotate handler and callback parameters instead of leaving them implicit `any`. From the agent-consistency after-arm diagnosis (hds#593): the one app that failed to build in the scored after-arm run failed on exactly those three typing slips, which no HDS doc mentioned.
