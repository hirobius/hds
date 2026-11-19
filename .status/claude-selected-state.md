Selected state, option (a)+(b): semantic.color.selected.bg/fg and semantic.typography.weight.selected, read by SegmentedControl, Tabs, NavList, Tag, Pagination current and Card selectable. Pinned by selected-state.test.tsx. No Figma change (parity pass, hds#1565).

- Review fixes: DESIGN.md names the one selected look; dated attribution removed from code comments.
- Merged main (#1592, #1596); blocked on size budgets (styles +143 B, tokens JSON +105 B, tokens.css +23 B) pending Adrian's call.
- Merged main (#1597-#1599): tokens JSON fits; styles.css +118 B over (rule breakdown sent to coordinator).
- Merged main (#1600): all budgets fit (styles 23.79, tokens.css 24.63, tokens JSON 11.55 kB).
