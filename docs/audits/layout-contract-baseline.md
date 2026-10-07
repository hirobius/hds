# Layout contract baseline

Warning report from `pnpm check:layout-contract` (warn mode) against current `main`. Contract: `docs/guardrails/layout-contract.json`. This is the fix list for the next wave. Regenerate with `pnpm check:layout-contract --md docs/audits/layout-contract-baseline.md`.

Probed 57 components, 77 violations.

## Violations per rule

| Rule               | Count |
| ------------------ | ----: |
| width              |     6 |
| height-stretch     |     4 |
| outer-margin       |    17 |
| nested-padding     |     5 |
| form-max-width     |     4 |
| form-sibling-width |     0 |
| overflow-390       |     3 |
| gap-off-scale      |    38 |

## Violations per component

### AssetImg

Story `primitives-asset-img--default`, probed element `div[Hero portfolio image]`

- **width**: declared hug, measured fill (480px of 480px, ratio 1.00)
- **overflow-390**: content overflows a 390px viewport by 47px

### AvatarGroup

Story `primitives-avatar-group--default`, probed element `div.flex.items-center`

- **width**: declared hug, measured fill (480px of 480px, ratio 1.00)
- **outer-margin**: span.relative.inline-flex.shrink-0 has margin 0px 0px 0px -8px
- **outer-margin**: span.relative.inline-flex.shrink-0 has margin 0px 0px 0px -8px

### Breadcrumb

Story `primitives-breadcrumb--default`, probed element `nav.w-full[Breadcrumb]`

- **width**: declared hug, measured fill (480px of 480px, ratio 1.00)

### Card

Story `primitives-card--default`, probed element `div.flex.h-full.flex-col`

- **height-stretch**: height 800px equals the 800px parent while content is 92px
- **nested-padding**: div.flex.flex-col.space-y-1.5 is padded directly inside padded div.flex.h-full.flex-col
- **nested-padding**: div.px-6.pb-2 is padded directly inside padded div.flex.h-full.flex-col
- **nested-padding**: div.p-6.pt-0 is padded directly inside padded div.flex.h-full.flex-col
- **nested-padding**: div.flex.flex-col.px-6 is padded directly inside padded div.flex.h-full.flex-col

### Checkbox

Story `primitives-checkbox--default`, probed element `label.relative.inline-flex.items-center`

- **gap-off-scale**: label.relative.inline-flex.items-center has gap row-gap 4px
- **gap-off-scale**: label.relative.inline-flex.items-center has gap column-gap 4px

### Combobox

Story `primitives-combobox--default`, probed element `button.hds-focus.flex.h-10[HDS component]`

- **form-max-width**: 1200px wide in a wide parent, max is 40rem

### Disclosure

Story `primitives-disclosure--panel`, probed element `div.box-border.h-full.border-none`

- **height-stretch**: height 800px equals the 800px parent while content is 64px
- **gap-off-scale**: button.hds-focus.flex.w-full has gap row-gap 20px
- **gap-off-scale**: button.hds-focus.flex.w-full has gap column-gap 20px

### EmptyState

Story `primitives-empty-state--default`, probed element `div.flex.flex-col.gap-1`

- **gap-off-scale**: div.flex.flex-col.gap-1 has gap row-gap 4px
- **gap-off-scale**: div.flex.flex-col.gap-1 has gap column-gap 4px

### Field

Story `primitives-field--default`, probed element `div.flex.flex-col.gap-1`

- **gap-off-scale**: div.flex.flex-col.gap-1 has gap row-gap 4px
- **gap-off-scale**: div.flex.flex-col.gap-1 has gap column-gap 4px

### Form

Story `patterns-form--default`, probed element `form.flex.flex-col.gap-4`

- **overflow-390**: content overflows a 390px viewport by 34px

### InlineLink

Story `primitives-inline-link--default`, probed element `a.hds-focus.hds-link`

- **outer-margin**: svg has margin 0px 0px 1px 2px

### Input

Story `primitives-input--default`, probed element `div.flex.flex-col.gap-1.5`

- **gap-off-scale**: div.flex.flex-col.gap-1.5 has gap row-gap 6px
- **gap-off-scale**: div.flex.flex-col.gap-1.5 has gap column-gap 6px
- **form-max-width**: 1200px wide in a wide parent, max is 40rem

### MetadataList

Story `patterns-metadata-list--default`, probed element `dl.flex.flex-col.gap-3`

- **gap-off-scale**: dl.flex.flex-col.gap-3 has gap row-gap 12px
- **gap-off-scale**: dl.flex.flex-col.gap-3 has gap column-gap 12px
- **gap-off-scale**: div.flex.flex-col.gap-0.5 has gap row-gap 2px
- **gap-off-scale**: div.flex.flex-col.gap-0.5 has gap column-gap 2px
- **gap-off-scale**: div.flex.flex-col.gap-0.5 has gap row-gap 2px
- **gap-off-scale**: div.flex.flex-col.gap-0.5 has gap column-gap 2px
- **gap-off-scale**: div.flex.flex-col.gap-0.5 has gap row-gap 2px
- **gap-off-scale**: div.flex.flex-col.gap-0.5 has gap column-gap 2px

### MetricTiles

Story `patterns-metrictiles--three-tiles`, probed element `div`

- **outer-margin**: p has margin 0px 0px 6px 0px
- **outer-margin**: p has margin 4px 0px 0px 0px
- **outer-margin**: p has margin 0px 0px 6px 0px
- **outer-margin**: p has margin 4px 0px 0px 0px
- **outer-margin**: p has margin 0px 0px 6px 0px
- **outer-margin**: p has margin 4px 0px 0px 0px

### Page

Story `layout-page--default`, probed element `div`

- **nested-padding**: div.box-border.h-full.border-none is padded directly inside padded div

### Pagination

Story `primitives-pagination--default`, probed element `nav.w-full[Pagination]`

- **width**: declared hug, measured fill (480px of 480px, ratio 1.00)
- **gap-off-scale**: ul.flex.flex-wrap.items-center has gap row-gap 4px
- **gap-off-scale**: ul.flex.flex-wrap.items-center has gap column-gap 4px

### Radio

Story `primitives-radio--default`, probed element `label.relative.inline-flex.items-center`

- **gap-off-scale**: label.relative.inline-flex.items-center has gap row-gap 4px
- **gap-off-scale**: label.relative.inline-flex.items-center has gap column-gap 4px

### SegmentedControl

Story `primitives-segmented-control--primary`, probed element `div.inline-flex.max-w-full.flex-col`

- **gap-off-scale**: div.flex.max-w-full.items-stretch[View] has gap row-gap 4px
- **gap-off-scale**: div.flex.max-w-full.items-stretch[View] has gap column-gap 4px
- **gap-off-scale**: button.hds-focus.relative.m-0 has gap row-gap 1px
- **gap-off-scale**: button.hds-focus.relative.m-0 has gap column-gap 1px
- **gap-off-scale**: button.hds-focus.relative.m-0 has gap row-gap 1px
- **gap-off-scale**: button.hds-focus.relative.m-0 has gap column-gap 1px
- **gap-off-scale**: button.hds-focus.relative.m-0 has gap row-gap 1px
- **gap-off-scale**: button.hds-focus.relative.m-0 has gap column-gap 1px

### Select

Story `primitives-select--default`, probed element `div.flex.flex-col`

- **outer-margin**: span#:r2d:.text-secondary has margin 0px 0px 8px 0px
- **form-max-width**: 1200px wide in a wide parent, max is 40rem

### Skeleton

Story `primitives-skeleton--default`, probed element `div.hds-skeleton.block.rounded-md`

- **width**: declared hug, measured fill (480px of 480px, ratio 1.00)

### Stat

Story `primitives-stat--default`, probed element `div.flex.flex-col.gap-0.5`

- **width**: declared hug, measured fill (480px of 480px, ratio 1.00)
- **gap-off-scale**: div.flex.flex-col.gap-0.5 has gap row-gap 2px
- **gap-off-scale**: div.flex.flex-col.gap-0.5 has gap column-gap 2px

### StatusListItem

Story `primitives-status-list-item--default`, probed element `div.flex.items-start.gap-3`

- **outer-margin**: span.mt-1.5.h-2.w-2 has margin 6px 0px 0px 0px
- **gap-off-scale**: div.flex.items-start.gap-3 has gap row-gap 12px
- **gap-off-scale**: div.flex.items-start.gap-3 has gap column-gap 12px

### StatusTile

Story `primitives-status-tile--default`, probed element `div.flex.h-full.items-start`

- **height-stretch**: height 800px equals the 800px parent while content is 72px
- **outer-margin**: p.m-0.mt-1.text-xs has margin 4px 0px 0px 0px

### Surface

Story `primitives-surface--default`, probed element `div.box-border.h-full.border-none`

- **height-stretch**: height 800px equals the 800px parent while content is 72px

### Tabs

Story `primitives-tabs--default`, probed element `div`

- **outer-margin**: div.flex.h-10.items-center has margin 0px 0px 24px 0px
- **outer-margin**: button#radix-:rg:-trigger-overview.relative.-mb-px.inline-flex has margin 0px 0px -1px 0px
- **outer-margin**: button#radix-:rg:-trigger-props.relative.-mb-px.inline-flex has margin 0px 0px -1px 0px
- **outer-margin**: button#radix-:rg:-trigger-usage.relative.-mb-px.inline-flex has margin 0px 0px -1px 0px
- **outer-margin**: div#radix-:rg:-content-overview.bg-accent/5.rounded-b-md.p-6 has margin -24px 0px 0px 0px
- **overflow-390**: content overflows a 390px viewport by 130px

### Textarea

Story `primitives-textarea--default`, probed element `div.flex.flex-col.gap-1.5`

- **gap-off-scale**: div.flex.flex-col.gap-1.5 has gap row-gap 6px
- **gap-off-scale**: div.flex.flex-col.gap-1.5 has gap column-gap 6px
- **form-max-width**: 1200px wide in a wide parent, max is 40rem

### Toggle

Story `primitives-toggle--default`, probed element `label.relative.inline-flex.items-center`

- **gap-off-scale**: label.relative.inline-flex.items-center has gap row-gap 4px
- **gap-off-scale**: label.relative.inline-flex.items-center has gap column-gap 4px

## Raw Tailwind spacing (`pnpm check:spacing-scale`)

135 raw numeric spacing classes in 27 files: 62 off-scale (px value not 8/16/24/32/48), 73 raw-numeric (on a step but fixed, ignores density).

Most common: `gap-2` x15, `px-2` x9, `p-6` x7, `px-3` x7, `gap-1` x6, `gap-3` x5, `space-y-1.5` x4, `py-2` x4, `py-1.5` x4, `pl-2` x4, `p-4` x4, `gap-4` x3.

| File                                    | Off-scale | Raw numeric |
| --------------------------------------- | --------: | ----------: |
| src/app/components/input.tsx            |        17 |          11 |
| src/app/components/combobox.tsx         |         9 |           7 |
| src/app/components/card.tsx             |         3 |           8 |
| src/app/components/menu.tsx             |         5 |           5 |
| src/app/components/metadata-list.tsx    |         4 |           3 |
| src/app/components/select.tsx           |         3 |           4 |
| src/app/components/tabs.tsx             |         1 |           5 |
| src/app/components/toast.tsx            |         2 |           4 |
| src/app/components/alert-dialog.tsx     |         1 |           4 |
| src/app/components/button.tsx           |         1 |           4 |
| src/app/components/dialog.tsx           |         1 |           4 |
| src/app/components/kbd.tsx              |         2 |           1 |
| src/app/components/status-tile.tsx      |         2 |           1 |
| src/app/components/textarea.tsx         |         2 |           1 |
| src/app/components/avatar-group.tsx     |         0 |           2 |
| src/app/components/blockquote.tsx       |         0 |           2 |
| src/app/components/breadcrumb.tsx       |         0 |           2 |
| src/app/components/form.tsx             |         0 |           2 |
| src/app/components/hds-tooltip.tsx      |         1 |           1 |
| src/app/components/pagination.tsx       |         1 |           1 |
| src/app/components/status-list-item.tsx |         2 |           0 |
| src/app/components/alert.tsx            |         1 |           0 |
| src/app/components/empty-state.tsx      |         1 |           0 |
| src/app/components/field.tsx            |         1 |           0 |
| src/app/components/form-actions.tsx     |         1 |           0 |
| src/app/components/popover.tsx          |         0 |           1 |
| src/app/components/stat.tsx             |         1 |           0 |
