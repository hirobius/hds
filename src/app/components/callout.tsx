/**
 * @category Feedback
 * @tier primitive
 */

import * as React from 'react';
import type { CSSProperties } from 'react';
import hds from '../design-system/tokens';

type CalloutTone = 'accent' | 'info' | 'success' | 'warning' | 'danger';

const TONE_RULE: Record<CalloutTone, string> = {
  accent:  'var(--semantic-color-content-accent)',
  info:    'var(--semantic-color-feedback-info)',
  success: 'var(--semantic-color-feedback-success)',
  warning: 'var(--semantic-color-feedback-warning)',
  danger:  'var(--semantic-color-feedback-error)',
};

// Background pairs: accent/info/success/warning use raised bg for grouping;
// danger inverts to surface-page so the red rule stands out against the
// surrounding raised card surface.
const TONE_BG: Record<CalloutTone, string> = {
  accent:  'var(--semantic-color-surface-raised)',
  info:    'var(--semantic-color-surface-raised)',
  success: 'var(--semantic-color-surface-raised)',
  warning: 'var(--semantic-color-surface-raised)',
  danger:  'var(--semantic-color-surface-page)',
};

export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tone — drives the left rule color and bg tint. */
  tone?: CalloutTone;
  /** Italicize the body content (quote / pull-quote pattern). */
  italic?: boolean;
}

/**
 * Tone-driven side-rule callout for status, quotes, hypotheses.
 */
export const Callout = React.forwardRef<HTMLDivElement, CalloutProps>(
  function Callout({ tone = 'info', italic = false, style, children, ...rest }, ref) {
    const baseStyle: CSSProperties = {
      padding: hds.semantic.space.component.padding,
      borderLeft: `3px solid ${TONE_RULE[tone]}`, // outline-ok: signal-bearing left rule, not a container outline
      background: TONE_BG[tone],
      fontStyle: italic ? 'italic' : 'normal',
    };
    return (
      <div
        ref={ref}
        data-tone={tone}
        style={{ ...baseStyle, ...style }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

export default Callout;
