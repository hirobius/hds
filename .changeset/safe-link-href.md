---
'@hirobius/design-system': patch
---

Security (hds#1145): InlineLink, Breadcrumb, NavList.Item, List.Item, the router-free link and `navigate` now refuse a `javascript:`, `vbscript:` or `data:` href. The link renders `about:blank#blocked` and `navigate` does nothing. React 18 only warns on such an href, so an href built from untrusted data could run script on click.
