# Upgrading @hirobius/design-system

This file only knows the releases up to the version you have installed, 0.34.0. For newer releases, run `npx @hirobius/design-system@latest upgrade`: it always fetches the newest steps.

## How to upgrade

```sh
npx @hirobius/design-system@latest upgrade
```

It finds the version you have, moves you to the newest release, runs each release's codemods (Fixed for you) and lists what is left for you (Do by hand). It works from 0.9.0 on; from an older version, first reach 0.9.0 with the notes in CHANGELOG.md. MIGRATIONS.md has longer guides for the big releases.

## If a release is bad

A release npm marks deprecated ("Broken: use …") was yanked, and npm `latest` points back at the last good version. If you took it:

1. Revert the upgrade PR (`git revert -m 1 <merge commit>`), so the code, package.json and lockfile go back together.
2. Pin the exact last good version, with no `^`: `"@hirobius/design-system": "<last good version>"`, then install.
3. Once a fixed version ships, run `npx @hirobius/design-system@latest upgrade` again; it skips versions npm marks deprecated.

There are no backports before 1.0: a fix ships as a new release, never as a patch to an older line.

## 0.34.0

Released 2026-11-06 (minor). 2 changes to make by hand, 5 that look different and 2 deprecations.

### Looks different

- The interactive Card hover lift and Card.Progress fill now animate on the productive motion token and stop under reduced motion; nothing to change in your app.
- Radio, Checkbox and Toggle rows are 4px wider (8px between control and label); check tight layouts that hold them.
- Progress and Tabs indicators now animate on the productive motion token; nothing to change in your app.
- The accent-pair-demo demo direction no longer ships, so a page with data-brand="accent-pair-demo" renders with the base tokens; theme it with your own brand block instead.
- The soft-demo demo direction no longer ships, so a page with data-brand="soft-demo" renders with the base tokens; theme it with your own brand block instead.

### Coming next

- Importing hds from the package root still works but is deprecated; import it from @hirobius/design-system/tokens instead. Removed in 0.35.0.
- Importing tokens from the package root still works but is deprecated; import it from @hirobius/design-system/tokens instead. Removed in 0.35.0.

### Do by hand

- CodeBlock's copy button icon now sits inside a span\[data-hds-icon-swap] wrapper; a test or selector that expects the svg as the button's direct child must look one level deeper.
- tokens.css and styles.css no longer ship 42 Tailwind utilities that no HDS component or fleet consumer used (hds#1205); a class from the list in your markup stops applying.

## 0.33.1

Released 2026-11-05 (patch). 1 change to make by hand and 13 that look different.

### Looks different

- Each of these now aliases a semantic.color.edge token with the same colour; if you override it, keep the override: `--component-button-edge-danger`, `--component-button-edge-info`, `--component-button-edge-secondary`, `--component-button-edge-success` and `--component-button-edge-warning`.
- Tailwind 4.3 changed the default --font-sans in @layer theme to a system UI stack; text that reads var(--font-sans) can render in a different system font.
- --hds-edge-primary is now var(--component-button-edge-primary) in both themes (same colours); to restyle the primary Button edge, override --component-button-edge-primary or keep your --hds-edge-primary override.
- --semantic-focus-ring-color no longer follows --semantic-color-border-accent; if you override the accent border, set the focus ring colour too.
- Button hover moves the face down 1px onto a 2px edge and press moves it down 3px onto a 0px edge; remove any custom hover lift you added to match the old 4px hover edge.
- A size="sm" SegmentedControl is now 32px tall like Button sm, with the selected primary label 1px higher, so remove any padding or offset you added to fix its height.
- Every Table now shows a 1px outline round its frame; if you added your own border or ring round a Table, remove it so the edge is not doubled.
- Pages themed with the accent-lilac brand (data-brand="accent-lilac") may look different, so check them after upgrading.
- Pages themed with the accent-pair-demo brand (data-brand="accent-pair-demo") may look different, so check them after upgrading.

### Do by hand

- Links now render a javascript:, vbscript: or data: href as about:blank#blocked, so use a Button with onClick where you relied on one.

## 0.33.0

Released 2026-11-05 (minor). 19 changes to make by hand (16 breaking), 9 fixed for you by a codemod, 91 that look different and 1 deprecation.

### Fixed for you

The upgrade command runs these codemods for you.

- --semantic-color-border-subdued is removed; use --semantic-color-border-default (Dark is neutral.600, was neutral.800; Light is the same), which the codemod writes for you. Codemod: `hds-token-aliases`.
- --semantic-space-component-gap is removed; use --semantic-space-scale-xs, which the codemod writes for you. Codemod: `hds-token-aliases`.
- --semantic-space-component-padding is removed; use --semantic-space-surface-padding, which the codemod writes for you. Codemod: `hds-token-aliases`.
- --semantic-space-layout-gutter is removed; use --semantic-space-region-gutter, which the codemod writes for you. Codemod: `hds-token-aliases`.
- --semantic-space-layout-inset is removed; use --semantic-space-scale-lg, which the codemod writes for you. Codemod: `hds-token-aliases`.
- --semantic-space-layout-normal is removed; use --semantic-space-scale-md, which the codemod writes for you. Codemod: `hds-token-aliases`.
- --semantic-space-layout-spacious is removed; use --semantic-space-scale-xl, which the codemod writes for you. Codemod: `hds-token-aliases`.
- --semantic-space-layout-tight is removed; use --semantic-space-scale-sm, which the codemod writes for you. Codemod: `hds-token-aliases`.
- hds.semantic.space.component and hds.semantic.space.layout.gutter, the Tailwind spacing keys component-gap/padding and layout-\* (p-, m-, gap-, w-, inset- and every other spacing utility, and theme(spacing.\*)), and Box sx 'border.subdued' are removed; the codemod rewrites them. Codemod: `hds-token-aliases`.

### Looks different

- --component-badge-height is now 22px (was 20px); check fixed-height rows that hold badges.
- --component-badge-minWidth is now 22px (was 20px), so a one-digit count badge is 2px wider.
- --component-badge-radius is now a fixed 6px (was the action radius); Badge itself renders role.radius minus 2px, so read that instead if you matched its corner.
- The deprecated --component-button-secondary-border-disabled follows border.default: the same graphite in Light, neutral.600 in Dark (was neutral.800); Button has not drawn it since hds#891.
- --component-button-size-lg-height is now 52px (was 48px); a container or sibling sized to match the lg Button should follow the variable, not a fixed px.
- --component-button-size-md-height is now 44px (was 40px); a container or sibling sized to match the md Button should follow the variable, not a fixed px.
- --component-button-size-sm-height is now 36px (was 32px); a container or sibling sized to match the sm Button should follow the variable, not a fixed px.
- Spinners built on the --hds-anim-spin preset now rotate at a constant speed instead of pulsing with the expressive spring; no action is needed unless a design relied on the pulsing motion.
- --hds-edge-danger now aliases --component-button-edge-danger (a fixed primitive per theme) instead of a computed hex, so re-take screenshots of danger-tone Buttons.
- --hds-edge-info now aliases --component-button-edge-info (a fixed primitive per theme) instead of a computed hex, so re-take screenshots of info-tone Buttons.
- The raised edge under buttons and Kbd follows the tinted fills; nothing to change unless you override each of these: `--hds-edge-kbd` and `--hds-edge-secondary`.
- The primary edge (--hds-edge-primary) is now #020203 in light (was #292427) and #a4a4a4 in dark (was #8a8789), so primary borders read stronger; re-take border screenshots.
- --hds-edge-success now aliases --component-button-edge-success (a fixed primitive per theme) instead of a computed hex, so re-take screenshots of success-tone Buttons.
- --hds-edge-warning now aliases --component-button-edge-warning (a fixed primitive per theme) instead of a computed hex, so re-take screenshots of warning-tone Buttons.
- This grey keeps its lightness but leans toward midnight blue; if you read each of these directly next to your own greys, check that they still match: `--primitive-color-graphite-100`, `--primitive-color-graphite-200`, `--primitive-color-graphite-300`, `--primitive-color-graphite-400`, `--primitive-color-graphite-50`, `--primitive-color-graphite-500`, `--primitive-color-graphite-600`, `--primitive-color-graphite-700`, `--primitive-color-graphite-800`, `--primitive-color-graphite-900`, `--primitive-color-graphite-950`, `--primitive-color-neutral-100`, `--primitive-color-neutral-200`, `--primitive-color-neutral-300`, `--primitive-color-neutral-350`, `--primitive-color-neutral-400`, `--primitive-color-neutral-450`, `--primitive-color-neutral-50`, `--primitive-color-neutral-500`, `--primitive-color-neutral-550`, `--primitive-color-neutral-600`, `--primitive-color-neutral-700`, `--primitive-color-neutral-800`, `--primitive-color-neutral-850`, `--primitive-color-neutral-900` and `--primitive-color-neutral-950`.
- neutral.black is now #060a13 (midnight), not #000000; use your own #000000 where you need true black.
- --primitive-easing-elastic is now a valid linear() spring curve with about 11% overshoot, where the old spring(300, 20, 1) value was invalid CSS and the browser dropped it, so animations using it now overshoot slightly instead of falling back to their default easing.
- The concrete-creations block no longer sets each of these, so a page on that slug gets the base value unless the app compiles its own overlay: `--semantic-accent-content`, `--semantic-accent-hover`, `--semantic-accent-subtle`, `--semantic-color-border-accent`, `--semantic-color-content-onAccent` and `--semantic-color-surface-accentSubtle`.
- The concrete-creations block no longer sets --semantic-accent-pressed, and in dark mode the base pressed fill now steps darker from the near-white rest (graphite.200, was graphite.50), so a page on that slug gets the new base value unless the app compiles its own overlay.
- The concrete-creations block no longer sets --semantic-accent-rest, and in dark mode the base rest fill is now graphite.50 (was graphite.200), so a page on that slug gets the new base value unless the app compiles its own overlay.
- Light default borders and dividers are a step darker (--semantic-color-border-default in :root moved from --primitive-color-graphite-200 to --primitive-color-graphite-250), so re-take light-theme screenshots.
- Light disabled text is a step darker (--semantic-color-content-disabled in :root moved from --primitive-color-neutral-300 to --primitive-color-neutral-350), so re-take light-theme screenshots.
- Light tertiary text is a step darker (--semantic-color-content-tertiary in :root moved from --primitive-color-neutral-500 to --primitive-color-neutral-550), so re-take light-theme screenshots.
- The concrete-creations block no longer sets --semantic-color-surface-accent, and the base accent fill is now graphite.950 in light (was #4a4146) and graphite.50 in dark (was #cbc6c9), so a page on that slug gets the new base fill unless the app compiles its own overlay.
- Light hover fills are darker (--semantic-color-surface-hover in :root moved from --primitive-color-neutral-100 to --primitive-color-neutral-250), so re-take light-theme screenshots.
- Dark muted fills (surface.muted) moved to the new neutral.750 step so they stay distinct from cards; if you set this variable yourself, check it in dark mode; light muted fills also moved a step darker (neutral.250).
- Light overlay surfaces are darker (--semantic-color-surface-overlay in :root moved from --primitive-color-neutral-100 to --primitive-color-neutral-250), so re-take light-theme screenshots.
- Light pressed fills are a step darker (--semantic-color-surface-pressed in :root moved from --primitive-color-neutral-200 to --primitive-color-neutral-300), so re-take light-theme screenshots.
- Dark cards (surface.raised) moved to the new neutral.825 step so they stay distinct from the midnight page; if you set this variable yourself, check your cards in dark mode; light cards also moved a step darker (neutral.150) so they read against the page.
- Dark selected fills (surface.selected: the active tab, a checked row) moved to the new neutral.725 step so they stay distinct from cards; if you set this variable yourself, check it in dark mode; light selected fills also moved darker (neutral.325).
- Light soft fills are a step darker (--semantic-color-surface-soft in :root moved from --primitive-color-neutral-200 to --primitive-color-neutral-300), so re-take light-theme screenshots.
- Light soft hover fills are slightly darker (--semantic-color-surface-softHover in :root moved from --primitive-color-neutral-300 to --primitive-color-neutral-325), so re-take light-theme screenshots.
- Light sunken surfaces are a step darker (--semantic-color-surface-sunken in :root moved from --primitive-color-neutral-200 to --primitive-color-neutral-300), so re-take light-theme screenshots.
- Button labels are weight 600 (component.button.fontWeight); if you forced font-weight on a Button, drop it or set it through that variable.
- Board columns now keep their full width from tablet width up (the first column no longer collapses) and off-screen column counts no longer widen the page, so remove any local CSS override that worked around either.
- A focused hard-edge Button keeps its edge and its focus ring now wraps the edge too; no code change is needed.
- A focused Button variant="link" now shows a rounded ring 4px past the label with a 2px gap, and the link is position: relative; drop any local focus-visible outline or ring classes added to work around the old tight ring, and check a parent with overflow: hidden does not clip the ring.
- A Button with variant="link" and a status tone (danger, success, warning or info) is now coloured, underlined text with no tinted background, so re-take screenshots of toned link buttons and drop any local class that cleared their fill.
- Cards and other rounded-lg containers are now square when your tenant sets --role-radius to 0; other radii are unchanged.
- Combobox chips and the Dialog and Sheet close buttons now change fill on hover in light and dark; drop any local CSS that added a hover fill to them.
- A toggle Button's label and AsyncState's status blocks now fade through each other instead of swapping at once; nothing to change, and both swap instantly under reduced motion.
- Every focus ring is now one 2px outline 2px off the edge (Checkbox's moved out, invalid fields ring in the error colour), so re-take focus screenshots and restyle it with the --semantic-focus-\* variables.
- A FormField error message now eases in and fades out; nothing to change, and reduced motion still shows it instantly.
- A copyable InlineCode now crossfades its Copy and Check glyphs; nothing to change, and reduced motion still swaps instantly.
- An external InlineLink's icon now nudges up-right on hover and focus; nothing to change, and reduced motion keeps it still.
- InlineLink's external icon now follows the link's font size (12px in 16px text, was 11px) and InlineLink takes size="sm" | "md" | "lg"; drop local CSS that resized the icon or the link text and set size instead.
- Compact Pagination's Previous and Next buttons grow from 36px to 40px squares; the default Pagination is unchanged.
- Compact Pagination's Previous and Next now draw an outline and a disabled end stays outlined and faded instead of grey-filled, so drop any local CSS that bordered them or cleared the disabled fill.
- Avatar, AvatarGroup's +N bubble, Kbd, the accent Callout and the active Tab and its panel now have a fill that shows on a Card and on the page; drop any local CSS that darkened them.
- A Tabs panel now fades and rises in when it becomes active; nothing to change, and it stays still under reduced motion.
- A disabled Tag's label now uses the disabled content colour, so re-take screenshots of pages that show disabled tags.
- A new toast now eases up into the stack; nothing to change, and reduced motion still shows it at rest.
- Toasts now follow a swipe and slide out toward the swipe edge when dismissed — button and timer dismissals slide the same way and reduced-motion settings still dismiss instantly — so drop any local CSS that animated toast swipe or exit.
- On a phone or touch screen, text fields show 16px text so iOS does not zoom on focus, and a filled Input with a clear button has 44px end padding at every size; drop local CSS that raised field text to 16px or widened that padding.
- On a touch tablet, small controls (sm Button, Tabs, SegmentedControl, Tag, Disclosure, Input clear) now grow to 44px: re-check dense toolbars there, and delete any host CSS that raised them yourself.
- Pages themed with the accent-lilac brand (data-brand="accent-lilac") may look different, so check them after upgrading.
- Pages themed with the accent-pair-demo brand (data-brand="accent-pair-demo") no longer get its nav active colors and its accent fill is now near-black/near-white, so check them after upgrading.
- Pages themed with the brutalist-demo brand (data-brand="brutalist-demo") no longer get its surface padding override, so check them after upgrading.
- The package no longer ships the concrete-creations brand block, so a page with data-brand="concrete-creations" shows the base accent until the app compiles its own overlay.
- Pages themed with the soft-demo brand (data-brand="soft-demo") may look different (badge radius, and --semantic-space-component-padding no longer overridden), so check them after upgrading; its light cards also follow the darker surface.raised.

### Coming next

- hds.density is deprecated; the upgrade command rewrites hds.density.sm to hds.semantic.space.scale.xs (md to sm, lg to md, xl to lg, xl2 to xl), the same pixels. density.xs, xl3 and xl4 have no scale step: use hds.space.px4, px64 or px80, which do not shrink under compact density. Removed in 1.0.0.

### Do by hand

- Replace var(--component-lightbox-backdrop-blur) and hds.effect.blur.lightboxBackdrop with var(--primitive-blur-16), the same 16px.
- Replace var(--component-nav-bg) with var(--semantic-color-surface-page), the value it aliased; a rule that only sets it can go, since nothing in HDS reads it.
- Replace var(--component-nav-bgActive) with var(--semantic-accent-subtle), the value it aliased; a rule that only sets it can go, since nothing in HDS reads it.
- Replace var(--component-nav-borderActive) with var(--semantic-color-surface-accent), the value it aliased; a rule that only sets it can go, since nothing in HDS reads it.
- Replace var(--component-nav-height) with var(--primitive-space-16), the value it aliased; a rule that only sets it can go, since nothing in HDS reads it.
- Replace var(--component-nav-paddingX) with var(--primitive-space-6), the value it aliased; a rule that only sets it can go, since nothing in HDS reads it.
- Replace var(--component-nav-text) with var(--semantic-color-content-secondary), the value it aliased; a rule that only sets it can go, since nothing in HDS reads it.
- Replace var(--component-nav-textActive) with var(--semantic-color-content-primary), the value it aliased; a rule that only sets it can go, since nothing in HDS reads it.
- Replace var(--semantic-space-sidebar-railWidth) and the sidebar-railWidth Tailwind key with var(--primitive-size-width-280), the same 280px.
- Import hdsMuiThemeOptions by name from @hirobius/design-system/mui; the default export is gone.
- The bundled manifest no longer carries componentSpecs consumers (HDS repo file paths) or a11yRules testId (HDS test ids).
- The bundled manifest no longer carries componentSpecs figmaLink; read figmaUrl, which holds the same URL.
- Declare any of these Tailwind theme variables your own CSS reads (or use the HDS token for the same role); no HDS component read them.
- If your app uses react-router below 7.18.2, upgrade it to 7.18.2 or later (older 7.x releases have security advisories).
- An \`interface X extends TextProps\` no longer compiles because TextProps is a union (truncate and lineClamp exclude each other): write \`type X = TextProps & { … }\`.
- A wrapper that spreads an \`Omit\<TextProps, …>\` into Text can fail to compile: keep \`truncate\` and \`lineClamp\` out of the Omit, or cast the spread to \`TextProps\`.
- If \`hds/no-nested-cards\` now fails your lint, drop the outer surface and head the group with a section title and count on a plain region, or list your own card wrappers in its \`cards\` / \`surfaces\` options.
- \`cn()\` now treats named spacing classes like \`p-surface-padding\` or \`px-fixed-sm\` as spacing, so a later \`p-4\` or \`px-6\` replaces them instead of both staying; check any className that relied on both applying.
- Compile any of these utilities your own markup still uses with your own Tailwind build; HDS components never used them.

## 0.32.0

Released 2026-10-24 (minor). 11 that look different.

### Looks different

- Dark each of these now steps darker than its fill instead of a lighter rim; if you set your own edge, keep it darker than the fill: `--hds-edge-danger`, `--hds-edge-info`, `--hds-edge-success` and `--hds-edge-warning`.
- Dark --hds-edge-kbd now steps darker than the Kbd fill instead of a lighter rim; no change needed.
- Dark --hds-edge-primary is now darker than the primary fill (about graphite-400 #8b8488) instead of a lighter rim; if you set your own, keep it darker than the fill.
- Dark --hds-edge-secondary is now about neutral-700 #404040, darker than the secondary fill, so dark buttons no longer glow.
- Dark --semantic-color-surface-soft is now neutral-600 #525252 (was neutral-700), one step lighter so secondary buttons lift off dark cards.
- Dark --semantic-color-surface-softHover is now the new neutral.550 #626262 (was neutral-600), the secondary hover and wipe fill.
- Button tertiary is a ghost (no edge, no movement, surface.hover fill on hover) and every raised Button moves its face over a fixed edge, so remove any custom translate you added to fake a press.
- The .hds-link text and underline are content.primary and turn content.secondary on hover; if you restyled links to the accent colour, set your own colour on .hds-link.

## 0.31.1

Released 2026-10-23 (patch). 1 that looks different.

### Looks different

- Text link underlines are thicker: 2px, 0.2em below the baseline, where they were the font's hairline default.

## 0.31.0

Released 2026-10-22 (minor). 2 changes to make by hand (2 breaking) and 18 that look different.

### Looks different

- The secondary Button hover fill is now surface.softHover (neutral.300 light, neutral.600 dark); if you set this variable to theme the old outline hover, check it still reads on the soft fill.
- The secondary Button pressed fill is now surface.soft (the rest fill) while the hard shadow sinks; re-check any override of this variable.
- The secondary Button rest fill is now surface.soft (neutral.200 light, neutral.700 dark) instead of the page colour; set this variable to var(--semantic-color-surface-page) to get the old flat fill back.
- The unselected Tag pill is now surface.muted instead of surface.raised; re-check any override of this variable.
- The unselected Tag border now matches its fill, so the pill shows no resting edge; set this variable to var(--semantic-color-border-default) to bring the outline back.
- --role-popover (bg-popover) now reads the new semantic.color.surface.floating (white light, neutral.800 dark) instead of surface.overlay; if you set this variable, check your overlays still separate from surface.muted.
- --semantic-color-border-default (role.border, border-border) is now graphite.200 #cbc6c9 in light, up from #e5e5e5; if you override it, keep it at 1.45:1 or more on your surfaces.
- --semantic-color-border-strong is now graphite.300 #b2abae in light, up from #d4d4d4, so strong dividers and Kbd edges stay firmer than border.default.
- --semantic-color-border-subdued (deprecated) follows border.default in light at #cbc6c9; move to border.default.
- --semantic-elevation-overlay-border is now border.default, not transparent; a surface that binds the overlay elevation bundle should draw it as a 1px border.
- --semantic-elevation-overlay-surface is now surface.floating (white light, neutral.800 dark); a surface that binds it turns white in light.
- Every primary and secondary Button now has a straight-down hard shadow (colour: --hds-btn-edge, default shadow.hard) and the hover wipe; pass shadow="none" and/or hoverEffect="none" where a button must stay flat, for example inside a dense toolbar.
- The default wipe makes every Button relative isolate overflow-hidden, so content you position outside the button box is clipped; pass hoverEffect="none" on that button.
- The hard edge under Buttons and Kbd is now each item's own fill stepped darker (a lighter rim in dark) instead of semantic.color.shadow.hard; set --hds-btn-edge and --hds-kbd-edge to var(--semantic-color-shadow-hard) to keep the old single-colour edge.
- In dark mode semantic.color.shadow.hard is now neutral.500 (lighter), so the hard shadow on Button and Kbd reads at 3:1; re-check any surface you drew with it.
- CodeBlock, Table, Tabs, SegmentedControl, Board, FormActions and Combobox/TokenField chips lose their resting border; add className="border border-border" on an instance that needs the edge.
- Toggle's thumb is now 12px with an even inset in the track; nothing to change unless a visual snapshot pins the old 16px thumb.
- HDS no longer ships unused utilities (.border-stroke\*, .bg-gray-100, .bg-fill, .bg-btn-fill, .text-white, .cursor-zoom-in, the --hds-fill/hover/border helpers); without your own Tailwind build, use the token instead.

### Do by hand

- The unused CSS for each of these is gone (Tag has not rendered it since #60); use the Tag component instead: `hds-tag-btn` and `hds-tag-pill`.

## 0.30.0

Released 2026-10-21 (minor). 37 that look different and 2 deprecations.

### Looks different

- Under data-density="compact", each of these is now tighter (the scale is 12/16/24/32px there); nothing changes at the default density, so check compact screens only: `--component-card-gap`, `--semantic-docs-space-section`, `--semantic-layout-grid-gap`, `--semantic-space-component-padding`, `--semantic-space-layout-gutter`, `--semantic-space-layout-inset`, `--semantic-space-layout-normal`, `--semantic-space-layout-spacious`, `--semantic-space-layout-tight`, `--semantic-space-region-gutter`, `--semantic-space-scale-lg`, `--semantic-space-scale-md`, `--semantic-space-scale-sm`, `--semantic-space-scale-xl`, `--semantic-space-section-stack` and `--semantic-space-surface-padding`.
- Each of these is a legacy bridge that tracks its scale twin, so under data-density="compact" it is tighter too; move to --semantic-space-scale-\* and check compact screens: `--hds-space-2xl`, `--hds-space-lg`, `--hds-space-md` and `--hds-space-xl`.
- Under data-density="compact" below 640px, --semantic-space-layout-gap is now scale.sm (12px) instead of following the comfortable rule; check compact screens on phones.
- --semantic-space-scale-xs is 8px in both densities as before; the compact rule now comes from tokens.css instead of theme.css, so nothing moves.
- Under data-density="compact", each of these is now smaller (body 15, ui 14, caption 13, title 24px); nothing changes at the default density, so check compact screens only: `--semantic-typography-body-font-size`, `--semantic-typography-caption-font-size`, `--semantic-typography-eyebrow-font-size`, `--semantic-typography-h1-font-size`, `--semantic-typography-h2-font-size`, `--semantic-typography-h3-font-size`, `--semantic-typography-title-font-size` and `--semantic-typography-ui-font-size`.
- Avatar gains a person-icon fallback and a status dot, and an Avatar with no initials to show now draws the icon instead of an empty circle.
- Badge gains a count mode: a number in tabular figures that can be capped (for example 99+) and named for screen readers.
- The CodeBlock copy button is now a 32px icon-only Button in its own column beside the code, so re-take screenshots of pages with code blocks.
- Disclosure gains a row variant: an expandable list row with a one-line preview and action buttons beside it.
- PageHeader gains an optional metadata row of badges above the title; screens that do not pass it are unchanged.
- Pagination gains a compact variant, a small "1 of 4" pager with previous and next arrows; the default pager is unchanged.
- The secondary SegmentedControl's selected segment now has a darker 1px edge, so re-take screenshots of pages that use it.

### Coming next

- --primitive-color-lime-\* still resolve; the ramp only feeds the hidden delight accent, so add no new uses. Removed in 1.0.0.
- --semantic-accent-delight-\* still resolve to the same lime; they are hidden while lime is parked (hds#857) and may come back, so keep existing uses and add none. Removed in 1.0.0.

## 0.29.0

Released 2026-10-20 (minor). 12 changes to make by hand (12 breaking), 34 that look different and 1 deprecation.

### Looks different

- Badge horizontal padding is now 8px (was 6px); check badges in tight rows or fixed-width cells.
- Card padding now follows surface.padding: 28px (24px compact), was a fixed 24px; check fixed-height cards.
- The deprecated --hds-space-2xl is now 64px (48px compact), tracking scale.xl; move to --semantic-space-scale-xl.
- The deprecated --hds-space-lg is now 28px (24px compact), tracking scale.md; move to --semantic-space-scale-md.
- The deprecated --hds-space-md is now 20px (16px compact), tracking scale.sm; move to --semantic-space-scale-sm.
- The deprecated --hds-space-sm is 8px in both densities now (compact was 6px); move to --semantic-space-scale-xs.
- The deprecated --hds-space-xl is now 40px (32px compact), tracking scale.lg; move to --semantic-space-scale-lg.
- weight.display is 700 (was 800); display, title and titleSm read it, so headings are a step lighter.
- Body weight is 400 (was 450); text that reads this variable renders slightly lighter.
- Doc paragraph spacing is 28px (was 24px); check long-form pages that read it.
- Doc section breaks follow scale.xl: 64px (48px compact), was a fixed 48px.
- The layout grid gap follows scale.md (28px, 20px below 640px; 24/16px compact), was 24px and 16px.
- Section vertical padding is 96px (64px below 640px), was 80px and 48px; re-take screenshots of long pages.
- The deprecated component.gap now aliases scale.xs (8px in both densities, as before); move to --semantic-space-scale-xs.
- The layout gap follows scale.md (28px, 20px below 640px; 24/16px compact), was 24px and 16px.
- The deprecated layout.inset is now 40px (was 32px), fixed in both densities; move to --semantic-space-scale-lg.
- The deprecated layout.normal is now 28px (was 24px), fixed in both densities; move to --semantic-space-scale-md.
- The deprecated layout.spacious is now 64px (was 48px), fixed in both densities; move to --semantic-space-scale-xl.
- The deprecated layout.tight is now 20px (was 16px), fixed in both densities; move to --semantic-space-scale-sm.
- The page gutter is 40px on desktop and 20px below 640px (32/16px compact), was 32/16px (24/12px compact); check full-bleed layouts at 390px.
- scale.lg is 40px (32px compact), was 32px (24px compact); layouts that read it get roomier.
- scale.md is 28px (24px compact), was 24px (20px compact); card and dialog insets grow with it.
- scale.sm is 20px (16px compact), was 16px (12px compact); list rows and field stacks grow with it.
- scale.xl is 64px (48px compact), was 48px (40px compact); gaps between sections grow with it.
- scale.xs is 8px in both densities now (compact was 6px).
- Hero inset below 640px is 80px (was 64px); 128px above it is unchanged.
- Space between page sections is 96px (64px below 640px), was 80px and 48px.
- The display role is 56px (was 48px); check hero headings for wrapping at 390px.
- The deprecated h1 style follows title to 28px (was 24px); move to title.
- The deprecated h2 style follows title to 28px (was 24px); move to title.
- The deprecated h3 style follows title to 28px (was 24px); move to title.
- Titles are 28px (was 24px); page and section headings take more room, so check fixed-height headers.
- Small titles are 20px (was 18px), one step above body; Alert titles now use this role too.
- fonts.css declares Sora 700 (fonts/sora-700.woff2) in place of Sora 800; import fonts.css again, or load the 700 weight if you host Sora yourself.

### Coming next

- The off-grid spacing steps 6px and 10px (--primitive-space-px6/px10, hds.space.px6/px10, Tailwind \*-px6/\*-px10) were deprecated in 0.29.0 for removal in 0.31.0; that removal was cancelled, so they stay and nothing is rewritten.

### Do by hand

- Each of these was a Tailwind theme variable that shipped only because a repo test named a utility using it; declare it in your own CSS (or use an HDS token) if you read it: `--color-blue-500`, `--color-indigo-600`, `--color-purple-500`, `--color-red-500`, `--color-red-700` and `--ease-in-out`.
- The stray CSS variable each of these is no longer shipped (a Tailwind scan of repo docs generated it as a side effect, never a documented token); set your own value if you read it: `--color-slate-200`, `--color-slate-900`, `--color-stone-50`, `--container-5xl` and `--font-serif`.
- The stray CSS variable --tracking-wider is no longer shipped; type tracking comes from the --semantic-typography-\*-letter-spacing tokens, so use a type role instead.

## 0.28.0

Released 2026-10-20 (minor). 1 change to make by hand (1 breaking) and 4 that look different.

### Looks different

- The pressed secondary Button fill is now the pressed surface colour, a clearer step from hover, so re-check any screenshot of a pressed secondary Button.
- The pressed surface is now a mid light grey (was almost white) in light mode, so re-check pressed states you draw by hand.
- --semantic-typography-mono-font-weight now reads --primitive-typography-weight-mono (400); if your mono font has a heavier cut you want, set that primitive.
- Table borders are two steps lighter than before in Dark mode and the Board column gap is 24px in compact density (was 32px; unchanged at 32px by default); re-take Table and Board screenshots.

### Do by hand

- The secondary Button pressed border variable is gone, so delete any override of it, since the hover border now holds while pressed.

## 0.27.0

Released 2026-10-19 (minor). 5 changes to make by hand (3 breaking) and 33 that look different.

### Looks different

- Badge labels are now 14px (were 12px); if you size a Badge container by hand, give it room for the larger label.
- Large Button labels are now 16px (were 14px); check any fixed-width Button.
- Medium Button labels are now 16px (were 14px); check any fixed-width Button.
- Small Button labels are now 14px (were 12px); check any fixed-width small Button.
- Tag labels are now 14px (were 12px); if you size a Tag container by hand, give it room for the larger label.
- The dark-mode accent fill (graphite.200) is now #cbc6c9 (was #d4d0d2); its on-accent text is 9.02:1.
- The light-mode accent fill and accent text (graphite.700) is now #4a4146 (was #433a3f); white text on it is 9.83:1.
- The display family now leads with Sora, then Plus Jakarta Sans; if you read this variable for your own headings they change face, and if you set it to rebrand headings, set --hds-font-family-display instead.
- Code and ids (the mono role) are now 15px (were 13px); if you read this variable for your own code styling, expect text two pixels larger.
- Body weight is now 450 (was 400); if you read this variable for your own text it renders slightly heavier, and Plus Jakarta Sans must load as a variable font (fonts.css does this).
- Dark-mode hover and pressed accent fills are now lighter (graphite-100 and graphite-50), so on-accent labels pass AA; drop any held contrast floor on this pair.
- Dark-mode hover and pressed accent fills are now lighter (graphite-100 and graphite-50), so on-accent labels pass AA; drop any held contrast floor on this pair.
- Body text is now 18px (was 16px); check where you read this variable for layout, such as fixed-height blocks or character-count widths.
- Caption text (metadata and help text) is now 14px (was 12px); check tight metadata rows and badges you size by hand.
- The display role now follows --hds-font-family-display (Sora by default), not the body dial; set that dial to change hero headings.
- The display role now uses weight 800 in Sora; re-take hero heading screenshots.
- The deprecated eyebrow style follows caption and is now 14px (was 12px); move to caption.
- The deprecated h1 style follows title onto Sora; move to title.
- The deprecated h1 style follows title to weight 800 in Sora; move to title.
- The deprecated h2 style follows title onto Sora; move to title.
- The deprecated h2 style follows title to weight 800 in Sora; move to title.
- The deprecated h3 style follows title onto Sora; move to title.
- The deprecated h3 style follows title to weight 800 in Sora; move to title.
- Titles now follow --hds-font-family-display (Sora by default), not the body dial; set that dial to change section headings.
- Titles now use weight 800 in Sora; re-take heading screenshots.
- Small titles now follow --hds-font-family-display (Sora by default), not the body dial; set that dial to change them.
- Small headings are now 18px (were 16px); check where you read this variable for layout.
- Titles now use weight 800 in Sora; re-take heading screenshots.
- UI text (controls, nav, table text) is now 16px (was 14px); check where you read this variable for layout, such as fixed-height rows or toolbars.
- Plus Jakarta Sans now ships as one variable face (weights 200 to 800) in fonts.css; if you pointed at the old 400, 500 or 700 files, import fonts.css again or load your own.
- This static Plus Jakarta Sans face is folded into the variable face in fonts.css; import fonts.css again, or load your own file for this weight.
- This static Plus Jakarta Sans face is folded into the variable face in fonts.css; import fonts.css again, or load your own file for this weight.
- Table now has a bordered frame, a tinted header, taller body rows with vertical rules and regular-weight body text, and wide content scrolls inside the table instead of spilling past it; re-take Table screenshots and drop any wrapper you added to stop clipping.

### Do by hand

- Delete every var(--hds-accent-bar); status is shown in the content, not a coloured bar.
- The stray CSS variable --leading-relaxed and the .leading-relaxed class are no longer shipped; use --semantic-typography-body-line-height or set your own line-height instead.
- Delete the BoardColumnTone import and the tone prop from every BoardColumn, and drop any var(--hds-accent-bar); status lives in the column title and count.
- Lint now errors on bullet lines with three or more items (new hds/max-two-meta-items rule): use MetaLine for two items, one row per item beyond that, or turn the rule off for that file.
- New opt-in cobalt accent theme: set data-accent="cobalt" on \<html> (or a wrapper) and the accent, on-accent and accent-bound role and component variables swap to the cobalt ramp; nothing changes unless you set the attribute.

## 0.26.2

Released 2026-10-15 (patch). Nothing in this release asks anything of a consumer.

Nothing in this release asks anything of you.

## 0.26.1

Released 2026-10-14 (patch). 2 that look different.

### Looks different

- Nothing to do: dark secondary text is a new half-step lighter (neutral.350) so it reads on sunken surfaces; it stays visibly dimmer than primary text.
- MetricTiles now shows at most 2 columns at 640px and under, TabsList fades the edge that has hidden tabs, and Stack passes aria-\* and role through, so check any phone-width screenshot tests that include them.

## 0.26.0

Released 2026-10-14 (minor). 3 changes to make by hand (1 breaking) and 44 that look different.

### Looks different

- The badge radius token is now the 8px action radius instead of 4px, and the new soft-demo tenant also sets it; nothing to change unless you read it directly.
- Nothing to do unless you set data-brand to soft-demo or accent-pair-demo: those new demo tenants set each of these, and every other brand looks the same: `--component-button-bg`, `--component-button-bgHover`, `--component-button-radius`, `--component-button-secondary-bg-hover`, `--component-button-secondary-border-hover`, `--component-button-secondary-border-pressed`, `--component-card-bg`, `--component-input-radius`, `--component-nav-bgActive`, `--component-nav-borderActive`, `--component-tag-activeBackground`, `--component-tag-activeBorder`, `--component-tag-activeHover`, `--component-tag-background`, `--role-accent`, `--role-accent-foreground`, `--role-card`, `--role-primary`, `--role-radius`, `--role-ring`, `--role-secondary`, `--semantic-accent-content`, `--semantic-accent-contentHover`, `--semantic-accent-hover`, `--semantic-accent-pressed`, `--semantic-accent-rest`, `--semantic-accent-subtle`, `--semantic-color-border-accent`, `--semantic-color-content-accent`, `--semantic-color-surface-accent`, `--semantic-color-surface-accentSubtle`, `--semantic-color-surface-raised`, `--semantic-radius-action`, `--semantic-space-component-padding` and `--semantic-space-surface-padding`.
- Nothing to do: in dark mode the default border is one step lighter (neutral-600), so card and input edges read against the page; light mode is unchanged.
- Nothing to do: in dark mode the sunken surface is one step lighter (neutral-700), so inset wells and the highlighted menu, select and combobox item stand out from the overlay; light mode is unchanged.
- Alert is padded like Callout (24px instead of 8px), and Alert, Callout, Badge and CodeBlock use the action radius (8px, following a tenant role.radius) instead of a fixed 4px or 8px; nothing to change unless you styled around the old size.
- Card.Header, Card.Body, Card.Footer, Card.Progress and Card.Metric no longer add their own 24px inside a padded Card, so their content moves out to the Card's single 24px inset, while a Card with padding none keeps the parts' own padding.
- Input, Textarea, Select and Combobox now draw the red error border whenever aria-invalid is true, and Input and Textarea labels sit 8px above the control instead of 6px; nothing to change unless you styled around the old gap.
- MetadataList variant divided no longer draws a padded, rounded, bordered box and renders its value in body type; wrap it in a Card or Surface if you want the box.
- Page now pads its content with the region gutter (24px, 16px below 640px), so content that relied on running edge to edge is inset; pass style paddingLeft and paddingRight of 0 to keep the old fit.
- The Disclosure trigger is at least 24px tall, copyable CodeBlock and InlineCode gain a hidden copy-status element, and a clickable non-expandable AssetImg becomes a focusable button; nothing to change unless you snapshot their markup or height.

### Do by hand

- Icon color and Table column width are now typed to tokens: pass currentColor or a var(--semantic-…) token as the colour, and an fr value, minmax(), max-content or a var(--…) token as the width; a hex, rgb(), px or rem value is a type error.
- Button label now sets the accessible name whenever it is given, even with children, so a Button that passes both is announced by the label and the label should still describe the visible text.
- A CodeBlock is no longer a region named Code sample with its own tab stop; it becomes a keyboard-scrollable group named by its filename or language only when its code overflows, so update any test or selector that looked for that region.

## 0.25.0

Released 2026-10-13 (minor). 1 change to make by hand (1 breaking), 10 that look different and 6 deprecations.

### Looks different

- A disabled secondary button now draws a lighter border (border.subdued), so it reads as disabled; nothing to change unless you styled against the old darker border.
- In dark mode, the subtle border is now neutral.700 (was neutral.850) so it shows on raised surfaces; check any hairline you matched to the old value.
- In dark mode, the hover surface is now neutral.700 (was neutral.900) so hover reads on raised surfaces; check any hover colour you matched to the old value.
- In dark mode, the muted surface is now neutral.800 (was neutral.900) so it stays lighter than raised; check any muted block you matched to the old value.
- In dark mode, the overlay surface is now neutral.800 (was neutral.850) so it stays above raised; check any overlay colour you matched to the old value.
- In dark mode, the pressed surface is now black (was neutral.950) so it reads darker than hover and apart from raised; check any pressed colour you matched to the old value.
- In dark mode, the raised surface is now neutral.850 (was neutral.950) so cards read against the page; check any card colour you matched to the old value.
- In dark mode, the sunken surface is now neutral.800 (was neutral.850) to keep the surface order; check any sunken colour you matched to the old value.
- DestructiveSection now sits on the tinted danger background with a smaller bold title and an outlined button, and a new titleSm text style (16px bold) is available for small headings.
- Kbd now has a 2px darker edge under it so it reads as a raised key; its size and layout are unchanged, so nothing to do unless you screenshot-test it.

### Coming next

- Blockquote has one size (md); the size prop, including sm and lg, still renders as before until removed. Removed in 1.0.0.
- Card.Metric is deprecated and still works; no replacement is planned, so compose a Card with the type roles (caption label, display or title value). Removed in 1.0.0.
- Each of these is deprecated and still works; no replacement is planned, so compose a Card with the type roles (caption label, display or title value): `MetricTile`, `MetricTiles` and `Stat`. Removed in 1.0.0.
- StatusTile still works until 1.0.0; replace it with \<Card padding="item" className="border-0">\<Card.Row trailing={trailing}>\<Card.RowTitle>{title}\</Card.RowTitle> plus one \<Card.RowNote> per note, and drop tone, which StatusTile never painted. Removed in 1.0.0.

### Do by hand

- The CSS variable --primitive-typography-letterSpacing-caps and the tracking-caps class are gone because the system is sentence case, so delete them from your styles.

## 0.24.1

Released 2026-10-12 (patch). 16 that look different.

### Looks different

- The legacy flat Button vertical padding token is now 8px (was 12px), the value the medium Button renders.
- The secondary Button hover fill token is now the accent-subtle surface (was the raised surface), the fill it renders.
- The secondary Button disabled border token is now the interactive border (was the subdued border), the colour it renders.
- The secondary Button hover border token is now the accent border (was the interactive border), the colour it renders.
- The secondary Button pressed border token is now the accent border (was the interactive border), the colour it renders.
- The large Button label size token is now 14px (was 16px), the size it renders.
- The medium Button vertical padding token is now 8px (was 12px), the value it renders.
- The small Button height token is now 32px (was 28px), the height it renders.
- The small Button icon-to-label gap token is now 8px (was 4px), the gap it renders.
- The small Button horizontal padding token is now 12px (was 8px), the value it renders.
- The Card gap token is now 16px (was 8px), the gap Card renders.
- The Card radius token is now 12px (was 8px), the radius Card renders.
- The Input background token is now the page surface (was the raised surface), the fill Input renders.
- The Input horizontal padding token is now 12px (was 16px), the padding the medium Input renders.
- The Tag background token is now the raised surface (was accent-subtle), the fill an unselected Tag renders.
- The Tag text token is now the secondary content colour (was primary), the colour an unselected Tag renders.

## 0.24.0

Released 2026-10-12 (minor). 11 changes to make by hand (11 breaking) and 24 that look different.

### Looks different

- This variable now follows the font dial (--hds-font-family) at any scope; if you overrode it directly, override the dial instead.
- This variable now follows the code-font dial (--hds-font-family-mono) at any scope; if you overrode it directly, override the dial instead.
- This variable now follows the font dial (--hds-font-family) at any scope; if you overrode it directly, override the dial instead.
- Accent-intent text and icons (such as links) now render in graphite instead of a dark apple green.
- Hovered accent text now shifts within the graphite scale instead of toward a darker apple green.
- The accent fill on hover is now a deeper graphite (light mode) or lighter warm-grey (dark mode) instead of a green.
- The accent fill while pressed is now a darker graphite (light mode) or lighter warm-grey (dark mode) instead of a green.
- Interactive accent fills at rest (primary buttons, selected controls) now render in warm graphite — a dark fill in light mode and a light warm-grey fill in dark mode — instead of a bright apple green.
- The low-emphasis accent tint (hover and selection backgrounds) is now a faint graphite tint instead of a faint apple green.
- Accent borders now render in graphite instead of apple green.
- Accent-intent text and icons on page and card surfaces now render in graphite instead of a dark apple green.
- Text and icons on accent fills are now near-white in light mode and dark graphite in dark mode (the fill inverts per theme), instead of a dark neutral in both modes.
- Accent background surfaces now render in warm graphite that inverts per theme instead of a bright apple green.
- Faint accent background surfaces are now a pale graphite tint instead of a pale apple green.
- This variable now follows the font dial (--hds-font-family) at any scope; if you overrode it directly, override the dial instead.
- This variable now follows the font dial (--hds-font-family) at any scope; if you overrode it directly, override the dial instead.
- This variable now follows the font dial (--hds-font-family) at any scope; if you overrode it directly, override the dial instead.
- This variable now follows the font dial (--hds-font-family) at any scope; if you overrode it directly, override the dial instead.
- This variable now follows the font dial (--hds-font-family) at any scope; if you overrode it directly, override the dial instead.
- This variable now follows the font dial (--hds-font-family) at any scope; if you overrode it directly, override the dial instead.
- This variable now follows the font dial (--hds-font-family) at any scope; if you overrode it directly, override the dial instead.
- This variable now follows the code-font dial (--hds-font-family-mono) at any scope; if you overrode it directly, override the dial instead.
- This variable now follows the font dial (--hds-font-family) at any scope; if you overrode it directly, override the dial instead.
- This variable now follows the font dial (--hds-font-family) at any scope; if you overrode it directly, override the dial instead.

### Do by hand

- The --primitive-color-apple-100 variable is gone; use --primitive-color-graphite-100 for the same accent step.
- The --primitive-color-apple-200 variable is gone; use --primitive-color-graphite-200 for the same accent step.
- The --primitive-color-apple-300 variable is gone; use --primitive-color-graphite-300 for the same accent step.
- The --primitive-color-apple-400 variable is gone; use --primitive-color-graphite-400 for the same accent step.
- The --primitive-color-apple-50 variable is gone; use --primitive-color-graphite-50 for the same lightest accent step.
- The --primitive-color-apple-500 variable is gone; use --primitive-color-graphite-500 (or a semantic accent token) instead.
- The --primitive-color-apple-600 variable is gone; use --primitive-color-graphite-600 for the same accent step.
- The --primitive-color-apple-700 variable is gone; use --primitive-color-graphite-700 for the rest accent step.
- The --primitive-color-apple-800 variable is gone; use --primitive-color-graphite-800 for the same accent step.
- The --primitive-color-apple-900 variable is gone; use --primitive-color-graphite-900 for the same accent step.
- The --primitive-color-apple-950 variable is gone; use --primitive-color-graphite-950 for the darkest accent step.

## 0.23.2

Released 2026-10-11 (patch). 2 that look different.

### Looks different

- The disabled primary Button fill is now the muted surface instead of the accent-subtle surface.
- The disabled primary Button text is now the disabled content colour instead of the on-accent colour.

## 0.23.1

Released 2026-10-11 (patch). 6 that look different.

### Looks different

- The scoped HDS font variable now names Plus Jakarta Sans first instead of Satoshi.
- Display and title text now renders in Plus Jakarta Sans instead of Satoshi.
- Body, UI and caption text now renders in Plus Jakarta Sans instead of Satoshi.
- fonts.css no longer declares Satoshi 400; it declares Plus Jakarta Sans 400 instead, so drop any font-family: Satoshi of your own.
- fonts.css no longer declares Satoshi 500; it declares Plus Jakarta Sans 500 instead, so drop any font-family: Satoshi of your own.
- fonts.css no longer declares Satoshi 700; it declares Plus Jakarta Sans 700 instead, so drop any font-family: Satoshi of your own.

## 0.23.0

Released 2026-10-10 (minor). 14 that look different.

### Looks different

- Accent-intent text and icons (such as links) now render in a dark apple green instead of a dark neutral.
- Hovered accent text now shifts to a darker apple green instead of a darker neutral.
- The accent fill on hover is now a deeper apple green instead of a dark neutral.
- The accent fill while pressed is now a darker apple green instead of a near-black neutral.
- Interactive accent fills at rest (primary buttons, selected controls) now render in a bright apple green instead of a dark neutral, paired with dark on-accent text.
- The low-emphasis accent tint (hover and selection backgrounds) is now a faint apple green instead of a neutral tint.
- Accent borders now render in apple green instead of a dark neutral.
- Accent-intent text and icons on page and card surfaces now render in a dark apple green instead of a neutral.
- Text and icons on accent fills are now a dark neutral instead of white, because the accent fill is a bright apple green that needs dark text for contrast.
- Accent background surfaces now render in a bright apple green instead of a dark neutral.
- Faint accent background surfaces are now a pale apple green instead of a neutral tint.
- Callout now renders as a tinted feedback fill (rounded, no left stripe) matching Alert, with the accent tone using a neutral muted fill.
- Code text now draws in IBM Plex Mono instead of Geist Mono, so if you preload or self-host geist-mono-400.woff2, point it at ibm-plex-mono-400.woff2 from fonts.css instead.
- Table data cells vertically center their content (badge/status slots no longer float above text) and the caption gains spacing above the table; loading spinners and the progress bar stop animating under prefers-reduced-motion.

## 0.22.0

Released 2026-10-08 (minor). 3 changes to make by hand (1 breaking), 1 that looks different and 2 deprecations.

### Looks different

- --component-tag-lineHeight is now 1.5 instead of an invalid value the browser ignored, so text that reads it gets that line height.

### Coming next

- Divider's strong prop, deprecated since before 0.16.0, still works; use variant="strong" instead. Removed in 1.0.0.
- InlineCode's compact prop, deprecated since before 0.16.0, still works; use density="compact" instead. Removed in 1.0.0.

### Do by hand

- The raw tokens (the tokens export and hirobius.tokens.json) are strict DTCG now, so read semantic.motion.\*.\$value.timingFunction instead of .easing, and the elastic spring and each semantic.elevation level from \$extensions\["com.hirobius.hds"].\$value.
- The figmaUrl of each component in the ./manifest export (public/hds-manifest.json) now points at file 2VgBbVpKiDnu0aftJEVyBQ, "HDS Tokens & Components"; node ids are unchanged, so a stored link needs only the new file key.
- The hds-mcp get_component tool now marks core: true only on the 43 ratified core components and recommended: true on the wider set AGENTS.md recommends, and list_core names its set, so read recommended where you relied on core for that wider set.

## 0.21.0

Released 2026-10-07 (minor). StatusDot is removed, fonts move to an opt-in fonts.css, the type ramp is cut to 5 roles; AGENTS.md, hds-mcp and the ESLint plugin ship.

### Looks different

- AssetImg without a src now shows a fallback that fits its container.
- A pressed toggle Button now fills with the accent surface, so it reads as on.
- Card, Surface and StatusTile no longer fill their parent's height, so give the parent a stretching layout (Grid align="stretch") where one must fill it.
- CodeBlock pads its code 16px instead of 80px.
- Dialog and AlertDialog now keep a 16px margin from the screen edge and scroll inside when taller than the screen.
- Disclosure variant="card" no longer clips its content or leaves empty space when closed.
- A vertical Divider now stretches across its row without needing a parent height.
- ErrorPattern now fits its container instead of filling the viewport height, so pass fullPage where it is a whole error page.
- A Button with no variant in FormActions primary now renders as primary, so pass variant where you want another style there.
- Grid now aligns its items to the start and Grid.Item no longer sets height: 100%, so pass align="stretch" to a Grid whose Cards, Surfaces or StatusTiles must share one height.
- A horizontal MetadataList now sizes its term column to its content.
- Progress now shows its neutral fill on a visible track, and its sm bar is 6px tall.
- SegmentedControl md segments now hug their labels in a 40px rail (sm 32px), so every segment shows instead of one filling the rail.
- Select now matches Input (40px tall, 44px on small screens, the same fill and an up-down chevron), and the built-in labels of Input, Textarea and Select are 14px like a FormField label.
- A rectangular Skeleton is now 5rem tall by default and uses the sunken surface fill, so it shows on a Card.
- Slider's track is now an 8px bar with a visible fill instead of a padded 48px slab.
- Stat now aligns its content to the start.
- Table no longer pads its scroll region by default, so pass flush={false} where you want the old inset back.
- Checkbox, Radio and Toggle rows now share one inset and height.
- Input, Textarea, Select, Combobox and Slider are now at most 40rem wide, so set --hds-form-control-max-width or add max-w-none to the control's className where one must be wider.
- On touch screens, Checkbox, Radio and Toggle rows, the Pagination page buttons and the CodeBlock copy button are now at least 44px tall.
- Headings (h1 to h3, heading1 to heading3) now render at 24px, display at 48px, body at 16px with 1.6 leading and mono at 13px, and eyebrow, badge and micro text is no longer uppercase.

### Coming next

- The Text variants heading1, heading2, heading3, technical, eyebrow, badge, docLede, docBody, docSmall and docCode still work but are deprecated; use title, mono, caption, body or ui instead. Removed in 1.0.0.
- The hds.typeStyles keys from before the ramp (h1 to h3, heading1 to heading3, eyebrow, badge, micro, technical, small, label and the rest) and hds.semantic.typography label, labelDescriptive and labelTechnical still work but are deprecated; use display, title, body, ui, caption or mono instead. Removed in 1.0.0.

### Do by hand

- StatusDot and StatusDotProps are removed, so replace each \<StatusDot tone size label> with \<Badge dot tone size label> (BadgeProps for the type), moving any style to a wrapper element or a className first.
- The HDS ESLint plugin's recommended config now fails raw \<button>, \<input>, \<select>, \<textarea> and \<form> (hds/no-raw-controls), so use Button, Input, Select, Textarea and Form instead or set the rule to 'off'.
- An info or success Alert now has role="status" instead of role="alert", so tests that find it by role must look for status.
- A labelled dot Badge now has role="img" instead of role="status", so tests that find it by role must look for img.
- A className on Button or Card can now override the colours a tone sets, so check any toned Button or Card that also passes colour classes.
- Combobox now returns focus to its trigger after Escape or a pick.
- Toggle's input now has role="switch", so tests that find it by role checkbox must look for switch.
- Checkbox, Radio and Toggle now take one tab stop each instead of two, so keyboard tests that press Tab twice per control must press it once.
- The CSS variable --semantic-typography-eyebrow-text-transform is gone, so set text-transform: uppercase yourself where a label must stay uppercase.
- Add import '@hirobius/design-system/fonts.css' next to your tokens.css or styles.css import, or text renders in the system font instead of Satoshi and Geist Mono.
- The ESLint plugin now ships in the package, so import hds from '@hirobius/design-system/eslint-plugin' and drop the separate @hirobius/eslint-plugin-hds dependency.
- A Badge with label but no dot now warns once in development, because label only names a dot badge, so put the text in children instead.

## 0.20.0

Released 2026-10-01 (minor). Pattern components move to /patterns; deprecated, lab and folded components, Hds\* aliases and 7 runtime deps are removed.

### Fixed for you

The upgrade command runs these codemods for you.

- Each of these is no longer exported from the package root; import it from @hirobius/design-system/patterns instead: `AssetImg`, `AssetImgProps`, `CodeBlock`, `CodeBlockProps`, `ErrorPattern`, `ErrorPatternProps`, `FieldWiring`, `FieldWiringInput`, `Form`, `FormField`, `FormFieldProps`, `FormFieldShell`, `FormFieldShellProps`, `FormProps`, `Page`, `PageProps`, `Reveal`, `RevealAnimation`, `RevealProps`, `StatusTile`, `StatusTileProps`, `StatusTileTone`, `blockCodeTextVariants`, `blockContainerVariants`, `blockHeaderVariants`, `chevronVariants`, `collapsibleToggleVariants`, `copyButtonVariants`, `inlineCodeTextVariants`, `inlineWrapperVariants`, `prePanelVariants` and `useFieldWiring`. Codemod: `hds-patterns-subpath`.
- HdsCheckbox is removed from the package root; use Checkbox, the same component under its bare name. Codemod: `hds-prefix`.
- HdsRadio is removed from the package root; use Radio, the same component under its bare name. Codemod: `hds-prefix`.
- HdsSelect is removed from the package root; use Select, the same component under its bare name. Codemod: `hds-prefix`.
- HdsSlider is removed from the package root; use Slider, the same component under its bare name. Codemod: `hds-prefix`.
- HdsToggle is removed from the package root; use Toggle, the same component under its bare name. Codemod: `hds-prefix`.
- HdsTooltip is removed from the package root; use Tooltip, the same component under its bare name. Codemod: `hds-prefix`.
- NotFoundPattern is removed; use ErrorPattern displayText="404" message="Page not found" from @hirobius/design-system/patterns (hds-not-found-pattern rewrites it) instead.
- TileGrid is removed; use Grid layout="auto-fill" minItemWidth="…" gap="medium" (hds-tile-grid rewrites it) instead.

### Looks different

- AssetImg's expand label now uses the on-accent text color, so it stays readable in dark mode.
- Box sx spacing given as a t-shirt name such as 'md' now applies that spacing, where before it applied none.
- A pressed Button now tints only its fill with a 5% overlay, white in dark mode, instead of dimming the whole control, and the press no longer animates.
- Input keeps its inner padding beside icons, the clear button and the spinner, so long text no longer runs under them.
- A string passed to Input's prefix prop now shows as text inside the field, where before it went to the input element as an attribute.
- A sortable Table header now fades its label to the muted color on hover.
- Tooltip now casts the floating shadow that popovers and menus use instead of the dialog shadow.

### Coming next

- Box sx spacing names 'tight', 'normal', 'inset' and 'spacious' still work but are deprecated, and a development build warns once for each; use 'sm' to 'xl' instead. Removed in 1.0.0.
- Stack gap names 'tight', 'normal', 'inset' and 'spacious' still work and do not warn yet, but are removed in 1.0.0, and Stack names no replacement until then.
- StatusDot still works but is removed in 0.21.0; use Badge dot with the same tone, size and label, and move any style prop to a wrapper or a className first.
- StatusDotProps is removed in 0.21.0; use BadgeProps instead.
- hds.density still works but is deprecated; use hds.semantic.space.scale one step down, so density.sm becomes scale.xs. Removed in 1.0.0.
- Sixteen Tailwind utilities that only HDS's deleted internal files used, such as pt-1 and max-w-2xl, still ship in styles.css and tokens.css until 1.0.0, so a page that relies on HDS's compiled CSS for them should generate them with its own Tailwind. `pb-8`, `p-16`, `h-3.5`, `w-3.5`, `inline-block`, `opacity-100`, `text-muted-foreground/70`, `transition-[transform,opacity]`, `text-foreground`, `text-foreground`, `var(--semantic-color-feedback-bg-warning)]`, `var(--semantic-color-feedback-warning)]/40` and `var(--semantic-color-feedback-warning)]` were removed in [0.33.0](#0330); the rest is removed in 1.0.0.

### Do by hand

- Each of these is removed with no drop-in replacement, so rewrite or delete the code that imports it: `ActivityEvent`, `ActivityFeed`, `ActivityFeedProps`, `ActivityStatus`, `ActivityTone`, `AppShell`, `AppShellProps`, `ButtonGroup`, `ButtonGroupProps`, `Calendar`, `CalendarProps`, `Carousel`, `CarouselProps`, `CaseStudyLayout`, `CaseStudyLayoutProps`, `CinematicLink`, `CinematicLinkProps`, `CommandPalette`, `CommandPaletteProps`, `ComponentInstanceMatrix`, `ContextMenu`, `DateInput`, `DateInputProps`, `DateRangeInput`, `DateRangeInputProps`, `DateTimeInput`, `DateTimeInputProps`, `DocLinkCard`, `DocLinkCardProps`, `ErrorBoundary`, `ErrorBoundaryProps`, `FileInput`, `FileInputProps`, `FoundationSwatch`, `FoundationSwatchProps`, `HdsDocsShell`, `HdsDocsShellProps`, `HdsSystemDocLayout`, `HeadingStack`, `HeadingStackProps`, `HistoryCard`, `HistoryCardCommit`, `HistoryCardProps`, `HoverCard`, `Lightbox`, `LightboxProps`, `NavGroup`, `NavGroupProps`, `NavItem`, `NavProps`, `OverflowList`, `OverflowListProps`, `SideNav`, `SideNavLevel`, `SideNavProps`, `Sketch`, `SketchProps`, `StackedCardRail`, `StackedCardRailCard`, `StackedCardRailProps`, `Step`, `Stepper`, `StepperField`, `StepperFieldProps`, `StepperProps`, `TextLockup`, `TextLockupProps`, `Token`, `TokenProps`, `Tokenizer`, `TokenizerProps`, `Toolbar`, `ToolbarComponent`, `TopNav`, `TopNavProps`, `TreeList`, `TreeListProps`, `TreeNode`, `activityAvatarVariants`, `activityToneVariants`, `appShellVariants`, `buttonGroupVariants`, `carouselControlVariants`, `circularProgressVariants`, `cmdkDescriptionVariants`, `cmdkKindBadgeVariants`, `cmdkRowVariants`, `defaultActivityEvents`, `docLinkCardVariants`, `fileInputVariants`, `hdsTimeInputVariants`, `hdsToggleButtonVariants`, `headingStackLevelVariants`, `headingStackVariants`, `navGroupLabelVariants`, `navIndicatorVariants`, `navItemVariants`, `selectableCardVariants`, `sideNavVariants`, `stepMarkerVariants`, `tokenLabelVariants`, `tokenNodeInlineVariants` and `tokenShellVariants`.
- Each of these is no longer exported, so style its component through the component's props instead: `badgeVariants`, `blockquoteVariants`, `buttonVariants`, `cardVariants`, `crumbLabelVariants`, `disclosureTriggerVariants`, `fieldValueVariants`, `inlineCodeVariants`, `inputVariants`, `kbdVariants`, `metadataListVariants`, `overflowBubbleVariants`, `progressTrackVariants`, `segmentedControlDescriptionVariants`, `segmentedControlFocusRingVariants`, `segmentedControlIndicatorVariants`, `segmentedControlItemVariants`, `segmentedControlLabelVariants`, `segmentedControlRailVariants`, `segmentedControlWrapperVariants`, `skeletonVariants`, `spinnerVariants`, `statVariants`, `statusDotVariants`, `statusListItemDotVariants`, `surfaceVariants`, `tableDataCellVariants`, `tableHeaderCellVariants`, `tableSortButtonVariants`, `tagButtonVariants`, `tagPillVariants`, `textVariants`, `textareaVariants` and `toastIconVariants`.
- AspectRatio is removed; use Box style={{ aspectRatio: '16 / 9' }} instead.
- Each of these is removed; use BoxProps instead: `AspectRatioProps`, `BleedProps`, `CoverProps` and `FrameProps`.
- Bleed is removed; use Box style={{ marginInline: 'calc(-1 \* var(--semantic-space-scale-md))' }} instead.
- Center is removed; use Container maxWidth="content", with a Box style={{ paddingInline }} inside for the gutter instead.
- CenterProps is removed; use ContainerProps instead.
- CircularProgress is removed; use Progress variant="circular" instead.
- CircularProgressProps is removed; use ProgressProps instead.
- Cluster is removed; use Stack direction="row" wrap="wrap" align="center" instead.
- ClusterProps is removed; use StackProps instead.
- Cover is removed; use Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh' }} around a Box style={{ marginBlock: 'auto' }} instead.
- Frame is removed; use Box style={{ aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: hds.borderRadius.md }} instead.
- IconButton is removed; use Button iconOnly label="…" iconLeft={\<Icon icon={…} />} instead.
- Each of these is removed; use ButtonProps instead: `IconButtonProps` and `ToggleButtonProps`.
- InputGroup is removed; use Input prefix / suffix instead.
- Each of these is removed; use InputProps instead: `InputGroupProps` and `TimeInputProps`.
- MultiSelector is removed; use Combobox multiple instead.
- MultiSelectorOption is removed; use ComboboxOption instead.
- MultiSelectorProps is removed; use ComboboxMultipleProps instead.
- SelectableCard is removed; use Card selectable selected onSelectedChange instead.
- SelectableCardProps is removed; use CardProps instead.
- TileGridProps is removed; use GridProps (minTileWidth is minItemWidth, gap 'sm' is 'medium') instead.
- TimeInput is removed; use Input type="time" instead.
- ToggleButton is removed; use Button pressed onPressedChange (variant="ghost" is variant="tertiary") instead.
- HDS no longer installs each of these, so add it to your own dependencies if your code imports it: `@radix-ui/react-aspect-ratio`, `@radix-ui/react-context-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-toggle`, `@radix-ui/react-toolbar`, `date-fns` and `react-day-picker`.
- An icon-only Button now takes its accessible name from label, unless it has an aria-label.
- Card selectable, which replaces SelectableCard, toggles on click or Space only, so code or tests that press Enter to toggle it must press Space instead.
- Combobox options now report their real position, and a Select with showLabel={false} is named by its label and value, so tests that find them by role and name may need updating.
- The open Select list and the Combobox popup now carry an accessible name, so tests that find them by role and name may need the new name.
- The manifest no longer has a health field, so manifest.health is now undefined.
- The rows inside PageHeader, FormActions, DataTableSection and DestructiveSection now carry data-hds-component="Stack" instead of "Cluster", so selectors and tests that look for Cluster there must change.

## 0.19.1

Released 2026-09-30 (patch). Smaller Button-only bundles for webpack and esbuild, and Storybook accessibility fixes; nothing for a consumer to change.

Nothing in this release asks anything of you.

## 0.19.0

Released 2026-09-30 (minor). Overlays portal into the nearest data-hds scope, compact density tightens spacing, containers share one radius; adds /icons.

### Looks different

- A Table with no density prop now follows the nearest data-density attribute, so a Table inside a compact region renders compact unless you pass density.
- Under compact density (data-density="compact", which HdsThemeProvider density="compact" and ThemeProvider's setDensity also set) the spacing scale, surface padding and region gutter that components read now tighten, so compact screens render visibly tighter than before.
- Surface, StatusTile, DocLinkCard, static.css's .hds-card and the .hds-soft-nav-card and .hds-sketchbook-canvas-stage classes now round to the tenant's container radius, 12px by default, instead of a fixed 8px.
- The dark theme (data-theme="dark" or the dark class, which HdsThemeProvider theme="dark" and ThemeProvider set) now declares color-scheme: dark, so native scrollbars and form controls inside it render dark.
- The scrim behind an open Dialog, AlertDialog or CommandPalette is now the theme-aware scrim color, black in dark mode where it was a white wash.

### Do by hand

- In development, a Button with iconOnly and no iconLeft now logs one warning, so a test that fails on console warnings will flag it.
- Overlays mount in the nearest data-hds element, not document.body, and take its theme, so check CSS or tests that query body: Dialog, AlertDialog, Menu, ContextMenu, Popover, Select, HoverCard, Tooltip, Lightbox, AssetImg, and the overlays of Combobox, MultiSelector, CommandPalette and date inputs.

## 0.18.0

Released 2026-09-30 (minor). Adds the hds-patterns-subpath codemod, which moves root imports of the deprecated pattern components to /patterns.

Nothing in this release asks anything of you.

## 0.17.0

Released 2026-09-30 (minor). Adds /patterns and the standard type ramp; root pattern imports, Hds\* names and seven spacing tokens are deprecated.

### Looks different

- Badge text grows from 11px to 12px, CommandPalette's kind badges, shortcuts and footer from 10px to 12px, and SegmentedControl labels shrink from 15px to 14px on a 20px line, now that they use the ramp's text-xs and text-sm.
- Calendar's days outside the shown month are no longer drawn at half opacity, so they read darker.
- A disabled Tokenizer shows muted text instead of fading the whole field to 70% opacity.
- Second-level headings (Text and HeadingStack heading2, and any h2 inside HdsThemeProvider or another data-hds element) keep their 30px size, but their line height drops from 42px to 40px.
- Elements with the hds-focus class, which many HDS components use (Dialog, Select, Radio, Toggle and Slider among them), now show their focus ring on every keyboard focus, where before it showed only if the page set data-input-modality="keyboard" on html, which no HDS code did.
- The highlighted option in Menu, Select, Combobox and MultiSelector now also shows an inset ring in the focus color.
- Text follows Tailwind's default type ramp, so body text renders at 16px instead of 17px, UI and button text 1px smaller, captions and eyebrows at 12px instead of 13px, mono at 14px instead of 13px, display at 60px instead of 72px, and text-xs to text-6xl shrink to match.

### Coming next

- Importing each of these from the package root still works but is deprecated; import it from @hirobius/design-system/patterns instead: `ActivityFeed`, `AppShell`, `AssetImg`, `Calendar`, `Carousel`, `CodeBlock`, `CommandPalette`, `DocLinkCard`, `ErrorPattern`, `FileInput`, `Form`, `Lightbox`, `NavItem`, `OverflowList`, `Page`, `Reveal`, `SideNav`, `Stepper`, `Toolbar`, `TopNav` and `TreeList`. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
- HdsCheckbox still works but is deprecated; use Checkbox, the same component under its bare name. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
- HdsRadio still works but is deprecated; use Radio, the same component under its bare name. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
- HdsSelect still works but is deprecated; use Select, the same component under its bare name. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
- HdsSlider still works but is deprecated; use Slider, the same component under its bare name. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
- HdsToggle still works but is deprecated; use Toggle, the same component under its bare name. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
- HdsTooltip still works but is deprecated; use Tooltip, the same component under its bare name. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
- The spacing token semantic.space.component.gap (--semantic-space-component-gap) still works but is deprecated; use semantic.space.scale.xs, the same 8px at the default density. Removed early, in [0.33.0](#0330) (planned for 1.0.0).
- The spacing token semantic.space.component.padding (--semantic-space-component-padding) still works but is deprecated; use semantic.space.surface.padding, which it now aliases. Removed early, in [0.33.0](#0330) (planned for 1.0.0).
- The spacing token semantic.space.layout.gutter (--semantic-space-layout-gutter) still works but is deprecated; use semantic.space.region.gutter, which it now aliases. Removed early, in [0.33.0](#0330) (planned for 1.0.0).
- The spacing token semantic.space.layout.inset (--semantic-space-layout-inset) still works but is deprecated; use semantic.space.scale.lg, the same 32px at the default density. Removed early, in [0.33.0](#0330) (planned for 1.0.0).
- The spacing token semantic.space.layout.normal (--semantic-space-layout-normal) still works but is deprecated; use semantic.space.scale.md, the same 24px at the default density. Removed early, in [0.33.0](#0330) (planned for 1.0.0).
- The spacing token semantic.space.layout.spacious (--semantic-space-layout-spacious) still works but is deprecated; use semantic.space.scale.xl, the same 48px at the default density. Removed early, in [0.33.0](#0330) (planned for 1.0.0).
- The spacing token semantic.space.layout.tight (--semantic-space-layout-tight) still works but is deprecated; use semantic.space.scale.sm, the same 16px at the default density. Removed early, in [0.33.0](#0330) (planned for 1.0.0).

### Do by hand

- AssetImg with alt text is now role img named by it, and one with neither alt nor onClick is hidden from assistive technology, so tests that find it by role or name may need updating.
- Card.Progress now carries an aria-label, its string label or "Progress", so tests that find it by role and name may need the new name.
- StepperField's label is now tied to its input, so the input is announced and found by its label text.
- Table now renders role table, row, columnheader and cell, wrapping each row in an element with display: contents, so selectors and tests that query its cells by role or by position in the DOM may need updating.
- OverflowList puts its +N item in a list item and names it with hidden text instead of aria-label, and MetadataList wraps its footer in a dt and dd pair, so tests that query that markup or the "+N more" label may need updating.
- Carousel's slide strip and StackedCardRail's scroll areas are now named regions that take keyboard focus, so each adds a Tab stop and tests that count Tab presses past them need one more.

## 0.16.0

Released 2026-09-26 (minor). Six unused typography tokens are removed and five docs-internal components are deprecated; adds HdsSelect at the root.

### Coming next

- Each of these is docs-internal and deprecated: it warns once and will leave the package, so stop importing it: `CinematicLink`, `ComponentInstanceMatrix`, `FoundationSwatch`, `Sketch` and `Token`. Removed early, in [0.20.0](#0200) (planned for 1.0.0).

### Do by hand

- Six unused typography tokens are removed (--primitive-typography-size-2xs, -weight-light, -weight-semibold, -letterSpacing-tighter, -wide and -wider); replace a var() that reads one with your own value.

## 0.15.0

Released 2026-09-23 (minor). Exports every component's props type and marks React bundles 'use client' for the Next.js App Router; nothing to change.

Nothing in this release asks anything of you.

## 0.14.0

Released 2026-09-23 (minor). TenantProvider takes the tenant as a slug prop, dev warnings fire in consumer builds, and types resolve under node16.

### Do by hand

- TenantProvider no longer reads VITE_TENANT_SLUG, which never worked once installed; pass the tenant as its slug prop, or it sets no data-brand or data-tenant attribute.

## 0.13.1

Released 2026-09-20 (patch). Manifest Figma links, package metadata and a tenant overlay CSS fix; nothing for a consumer to change.

Nothing in this release asks anything of you.

## 0.13.0

Released 2026-07-09 (minor). Adds the CSS-only static.css layer and stops Icon logging a console error for token sizes; nothing to change.

Nothing in this release asks anything of you.

## 0.12.0

Released 2026-07-08 (minor). Stat, Field and Card move to the shared tone set and InfoPage is removed; adds dozens of components, /brand and /scroll.

### Do by hand

- InfoPage and InfoPageProps are removed with no replacement; it was portfolio scaffolding, so delete the code that uses it.
- The StatTone and FieldTone types are removed; use StatProps\["tone"] and FieldProps\["tone"] instead.
- Twelve component families, such as HdsAlertDialog and HdsDateInput, lost their Hds prefix before any release shipped them, so import each by its bare name (AlertDialog, DateInput).
- Field no longer takes tone="default"; pass tone="neutral" or leave tone out, which renders the same.
- Stat no longer takes tone="default"; pass tone="neutral" or leave tone out, which renders the same.
- Card's tone prop is split in two: change tone="default" to variant="default" and tone="accent" to variant="accent"; tone="success", "warning" and "danger" stay as they are.
- Card.Progress and Card.Metric no longer take tone="default" or tone="accent"; pass tone="neutral", or leave tone out, for the old default look.
- lenis is a new optional peer dependency, needed only if you use SmoothScroll from the new @hirobius/design-system/scroll subpath.

## 0.11.0

Released 2026-07-04 (minor). Adds HdsTooltip, HdsThemeProvider with useHdsTheme, Textarea and a caption type style; nothing to change.

Nothing in this release asks anything of you.

## 0.10.0

Released 2026-07-02 (minor). The ./protocol subpath, the signed envelope of the retired Figma bridge, is removed.

### Do by hand

- The @hirobius/design-system/protocol subpath is removed; if your code imports it, copy protocol/envelope.mjs from the archive/figma-bridge branch into your own code.

<!-- Generated by scripts/upgrade/compile.mjs from upgrade/releases/*.json; do not edit. Run node scripts/upgrade/compile.mjs to regenerate. -->
