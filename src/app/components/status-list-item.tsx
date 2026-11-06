/**
 * @category Display
 * @tier pattern
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=88-350
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { VisuallyHidden } from './visually-hidden';

// ── Variants ───────────────────────────────────────────────────────────────────
// Non-interactive — no hover/active/focus states. Tone drives only the leading
// dot color; title/notes stay neutral typography regardless. `neutral` and
// `info` resolve to the same computed color as the pre-cva `border-default`/
// `content-accent` values byte-for-byte (border/content-accent role tokens
// mirror `bg-border`/`bg-feedback-info` in both themes), so this conversion
// carries no visual change.
const statusListItemDotVariants = /* @__PURE__ */ cva('mt-1.5 h-2 w-2 shrink-0 rounded-full', {
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
  /**
   * The status in words, such as "Overdue". The tone dot is hidden from screen
   * readers, so without this they hear no status; it is read after the title.
   */
  statusLabel?: string;
  notes?: React.ReactNode[];
  trailing?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Status dot + title row with optional muted notes and trailing slot (e.g. badge).
 * @a11y component required a11y:status-list-item.status-named The dot is hidden; statusLabel is read after the title.
 * @a11y consumer required Pass statusLabel whenever the tone carries meaning.
 */
export const StatusListItem = /* @__PURE__ */ React.forwardRef<HTMLDivElement, StatusListItemProps>(
  function StatusListItem({ tone, title, statusLabel, notes, trailing, className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-tone={tone ?? 'neutral'}
        className={cn('flex items-start gap-fixed-xs', className)}
        {...props}
      >
        <span aria-hidden="true" className={statusListItemDotVariants({ tone })} />
        <div className="min-w-0 flex-1">
          <p className="m-0 hds-type-ui text-foreground">
            {title}
            {statusLabel ? <VisuallyHidden>{`, ${statusLabel}`}</VisuallyHidden> : null}
          </p>
          {notes?.map((note, i) => (
            <p key={i} className="m-0 hds-type-caption text-muted-foreground">
              {note}
            </p>
          ))}
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
    );
  },
);
