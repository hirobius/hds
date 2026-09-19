# Token Migration Log

Track every renamed or removed token path here. Used by
`scripts/check-token-renames.mjs` to gate token-breaking changes in PR.

## Format

    semantic.old.path -> semantic.new.path     (renamed YYYY-MM-DD)
    primitive.dropped.thing -> removed          (removed YYYY-MM-DD, no replacement)

## Entries

component.button.fontSize -> removed (removed 2026-05-02, superseded by component.button.size.{sm,md,lg}.fontSize; HdsButton uses Tailwind font-size classes, not this CSS var)
component.button.fontWeight -> removed (removed 2026-05-02, superseded by component.button.size.{sm,md,lg} typography; HdsButton uses Tailwind font-medium class, not this CSS var)
component.button.minWidth -> removed (removed 2026-05-02, no live source consumer; HdsButton uses Tailwind sizing classes, not this CSS var)
semantic.typography.small -> semantic.typography.ui (renamed 2026-05-04)
semantic.typography.caption -> semantic.typography.eyebrow (renamed 2026-05-04)
primitive.typography.size.7xl -> primitive.typography.size.5xl (renamed 2026-09-19, hds#227 — fixes the inverted top of the scale: 7xl held 72px ("Swiss-canon display size", aliased by semantic.typography.display) while 5xl held 80px, and there was no 6xl. Renumbered so the ladder is contiguous and ascending; 72px moves down to close the gap left by the missing 6xl. semantic.typography.display is repointed to the new path — its resolved value is unchanged, still 72px.)
primitive.typography.size.5xl -> primitive.typography.size.6xl (renamed 2026-09-19, hds#227 — the former 80px step moves up to 6xl to make room for the renumbered 5xl above. NOTE: the path "primitive.typography.size.5xl" is NOT removed by this change (check-token-renames only flags vanished paths, so this line is undetected by that gate and is here for the human record only) — it is reused for the renamed 7xl entry, so a consumer keyed directly to primitive.typography.size.5xl before this date silently receives 72px instead of 80px afterward. No such direct consumer was found in src/ (grepped for text-5xl, fontSize['5xl'], primitive.typography.size.5xl outside generated/data files) as of this migration; the only real consumer of either step is semantic.typography.display, which is unaffected in rendered value.)
