# Exception Audit Report

## Summary

| Category | Count | Justified | Untriaged |
|----------|-------|-----------|----------|
| eslint-disable | 90 | 90 | 0 |
| @ts-ignore/@ts-expect-error | 10 | 10 | 0 |
| custom-sentinels (*-ok / hds-bypass) | 40 | 40 | 0 |
| **Total** | **140** | **140** | **0** |

## eslint-disable

| File | Line | Rule | Reason | Status |
|------|------|------|--------|--------|
| `src/app/components/activity-feed.tsx` | 99 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- info's accent-rest token has no matching Tailwind-theme utility (text-feedback-info binds to a different var); var()-based so still token-driven` | justified |
| `src/app/components/activity-feed.tsx` | 113 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- semantic-size-avatar/radius-full/surface-raised tokens have no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/alert.tsx` | 24 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven gap/padding/radius; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/alert.tsx` | 93 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- semantic subgrid-hairline gap; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/animated-label.tsx` | 54 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- compound transition list; no Tailwind utility covers multi-prop animation` | justified |
| `src/app/components/asset-img.tsx` | 98 | `eslint-disable-next-line` | `jsx-a11y/no-noninteractive-element-interactions` | justified |
| `src/app/components/badge.tsx` | 16 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- component-badge-* sizing tokens and the neutral 4% overlay have no Tailwind-theme utility; var()-based so still token-driven. text-xs matches component.badge.fontSize (primitive.typography.size.xs, hds#283: 12px).` | justified |
| `src/app/components/button.tsx` | 18 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- compound transition list; Tailwind has no single utility for transition-[colors,filter]` | justified |
| `src/app/components/callout.tsx` | 24 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven padding + accent/surface vars have no Tailwind-theme utility` | justified |
| `src/app/components/card.tsx` | 102 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- border-accent/feedback border colors have no dedicated Tailwind border-color utility name; var()-based so still token-driven` | justified |
| `src/app/components/checkbox.tsx` | 31 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven spacing/radius/color; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/checkbox.tsx` | 63 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven size/radius/border/color; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/code-block.tsx` | 7 | `eslint-disable*` | `jsx-a11y/no-noninteractive-tabindex -- scrollable code region requires tabIndex for keyboard navigation` | justified |
| `src/app/components/code-block.tsx` | 25 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- border-default/surface-raised/radius-action tokens have no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/code-block.tsx` | 30 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- subgrid-gap/component-gap spacing + semantic-size-control-lg + border/surface/radius tokens have no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/code-block.tsx` | 35 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- component-padding/subgrid-gap spacing + border-default token have no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/code-block.tsx` | 40 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- component-gap spacing token has no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/code-block.tsx` | 43 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- component-padding/component-gap spacing + content-primary token + mono typography composite have no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/code-block.tsx` | 48 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- border-default token has no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/code-block.tsx` | 53 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- motion.productive.duration token has no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/code-block.tsx` | 67 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- subgrid-gap/component-gap spacing + radius-action + border-default/surface-raised tokens + motion.productive.duration have no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/code-block.tsx` | 83 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- mono typography composite + content-primary token have no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/code-block.tsx` | 97 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- mono typography composite + content-primary token have no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/code-block.tsx` | 102 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- section-stack spacing + semantic-size-control-lg + role-muted/surface-raised tokens have no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/code-block.tsx` | 264 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- content-secondary token has no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/code-block.tsx` | 268 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- content-secondary token has no matching Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/combobox.tsx` | 159 | `eslint-disable-next-line` | `jsx-a11y/no-autofocus -- combobox search field is the expected focus target on open` | justified |
| `src/app/components/command-palette.tsx` | 193 | `eslint-disable-next-line` | `jsx-a11y/no-autofocus` | justified |
| `src/app/components/command-palette.tsx` | 214 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- dialog results scroll cap at 60% viewport height` | justified |
| `src/app/components/disclosure.tsx` | 28 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- sidebar/component-nav/surface/radius tokens have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/disclosure.tsx` | 147 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- subgrid gap token has no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/disclosure.tsx` | 160 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- icon-size token has no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/divider.tsx` | 18 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- border-default/border-strong have no named Tailwind color utility (only the generic `border` role token is mapped); var()-based so still token-driven` | justified |
| `src/app/components/doc-link-card.tsx` | 49 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven padding; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/doc-link-card.tsx` | 199 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven gap; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/doc-page-header.tsx` | 280 | `eslint-disable-next-line` | `react-hooks/refs -- `ref` is a string prop (git branch), not a React ref` | justified |
| `src/app/components/hds-tooltip.tsx` | 63 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- inverse-surface fill matches the bubble; var()-based` | justified |
| `src/app/components/heading-stack.tsx` | 30 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- semantic space/typography tokens have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/heading-stack.tsx` | 43 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- semantic typography composite tokens (font-size/font-weight/line-height/letter-spacing) have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/health-rail.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |
| `src/app/components/history-card.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |
| `src/app/components/inline-code.tsx` | 23 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- mono typography composite + subgrid/badge tokens have no named Tailwind utility; var()-based so still token-driven` | justified |
| `src/app/components/lab/legacy-token-detail.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |
| `src/app/components/nav-group.tsx` | 33 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- --semantic-color-content-secondary has no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/nav-group.tsx` | 87 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/components/nav-item.tsx` | 36 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- --primitive-size-interactive-min a11y touch target + --semantic-color-* state tokens have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/nav-item.tsx` | 66 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- --semantic-borderWidth-emphasis indicator width + --semantic-color-border-* state tokens have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/preview-frame.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |
| `src/app/components/radio.tsx` | 46 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven gap; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/radio.tsx` | 73 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven size/radius/border; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/radio.tsx` | 119 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven size/radius/color; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/segmented-control.tsx` | 29 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- semantic space/radius/border tokens have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/segmented-control.tsx` | 43 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- rail border/radius/gap are semantic tokens with no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/segmented-control.tsx` | 68 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- segment button color/spacing/motion tokens have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/segmented-control.tsx` | 151 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- indicator background/ring colors are semantic tokens with no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/segmented-control.tsx` | 239 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- description text is the semantic caption composite (12px/16px/medium) plus content-* color tokens; no Tailwind-theme utility` | justified |
| `src/app/components/segmented-control.tsx` | 267 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- outline width/offset/color are semantic tokens with no Tailwind-theme utility` | justified |
| `src/app/components/segmented-control.tsx` | 285 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- zIndex.focus token + 60ch max-width have no Tailwind-theme utility; var()-based so still token-driven. font-size/line-height now ramp-driven (text-sm/leading-5).` | justified |
| `src/app/components/segmented-control.tsx` | 364 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- 60ch max-width + content-primary color have no Tailwind-theme utility; var()-based so still token-driven. font-size/line-height now ramp-driven (text-sm/leading-5, hds#283: was 15px/24px).` | justified |
| `src/app/components/shell-controls.tsx` | 151 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/components/side-nav.tsx` | 56 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- --primitive-size-interactive-min a11y touch target + --component-nav-paddingY level spacing + --semantic-color-* state tokens have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/slider.tsx` | 42 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven gap; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/slider.tsx` | 44 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven gap; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/slider.tsx` | 68 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven height; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/slider.tsx` | 73 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven inset/height/color; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/slider.tsx` | 85 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven radius/color; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/slider.tsx` | 102 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven accent-color/z-index; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/stepper-field.tsx` | 60 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/components/surface.tsx` | 37 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven radius/padding/elevation; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/table.tsx` | 21 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- component-density paddingY/minHeight + sticky-header offset tokens have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/table.tsx` | 46 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- component-density paddingY/minHeight + row-divider border tokens have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/tag.tsx` | 26 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- 44px min interactive hit target has no semantic Tailwind size utility; var()-based so still token-driven` | justified |
| `src/app/components/tag.tsx` | 35 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- component-tag-* sizing/radius tokens have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/text-lockup.tsx` | 42 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- component/subgrid gap composite tokens have no Tailwind-theme spacing utility; var()-based so still token-driven` | justified |
| `src/app/components/text.tsx` | 32 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- semantic typography composite tokens (font-family/size/weight/letter-spacing/line-height/max-width/text-transform) have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/tile-grid.tsx` | 35 | `eslint-disable-next-line` | `no-restricted-syntax -- TileGrid IS the grid primitive; auto-fill template is its raison d'être` | justified |
| `src/app/components/toggle.tsx` | 47 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven spacing/radius/color; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/toggle.tsx` | 98 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven size/radius/border/padding; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/toggle.tsx` | 145 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven size/radius/color; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/token.tsx` | 25 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- component-button-secondary-* / semantic-radius-action / primitive-space-* tokens have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/token.tsx` | 73 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- subgrid gap token has no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/token.tsx` | 91 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- mono technical-typography composite (13px/1/regular/mono-family) + direction/overflow-wrap + content-* colors have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/tokenizer.tsx` | 83 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- --primitive-size-interactive-minCompact WCAG 2.2 AA (2.5.8) compact hit target; no Tailwind-theme utility, var()-based so still token-driven` | justified |
| `src/app/context/__tests__/context.test.tsx` | 17 | `eslint-disable-next-line` | `@typescript-eslint/no-explicit-any` | justified |
| `src/stories/field.stories.tsx` | 141 | `eslint-disable-next-line` | `no-restricted-syntax -- story demo: a raw grid is the point of the layout showcase` | justified |
| `src/stories/patterns-scroll.stories.tsx` | 11 | `eslint-disable*` | `no-restricted-syntax -- story fixtures use raw grid/flex to showcase the primitives` | justified |
| `src/stories/pin.stories.tsx` | 6 | `eslint-disable*` | `no-restricted-syntax -- story fixtures use raw grid to showcase the primitive` | justified |
| `src/stories/reveal.stories.tsx` | 7 | `eslint-disable*` | `no-restricted-syntax -- story fixtures use raw grid/flex to showcase the primitive` | justified |
| `src/stories/status-tile.stories.tsx` | 115 | `eslint-disable-next-line` | `no-restricted-syntax -- story demo: a raw 2-col grid is the dashboard layout being shown` | justified |
| `src/stories/surface.stories.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |

## @ts-ignore/@ts-expect-error

| File | Line | Rule | Reason | Status |
|------|------|------|--------|--------|
| `src/app/components/box-sx.test.ts` | 268 | `@ts-expect-error` | `— simulate an SSR environment where `document` is undefined.` | justified |
| `src/app/components/combobox.test.tsx` | 13 | `@ts-expect-error` | `— minimal jsdom polyfills for Radix/Floating-UI.` | justified |
| `src/app/components/date-input.test.tsx` | 18 | `@ts-expect-error` | `— minimal jsdom polyfills for Radix Popover.` | justified |
| `src/app/components/date-input.test.tsx` | 27 | `@ts-expect-error` | `— partial matchMedia stub.` | justified |
| `src/app/components/date-time-input.test.tsx` | 19 | `@ts-expect-error` | `— minimal jsdom polyfills for Radix Popover.` | justified |
| `src/app/components/date-time-input.test.tsx` | 28 | `@ts-expect-error` | `— partial matchMedia stub.` | justified |
| `src/app/components/menu.test.tsx` | 13 | `@ts-expect-error` | `— minimal jsdom polyfills for Radix/Floating-UI.` | justified |
| `src/app/components/popover.test.tsx` | 13 | `@ts-expect-error` | `— minimal jsdom polyfills for Radix/Floating-UI.` | justified |
| `src/app/components/toast.test.tsx` | 12 | `@ts-expect-error` | `— minimal jsdom polyfills for Radix Toast.` | justified |
| `src/app/components/toast.test.tsx` | 19 | `@ts-expect-error` | `— partial matchMedia stub.` | justified |

## custom-sentinels (*-ok / hds-bypass)

| File | Line | Rule | Reason | Status |
|------|------|------|--------|--------|
| `src/app/components/box-sx.test.ts` | 49 | `spacing-ok` | `token-scale index, not a raw px value` | justified |
| `src/app/components/card.tsx` | 336 | `hds-bypass` | `INLINE_THIN_BAR — Card.Progress IS the progress bar primitive; height + token-bg is its raison d'être */` | justified |
| `src/app/components/command-palette.tsx` | 225 | `audit-ok` | `hds-focus is baked into cmdkRowVariants() base class above` | justified |
| `src/app/components/disclosure.tsx` | 137 | `audit-ok` | `hds-focus applied via triggerClassName variable` | justified |
| `src/app/components/doc-link-card.tsx` | 125 | `audit-ok` | `hds-focus is baked into docLinkCardVariants() base class above` | justified |
| `src/app/components/foundation-swatch.tsx` | 176 | `hds-bypass` | `fixed specimen height keeps foundation swatches visually comparable across token demos` | justified |
| `src/app/components/image-lightbox.tsx` | 112 | `audit-ok` | `Radix Dialog.Content container (tabIndex=-1, auto-focused on open). The dialog surface intentionally shows no focus ring; the visible focus affordance is the Close button (Button → hds-focus).` | justified |
| `src/app/components/nav-item.tsx` | 249 | `audit-ok` | `focus ring driven by the state-keyed cva `focus` branch (outline utilities above), not a literal hds-focus/focus-visible: substring — see ADR-015 useFocusVisible` | justified |
| `src/app/components/nav-item.tsx` | 269 | `audit-ok` | `focus ring driven by the state-keyed cva `focus` branch (outline utilities above), not a literal hds-focus/focus-visible: substring — see ADR-015 useFocusVisible` | justified |
| `src/app/components/side-nav.tsx` | 260 | `audit-ok` | `focus ring driven by the state-keyed cva `focus` branch (outline utilities above), not a literal hds-focus/focus-visible: substring — see ADR-015 useFocusVisible` | justified |
| `src/app/components/side-nav.tsx` | 284 | `audit-ok` | `focus ring driven by the state-keyed cva `focus` branch (outline utilities above), not a literal hds-focus/focus-visible: substring — see ADR-015 useFocusVisible` | justified |
| `src/app/components/sketch-controls.tsx` | 29 | `audit-ok` | `hds-focus applied via textarea className` | justified |
| `src/app/components/stacked-card-rail.tsx` | 54 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 66 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 67 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 83 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 126 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 127 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 168 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 169 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 174 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 175 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/surface.tsx` | 44 | `spacing-ok` | `16px/24px are the surface's fixed inset contract (not layout spacing); kept as the legacy values these named options have always resolved to` | justified |
| `src/app/components/text-lockup.tsx` | 9 | `font-ok` | `inline technical affordances within this lockup intentionally use monospace for code-like references` | justified |
| `src/app/data/hdsEditorial.tsx` | 55 | `audit-ok` | `*/) now supported. Self-healing policy documented: new violation classes must be added to script in same commit as fix.' },` | justified |
| `scripts/__tests__/build-token-index.test.mjs` | 262 | `audit-ok` | `hardcoded because WebGL shader constants` | justified |
| `scripts/__tests__/build-token-index.test.mjs` | 273 | `audit-ok` | `first reason\nconst a = 1;\n// audit-ok: second reason\n`;` | justified |
| `scripts/__tests__/build-token-index.test.mjs` | 286 | `audit-ok` | `reason with leading space  \n';` | justified |
| `scripts/audit-component-integrity.mjs` | 144 | `audit-ok` | `')) continue;` | justified |
| `scripts/audit-component-integrity.mjs` | 145 | `audit-ok` | `')) continue;` | justified |
| `scripts/audit-tokens.mjs` | 606 | `audit-ok` | `reason */ or /* hds-bypass: reason */ or /* spacing-ok: reason */` | justified |
| `scripts/audit-tokens.mjs` | 606 | `hds-bypass` | `reason */ or /* spacing-ok: reason */` | justified |
| `scripts/build-token-index.mjs` | 181 | `audit-ok` | `reason` comments in a file's content.` | justified |
| `scripts/check-focus-states.mjs` | 74 | `audit-ok` | `')) continue;` | justified |
| `scripts/check-focus-states.mjs` | 108 | `audit-ok` | `')) continue;` | justified |
| `scripts/check-hardcoded-spacing.mjs` | 27 | `spacing-ok` | `reason  (explicit exemption)` | justified |
| `scripts/check-source-canon.mjs` | 103 | `hds-bypass` | `CODE1, CODE2, ... */` | justified |
| `scripts/check-source-canon.mjs` | 108 | `font-ok` | `...          — file intentionally uses bold/heavy weights` | justified |
| `scripts/check-source-canon.mjs` | 140 | `hds-bypass` | `CODE1, CODE2 */ using codes from: ${[...ALL_RULE_CODES].join(', ')}\n`,` | justified |
| `scripts/check-typography-discipline.mjs` | 299 | `audit-ok` | `are intentional.` | justified |

## Summary Stats

- **Total suppressions:** 140
- **Justified (reason >= 10 chars):** 140
- **Untriaged (reason < 10 chars or missing):** 0

Scope reduced to inventory-only — resolution of untriaged suppressions deferred to follow-up units.
