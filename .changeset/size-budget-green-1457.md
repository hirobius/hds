---
'@hirobius/design-system': patch
---

Bundle budgets back under their limits (hds#1457, hds#1472): token descriptions drop issue-number asides and the "Between x and y" lead-ins (names and values are unchanged), `styles.css` drops its banner comment and reuses Tailwind's `spin` keyframes for `.animate-spin`, and the Dock rules sit in a phone-only media query with its flex layout on utility classes. No behaviour change.
