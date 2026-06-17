// motion-ok: structural page footer — anchor link hovers handled by CSS
/**
 * PageFooter — minimal page footer rendered by the route shell.
 * @category Layout
 * @tier utility
 *
 * Currently houses a binary light/dark theme toggle on the left, with the
 * footer owning its own bottom breathing room so the toggle never pins to
 * the viewport edge. Add elements here as the page footer grows — keeping
 * the shape in one place so every HDSLayout-mounted page gets a consistent
 * footer surface without per-page rendering.
 *
 * @doc-exempt — internal route-shell scaffolding, not a public authoring primitive.
 */

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import hds from '../design-system/tokens';
import { IconButton } from './icon-button';

export function PageFooter() {
  const { isDark, toggleDark } = useTheme();
  return (
    <footer
      data-hds-component="PageFooter"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        paddingBottom: hds.semantic.space.section.stack,
      }}
    >
      <IconButton
        onClick={toggleDark}
        icon={isDark ? Sun : Moon}
        label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        size="lg"
        variant="secondary"
      />
    </footer>
  );
}
