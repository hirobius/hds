/**
 * ThemeToggle — one button that switches light and dark, with a sun that morphs into a moon (Actions).
 * @category Actions
 * @tier primitive
 * @usage A single header or menu control to switch between the light and dark theme.
 * @whenNot Choosing between three or more modes, or a setting that belongs in a form.
 * @useInstead SegmentedControl for a labelled choice of several modes
 * @doc-exempt: demo lives in docs-site/components/component-demos.tsx
 *
 * Reads and sets the theme through ThemeContext (`useTheme`): it follows the OS
 * until the user picks, then the pick is remembered and `data-theme` on `<html>`
 * carries it. Pass `isDark` and `onToggle` to drive it from your own theme state
 * instead (for example next-themes). The icon is an inline SVG: in light the
 * rays are out and the disc is a sun; in dark the rays retract and a mask slides
 * in to cut the disc into a crescent. The morph runs on HDS motion tokens only
 * and stops under `prefers-reduced-motion`. Styles: `.hds-theme-toggle` in theme.css.
 * @a11y component required a11y:theme-toggle.name The accessible name says what happens next ("Switch to dark theme" or "Switch to light theme"), and the state is not repeated as aria-pressed.
 * @a11y component required a11y:theme-toggle.keyboard-activate Tab reaches it, and Enter and Space both switch the theme.
 * @a11y component required a11y:theme-toggle.icon-hidden The sun and moon svg is hidden from assistive technology and takes no focus.
 * @a11y component required a11y:theme-toggle.focus-ring Keyboard focus draws the hds-focus ring, and the control never removes its outline.
 * @a11y component required a11y:theme-toggle.target-size The touch target is at least 44px square.
 * @a11y component required a11y:theme-toggle.reduced-motion The morph moves only on motion tokens and stops under prefers-reduced-motion.
 * @a11y consumer required Place it where a keyboard user finds it early (the header), and keep one per page; the name already says the next theme, so do not add a visible label that contradicts it.
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../context/ThemeContext';

/** Props for {@link ThemeToggle}. */
export interface ThemeToggleProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'onClick' | 'style' | 'type' | 'aria-label' | 'aria-pressed'
> {
  /** Whether the dark theme is on. Omit to read it from ThemeContext. */
  isDark?: boolean;
  /** Called when the user activates the button. Omit to switch through ThemeContext. */
  onToggle?: () => void;
  /** Class hook for the button. */
  className?: string;
}

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * One-button light/dark switch with a sun-to-moon morph.
 * @public
 */
export const ThemeToggle = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, ThemeToggleProps>(
  function ThemeToggle({ isDark, onToggle, className, ...rest }, ref) {
    const theme = useTheme();
    const dark = isDark ?? theme.isDark;
    const maskId = `hds-theme-toggle-${React.useId().replace(/:/g, '')}`;

    return (
      <button
        {...rest}
        ref={ref}
        type="button"
        aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
        data-theme-state={dark ? 'dark' : 'light'}
        className={cn('hds-theme-toggle hds-focus', className)}
        onClick={onToggle ?? theme.toggleDark}
      >
        <svg
          className="hds-theme-toggle__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <mask id={maskId}>
            <rect x="0" y="0" width="24" height="24" fill="white" />
            <circle className="hds-theme-toggle__cut" cx="25" cy="0" r="7.5" fill="black" />
          </mask>
          <circle
            className="hds-theme-toggle__core"
            cx="12"
            cy="12"
            r="6"
            fill="currentColor"
            mask={`url(#${maskId})`}
          />
          <g
            className="hds-theme-toggle__rays"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {RAYS.map((deg) => (
              <line
                key={deg}
                x1="12"
                y1="1.5"
                x2="12"
                y2="3.5"
                transform={`rotate(${deg} 12 12)`}
              />
            ))}
          </g>
        </svg>
      </button>
    );
  },
);
