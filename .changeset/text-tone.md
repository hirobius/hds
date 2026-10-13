---
'@hirobius/design-system': minor
---

Text takes an optional `tone` prop for its colour: `primary | secondary | disabled | accent | success | warning | error | info`, mapped to `semantic.color.content.*`, `semantic.accent.content` and `semantic.color.feedback.*` (the Badge and Alert vocabulary). Unset, the colour stays inherited, so existing output is unchanged. Subtitle and meta text is now `<Text variant="caption" tone="secondary">` instead of an inline `style={{ color: 'var(--semantic-color-content-secondary)' }}`. `disabled` is for the text of an inactive control only; it sits below 4.5:1 by design (hds#655).
