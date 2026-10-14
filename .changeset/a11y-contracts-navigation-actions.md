---
'@hirobius/design-system': patch
---

Accessibility contracts (`@a11y` tags, hds#520) for Button, InlineLink, Breadcrumb, Pagination, Tabs, Disclosure, Card, AssetImg, CodeBlock and InlineCode, each rule backed by a contract test. Four fixes came out of the tests: Pagination moves focus to the current page when activating Previous or Next disables the focused button; a clickable AssetImg that is not expandable (or is in the lightbox context) is now a focusable button that Enter and Space activate; CodeBlock and InlineCode announce a copy through a polite status region and the CodeBlock copy button is `type="button"`; the Disclosure trigger is at least 24px tall in every variant (the panel variant was 18px). The false hand-kept Button focus-ring rule is replaced by tagged rules.
