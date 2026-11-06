# ATTRIBUTIONS

Last updated: 2026-11-06
Status: Canonical attribution registry

## Purpose

This is the single source for outside references, licensed inclusions, and acknowledged inspiration used across the project.

Use this file to track:

- licensed third-party assets
- code or component libraries that require attribution
- documentation or design-system references that materially informed the work
- visual references used for major direction-setting passes
- stable registry IDs used by asset metadata and automated checks

## Rules

1. If a third-party asset, library, or visual reference materially influences shipped work, add it here.
2. If a doc mentions a reference for reasoning only, it can stay in that doc, but the canonical attribution should still live here when the influence is durable.
3. This file is a registry, not the place for policy or backlog.
4. Every durable entry should have a unique `Registry ID` so manifests and checks can refer to it without guessing.

## Licensed Assets And Libraries

### shadcn/ui

- Registry ID: library-shadcn-ui
- Type: Component/library reference
- Usage: Included components in the Figma Make file
- License: MIT
- Source: [shadcn/ui](https://ui.shadcn.com/)
- License link: [MIT license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md)

### Unsplash

- Registry ID: asset-unsplash
- Type: Photography source
- Usage: Photos included in the Figma Make file
- License: Unsplash License
- Source: [Unsplash](https://unsplash.com)
- License link: [Unsplash license](https://unsplash.com/license)

### Addy Osmani agent-skills

- Registry ID: library-osmani-agent-skills
- Type: Vendored agent skills (`.claude/skills/`, pinned in `skills-lock.json`)
- Usage: 25 engineering skills plus shared checklists, committed unmodified
- License: MIT
- Source: [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
- Pinned commit: `1401c8b8030e023baeebb31781a6653fe8e93026`
- License link: [MIT license](https://github.com/addyosmani/agent-skills/blob/main/LICENSE)

### Impeccable

- Registry ID: library-impeccable
- Type: Vendored agent skill (`.claude/skills/impeccable/`, pinned in `skills-lock.json`) + design anti-pattern detector CLI
- Usage: curated command subset (critique, polish, audit, harden, typeset, layout + support refs/scripts), committed unmodified; `npx impeccable detect` wrapped by `scripts/check-impeccable-detect.mjs`
- License: Apache-2.0
- Source: [pbakaus/impeccable](https://github.com/pbakaus/impeccable)
- Pinned commit: `630fc2682a5bd39b25a8e61f74b6b3f14f2b1e21`
- License link: [Apache-2.0 license](https://github.com/pbakaus/impeccable/blob/main/LICENSE)

## Design-System And Documentation References

These are not copied implementations. They are reference points used for structure, conventions, or quality baseline.

### Material Design

- Registry ID: reference-material-design
- Type: Design-system convention reference
- Usage: component categorization and DS baseline comparison; density modes (`src/styles/theme.css`, compact density); motion duration and easing roles as a reference for the HDS motion tokens (hds#751). Ideas only, no code copied
- License: Apache-2.0 (Material Design guidance and Material Components)
- Source: [Material Design](https://m3.material.io/) · [Motion](https://m3.material.io/styles/motion/overview)
- License link: [Apache-2.0](https://github.com/material-components/material-web/blob/main/LICENSE)

### IBM Carbon

- Registry ID: reference-ibm-carbon
- Type: Design-system convention reference
- Usage: DS governance, accessibility, and system-quality comparisons; reduced motion (duration tokens collapse to 0ms, `src/styles/theme.css`), condensed density, and the productive/expressive motion split behind the HDS motion tokens (hds#751). Ideas only, no code copied
- License: Apache-2.0 (`@carbon/motion`)
- Source: [Carbon Design System](https://carbondesignsystem.com/) · [Motion](https://carbondesignsystem.com/elements/motion/overview/)
- License link: [Apache-2.0](https://github.com/carbon-design-system/carbon/blob/main/LICENSE)

### Adobe Spectrum

- Registry ID: reference-adobe-spectrum
- Type: Design-system convention reference
- Usage: licensing and accessibility baseline comparisons
- Source: [Adobe Spectrum](https://spectrum.adobe.com/)

### Atlassian Design System

- Registry ID: reference-atlassian-design-system
- Type: Design-system convention reference
- Usage: token and system-structure comparisons
- Source: [Atlassian Design System](https://atlassian.design/)

### Chakra UI

- Registry ID: reference-chakra-ui
- Type: Token-system and component-system reference
- Usage: token-driven theming comparisons and component classification checks
- Source: [Chakra UI](https://chakra-ui.com/)

### Radix UI

- Registry ID: reference-radix-ui
- Type: component primitive reference
- Usage: accessibility and component primitive baseline
- Source: [Radix UI](https://www.radix-ui.com/)

### Deferred until the work lands on main (hds#751)

These are named in hds#751 as sources to borrow from, but nothing on main uses them yet. Each gets its own entry in the PR that brings its idea or code in:

- Open Props (MIT): spring and easing ideas, on the unmerged `claude/design-evolution-pipeline-v0vi13` branch.
- Utopia (ISC, `utopia-core`): fluid type and spacing, for #751 slice 3. `--semantic-typography-display-font-size-fluid` (hds#1300) is a plain linear `clamp()` computed in `scripts/lib/token-emit/css.mjs`; it does not use Utopia.
- NumberFlow (MIT): the optional `./number` subpath, for #751 slice 2.

## Visual Direction References

### Sevalla Docs

- Registry ID: visual-sevalla-docs
- Type: Documentation-shell visual reference
- Usage: right-rail TOC and premium docs-shell inspiration for the HDS portfolio pass
- Source: [Sevalla Docs](https://docs.sevalla.com/)

### Wall of Portfolios / Kshitij Suri

- Registry ID: visual-wall-of-portfolios
- Type: Portfolio-shell visual reference
- Usage: docs-style portfolio structure inspiration
- Source: [Wall of Portfolios](https://www.wallofportfolios.in/portfolios/kshitij-suri/)

## Operational References

### Zeroheight

- Registry ID: operational-zeroheight
- Type: documentation platform reference
- Usage: external DS documentation integration planning
- Source: [Zeroheight](https://zeroheight.com/)

### Figma

- Registry ID: operational-figma
- Type: design tooling platform
- Usage: token import/export, component documentation, audit source material
- Source: [Figma](https://www.figma.com/)

## Maintenance

When a new third-party dependency, visual reference, or outside DS reference becomes materially important:

1. add it here
2. link to the official source when possible
3. note how it is being used

If a reference stops mattering, remove it here instead of letting the registry drift.
