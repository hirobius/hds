/**
 * The `core` rows of the hds#254 right-sizing table in
 * docs/hds-architecture-2026-09-18.html (ratified 2026-09-26, #297), with the
 * hds#315 renames applied: HdsCheckbox → Checkbox, HdsRadio → Radio,
 * HdsSelect → Select, HdsSlider → Slider, HdsToggle → Toggle. The table has 42
 * rows; ButtonGroup, ContextMenu and HoverCard were removed from the package in
 * 0.20.0 (hds#394), which leaves 39. hds#393 adds Menu, Popover, Tooltip and
 * HdsRouterProvider, each with a usage contract (and Menu, Popover and Tooltip
 * a keyboard contract), which makes 43.
 *
 * THE ONLY FILE THAT LISTS THE CORE SET. It lives in mcp/ because mcp/ ships in
 * the package and scripts/ does not; scripts/lib/core-components.mjs re-exports it,
 * mcp/guide.mjs builds the recommended set on it, and the manifest `core` flag,
 * llms.txt, SKILL.md and the README are generated from it
 * (scripts/__tests__/core-set-sources.test.mjs fails on any disagreement).
 *
 * This is not the manifest `tier` field: 5 core components are `tier: pattern`
 * and most `tier: primitive` components are not core. Read by
 * scripts/check-contract-coverage.mjs.
 */
export const CORE_COMPONENTS = [
  'Combobox',
  'Checkbox',
  'Radio',
  'Select',
  'Slider',
  'Toggle',
  'Input',
  'SegmentedControl',
  'Tag',
  'Textarea',
  'Box',
  'Container',
  'Disclosure',
  'Divider',
  'Grid',
  'Stack',
  'Surface',
  'Avatar',
  'Card',
  'EmptyState',
  'Field',
  'Icon',
  'Kbd',
  'Table',
  'Breadcrumb',
  'InlineLink',
  'Pagination',
  'Tabs',
  'Alert',
  'Badge',
  'Progress',
  'Skeleton',
  'Spinner',
  'ToastProvider',
  'Button',
  'Dialog',
  'Text',
  'HdsThemeProvider',
  'VisuallyHidden',
  // hds#393 step 7
  'Menu',
  'Popover',
  'Tooltip',
  'HdsRouterProvider',
];
