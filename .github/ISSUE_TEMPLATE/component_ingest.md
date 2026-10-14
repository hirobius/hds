---
name: Component ingest
about: Track one new component from source to the Figma library (draft in HDS Staging, then ingest)
title: '[ingest] <Component>'
labels: ''
assignees: ''
---

<!--
One issue per new component; find them all by searching "[ingest]". Tick each box as it lands; the issue closes when the
last one is ticked. Steps: figma/README.md, "New components: draft in staging,
ingest to the library". Checks that back this up:
- check-figma-retired-keys fails if any @figma tag points at HDS Staging.
- check-figma-coverage fails if a library component has no @figma tag in code.
-->

## Source

- Inspiration: <!-- 21st.dev link, Figma frame, screenshot, or "none" -->
- Why HDS needs it: <!-- one line -->

## Steps

- [ ] **Code**: component in `src/` built from HDS tokens and primitives (no copied code or packages), tests green, `pnpm manifest:generate` run
- [ ] **Staging draft**: drawn in HDS Staging with library variables only. Node: <!-- paste https://www.figma.com/design/C85ZXnwtVc4AteeIOZfXRC/...?node-id=... -->
- [ ] **Library redraw**: redrawn in the HDS library. Node: <!-- paste https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/...?node-id=... -->
- [ ] **Linked**: the component's `@figma` tag points at the library node (never staging)
- [ ] **Draft deleted** from HDS Staging
- [ ] **Published** by Adrian in Figma (agents never publish)
