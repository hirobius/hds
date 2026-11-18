One height token per control size, semantic.size.controlHeight sm/md/lg = 32/40/48, read by Button, Input, Select, Combobox, Tabs, SegmentedControl and Pagination; touch still lifts to 44px (Fable eval #2). Pinned by src/app/components/control-height.test.tsx.

- CI fixes: tokens JSON budget (shorter descriptions), visual baselines for the height change (92 PNGs, CI-flagged only), main 993b2b0 merged.
