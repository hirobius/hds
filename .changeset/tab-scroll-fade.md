---
'@hirobius/design-system': minor
---

TabsList and SegmentedControl now keep the selected item in view: when the strip scrolls, the selected tab or segment is scrolled into view on mount and whenever the selection changes (only the strip scrolls, never the page; smooth, or instant under prefers-reduced-motion). SegmentedControl's rail also fades its hidden edge with the same `data-overflow` mask as TabsList. Consumers can drop local overflow-fade and scroll-into-view wrappers (hds#823).
