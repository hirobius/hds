---
'@hirobius/design-system': minor
---

SegmentedControl: an option can take an `href`, which turns the control into a `nav` holding a list of links. The current segment is `aria-current="page"`, internal paths go through the router adapter, and the selected pill and concentric corners stay. `onChange` is optional in link mode (hds#1438).
