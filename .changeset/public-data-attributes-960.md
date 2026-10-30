---
'@hirobius/design-system': patch
---

Each component's manifest entry lists `publicDataAttributes`: the `data-*` attributes you may select on (hds#960). A test holds the lists to the docs demos (`docs/baselines/dom-a11y.json`): a declared attribute must appear in its component's demo, and a public attribute a demo renders must be declared. The consumer skill lists them per component. `data-hds-*` attributes are internal; CONSUMING.md now says so.
