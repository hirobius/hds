/**
 * @category Feedback
 * @tier primitive
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=88-85
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// vocab-ok: 'accent' predates the #60 fixed tone vocabulary (neutral | danger |
// success | warning | info) — Callout's accent tone is a deliberate 5th
// decorative/informational treatment, not a feedback state. Tracked for a
// future variant-contract rollout phase rather than force-renamed here.
type CalloutTone = 'accent' | 'info' | 'success' | 'warning' | 'danger';

// ── Variants ───────────────────────────────────────────────────────────────────
// Tone drives a tinted FILL, the one feedback-banner language shared with Alert
// (bg-feedback-bg-*), not a left stripe — a >1px colored side-rule was the lone
// anti-pattern left in the set, and two feedback components carrying tone in
// opposite ways (Alert fill vs Callout stripe) read as two systems. Callout stays
// distinct by role, not by mechanism: no icon, no aria role, and an `italic`
// option (quote/pull-quote), vs Alert's icon + status role. `accent` is not a
// feedback state, so it takes a neutral muted fill rather than a tinted one.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven padding/radius; var()-based, no Tailwind-theme utility
const calloutVariants = /* @__PURE__ */ cva(
  'rounded-[var(--primitive-radius-4)] p-[var(--semantic-space-surface-padding)]',
  {
    variants: {
      tone: {
        accent: 'bg-muted',
        info: 'bg-feedback-bg-info',
        success: 'bg-feedback-bg-success',
        warning: 'bg-feedback-bg-warning',
        danger: 'bg-feedback-bg-danger',
      },
      italic: {
        true: 'italic',
        false: 'not-italic',
      },
    },
    defaultVariants: { tone: 'info', italic: false },
  },
);

type CalloutVariantProps = VariantProps<typeof calloutVariants>;

export interface CalloutProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'>, Omit<CalloutVariantProps, 'italic'> {
  /** Tone — drives the left rule color and bg tint. */
  tone?: CalloutTone;
  /** Italicize the body content (quote / pull-quote pattern). */
  italic?: boolean;
}

/**
 * Tone-driven tinted callout for notes, quotes, hypotheses — the same feedback
 * fill language as Alert, without Alert's icon or status role.
 */
export const Callout = /* @__PURE__ */ React.forwardRef<HTMLDivElement, CalloutProps>(
  function Callout({ tone = 'info', italic = false, className, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        data-tone={tone}
        className={cn(calloutVariants({ tone, italic }), className)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

export default Callout;
