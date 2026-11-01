/**
 * The checked/unchecked colour fade shared by Checkbox, Toggle and Radio (hds#751).
 *
 * motion/react cannot interpolate var(...) colour strings (hds#257), so the
 * background/border swap is a CSS transition. It reads the productive motion
 * token through its custom properties, which theme.css zeroes under
 * prefers-reduced-motion, so no JS reduced-motion branch is needed.
 */
export const CONTROL_COLOR_FADE =
  'background-color var(--hds-motion-productive-duration) var(--hds-motion-productive-easing), ' +
  'border-color var(--hds-motion-productive-duration) var(--hds-motion-productive-easing)';
