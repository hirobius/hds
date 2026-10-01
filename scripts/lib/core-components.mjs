/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The `core` rows of the hds#254 right-sizing table in
 * docs/hds-architecture-2026-09-18.html (ratified 2026-09-26, #297), with the
 * hds#315 renames applied: HdsCheckbox → Checkbox, HdsRadio → Radio,
 * HdsSelect → Select, HdsSlider → Slider, HdsToggle → Toggle. The table has 42
 * rows; ButtonGroup, ContextMenu and HoverCard were removed from the package in
 * 0.20.0 (hds#394), which leaves 39.
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
];
