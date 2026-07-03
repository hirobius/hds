---
name: Harbor & Finch
version: 1
description: >
  A sample Google Aura design.md fixture used by
  scripts/harvest-design-md.mjs's own test/verification pass. Not a real
  brand — values are illustrative only.

colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  tertiary: "#2563EB"
  neutral: "#F7F5F2"

typography:
  h1:
    fontFamily: Fraunces
    fontSize: 3rem
    fontWeight: 600
  body-md:
    fontFamily: Public Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  label-caps:
    fontFamily: Space Mono
    fontSize: 0.75rem
    letterSpacing: 0.08em

rounded:
  sm: 4px
  md: 8px
  lg: 16px

spacing:
  sm: 8px
  md: 16px
  lg: 32px

components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    typography: body-md
---

# Harbor & Finch — Design Spec

This is a sample Aura `design.md` fixture (see
https://github.com/google-labs-code/design.md for the schema this format
follows). It exists purely so `scripts/harvest-design-md.mjs` has a
deterministic, checked-in input to harvest against in CI and local
verification runs.

## Notes

`components.button-primary.backgroundColor` references `{colors.tertiary}`
rather than `{colors.primary}` — this is intentional in the fixture, to
exercise the harvester's component-reference resolution path (the
highest-confidence signal for picking the real brand accent, since some
Aura design.md authors use Material-3-style role naming where "primary" is
a dominant surface color and the CTA accent lives under a different key).
