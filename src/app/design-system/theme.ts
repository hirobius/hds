/**
 * Hirobius Design System - runtime theme resolver.
 *
 * ct(isDark) returns a computed colour object built entirely from hds tokens.
 * Import this wherever you need resolved colours for a given dark/light mode.
 *
 * Usage:
 *   import { ct } from '../design-system/theme';
 *   const t = ct(isDark);
 *   // t.bg, t.content, t.accent, etc.
 */

import hds from './tokens';

export function ct(isDark: boolean) {
  const th = isDark ? 'dark' : 'light';

  return {
    // Backgrounds
    bg:        hds.color.surface.page[th],
    panelBg:   hds.color.surface.raised[th],
    fill:      'var(--semantic-color-surface-raised)',
    hover:     'var(--semantic-color-surface-accentSubtle)',
    brandTint: 'var(--semantic-color-surface-accentSubtle)',

    // Content
    content: {
      primary:   'var(--semantic-color-content-primary)',
      secondary: 'var(--semantic-color-content-secondary)',
      subtle:    'var(--semantic-color-content-secondary)',
      faint:     'var(--semantic-color-content-disabled)',
    },

    // Borders & dividers
    border: 'var(--semantic-color-border-default)',
    rule:   'var(--semantic-color-border-default)',

    // Brand & semantic
    accent:    hds.color.brand,
    blueBar:   isDark ? hds.color.blue['400'] : hds.color.blue['300'],
    success:   hds.color.feedback.success[th],
    danger:    hds.color.feedback.error[th],
    warning:   hds.color.feedback.warning[th],
    info:      hds.color.feedback.info[th],
  };
}
