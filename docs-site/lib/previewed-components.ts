/**
 * Core components that have a live demo in components/component-demos.tsx.
 * The demo registry is typed against this list, so a name cannot be listed
 * here without a demo (or vice versa). Components not listed render a "no live
 * preview yet" note on their generated page instead of a broken demo.
 */
export const PREVIEWED_COMPONENTS = [
  'Button',
  'Input',
  'Select',
  'Checkbox',
  'Dialog',
  'Menu',
  'Table',
  'MetricTiles',
] as const;

export type PreviewedComponent = (typeof PREVIEWED_COMPONENTS)[number];
