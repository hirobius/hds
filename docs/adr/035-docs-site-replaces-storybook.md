# ADR-035: The Docs Site Replaces Storybook

**Status:** Accepted (2026-10-14). Records hds#590 (merged 2026-10-11). Supersedes the "Storybook-only" call in ADR-018 §4. Decider: Adrian.

## Context

ADR-018 cut the bespoke docs site and made Storybook the sole component showcase. Since
then the docs site came back as `docs-site/` (Next.js, MDX, live demos) and carried every
job Storybook did: the component reference, live examples, accessibility checks and the
visual baseline. Keeping both meant two showcases to update per component, two builds, and
stories that drifted from the docs pages.

## Decision

Storybook is deleted (hds#590). The docs site is the one place a component is shown.

- **Reference and demos:** `docs-site/` pages, built from the same component source.
- **Visual regression:** Chromatic runs on the docs-site demos through
  `@chromatic-com/playwright` (`.github/workflows/chromatic.yml`,
  `tests/visual/docs-demos.spec.ts`), on every PR and every push to main.
- **Accessibility:** `check-docs-axe` gates the docs site.

## Consequences

- One showcase to keep current per component, not two.
- Visual baselines live with the docs demos; a component with no demo has no baseline, so a
  new component ships with a demo.
- Storybook stays recoverable from git history; reviving it needs a new ADR.
