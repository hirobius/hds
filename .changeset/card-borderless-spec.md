---
'@hirobius/design-system': patch
---

docs(card): reconcile DESIGN.md with the shipped borderless-default Card.

The Card Anatomy / elevation tables said a resting card carries a 1px border, contradicting the 12d-3 outline rule (and DESIGN.md's own "don't default to outlined cards" guidance) that made the default `Card` variant borderless, with a resting border opt-in via `bordered` / a feedback `tone` / `accent`. Updated the elevation-role table, the component table, and the (mandatory) Card Anatomy Border row to document the borderless default + opt-in border, and corrected the stale card.tsx module docstring that claimed depth comes from a resting border. No component behavior change.
