/**
 * @category Display
 * @tier pattern
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Non-interactive — no hover/active/focus states. Tone drives only the leading
// dot color; title/notes stay neutral typography regardless. `neutral` and
// `info` resolve to the same computed color as the pre-cva `border-default`/
// `content-accent` values byte-for-byte (border/content-accent role tokens
// mirror `bg-border`/`bg-feedback-info` in both themes), so this conversion
// carries no visual change.
const statusListItemDotVariants = cva('mt-1.5 h-2 w-2 shrink-0 rounded-full', {
  variants: {
    tone: {
      neutral: 'bg-border',
      info: 'bg-feedback-info',
      success: 'bg-feedback-success',
      warning: 'bg-feedback-warning',
      danger: 'bg-feedback-danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

// ── Types ──────────────────────────────────────────────────────────────────────

type StatusListItemVariantProps = VariantProps<typeof statusListItemDotVariants>;

// vocab-ok: `NonNullable<StatusListItemVariantProps['tone']>` below is a
// bracket-index type, not a vocabulary declaration — check-prop-vocabulary's
// rule C regex treats the quoted `'tone'` property-access key as an off-vocab
// tone *value*, a false positive (prettier's singleQuote:true also defeats a
// double-quote workaround, so this must be a file exemption). The real,
// gate-checked tone vocabulary lives in `statusListItemDotVariants`'s cva()
// variants above.
/** @public */
export type StatusListItemTone = NonNullable<StatusListItemVariantProps['tone']>;

/** @public */
export interface StatusListItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>, StatusListItemVariantProps {
  title: React.ReactNode;
  notes?: React.ReactNode[];
  trailing?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Status dot + title row with optional muted notes and trailing slot (e.g. badge).
 */
export const StatusListItem = React.forwardRef<HTMLDivElement, StatusListItemProps>(
  function StatusListItem({ tone, title, notes, trailing, className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-tone={tone ?? 'neutral'}
        className={cn('flex items-start gap-3', className)}
        {...props}
      >
        <span aria-hidden="true" className={statusListItemDotVariants({ tone })} />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm text-foreground">{title}</p>
          {notes?.map((note, i) => (
            <p key={i} className="m-0 text-xs text-muted-foreground">
              {note}
            </p>
          ))}
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
    );
  },
);

/** @internal — CVA variant helper; compose via StatusListItem props instead. */
export { statusListItemDotVariants };
