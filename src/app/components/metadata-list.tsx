/**
 * MetadataList — semantic term/description list for object metadata (Status,
 * Owner, Updated…). The idiomatic replacement for badge-stickers-on-prose.
 * @category Display
 * @tier pattern
 * @public
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import hds from '../design-system/tokens';

// ── Variants ───────────────────────────────────────────────────────────────────
// Orientation is the only styling axis. Vertical stacks each term above its
// description; horizontal lays each pair out as a two-column grid row.
const metadataListVariants = cva('', {
  variants: {
    orientation: {
      vertical: 'flex flex-col gap-3',
      horizontal: 'grid grid-cols-2 gap-x-4 gap-y-2',
    },
  },
  defaultVariants: { orientation: 'vertical' },
});

// ── Types ──────────────────────────────────────────────────────────────────────

type MetadataListVariantProps = VariantProps<typeof metadataListVariants>;

/** A single term/description pair rendered by MetadataList. */
export interface MetadataListItem {
  /** The metadata key, e.g. "Status". */
  term: React.ReactNode;
  /** The metadata value, e.g. "Active". `description` may be rich content
   *  (chips, prose, multiple lines) — useful with the `divided` variant. */
  description: React.ReactNode;
}

/** @public */
export interface MetadataListProps
  extends Omit<React.HTMLAttributes<HTMLDListElement>, 'children'>, MetadataListVariantProps {
  /** The term/description pairs to render. */
  items: MetadataListItem[];
  /**
   * Visual treatment.
   * - `'plain'` (default) — bare term/description pairs; honours `orientation`.
   * - `'divided'` — one bordered, rounded container with a full-width rule
   *   between each pair (term above its rich description). Ignores `orientation`
   *   (always term-above-description). Use for spec sheets / namespace tables.
   */
  variant?: 'plain' | 'divided';
  /**
   * Optional summary band rendered as the final row on a subtle surface —
   * e.g. a footnote or aggregate note. Only rendered by the `divided` variant.
   */
  footer?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Renders object metadata as a semantic `<dl>` of term/description pairs. */
export const MetadataList = React.forwardRef<HTMLDListElement, MetadataListProps>(
  function MetadataList(
    { className, items, orientation = 'vertical', variant = 'plain', footer, ...rest },
    ref,
  ) {
    if (variant === 'divided') {
      return (
        <dl
          ref={ref}
          data-variant="divided"
          data-orientation="vertical"
          className={cn('flex flex-col overflow-hidden rounded-lg', className)}
          // Semantic tokens (not the --role-* utility layer) so colours resolve
          // correctly in both themes — matching Divider/Card/InlineCode.
          style={{
            border: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
          }}
          {...rest}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 p-5"
              style={
                index === 0
                  ? undefined
                  : {
                      borderTop: `${hds.borderWidth.default} solid var(--semantic-color-border-subtle)`,
                    }
              }
            >
              <dt
                className="text-sm font-medium"
                style={{ color: 'var(--semantic-color-content-secondary)' }}
              >
                {item.term}
              </dt>
              <dd
                className="m-0 text-sm"
                style={{ color: 'var(--semantic-color-content-primary)' }}
              >
                {item.description}
              </dd>
            </div>
          ))}
          {footer != null && (
            <div
              className="p-5 text-sm"
              style={{
                borderTop: `${hds.borderWidth.default} solid var(--semantic-color-border-subtle)`,
                background: 'var(--semantic-color-surface-raised)',
                color: 'var(--semantic-color-content-secondary)',
              }}
            >
              {footer}
            </div>
          )}
        </dl>
      );
    }

    if (orientation === 'horizontal') {
      return (
        <dl
          ref={ref}
          data-orientation={orientation}
          className={cn(metadataListVariants({ orientation }), className)}
          {...rest}
        >
          {items.map((item, index) => (
            <React.Fragment key={index}>
              <dt className="text-sm font-medium text-muted-foreground">{item.term}</dt>
              <dd className={cn('m-0 text-foreground')}>{item.description}</dd>
            </React.Fragment>
          ))}
        </dl>
      );
    }

    return (
      <dl
        ref={ref}
        data-orientation={orientation}
        className={cn(metadataListVariants({ orientation }), className)}
        {...rest}
      >
        {items.map((item, index) => (
          <div key={index} className="flex flex-col gap-0.5">
            <dt className="text-sm font-medium text-muted-foreground">{item.term}</dt>
            <dd className={cn('m-0 text-foreground')}>{item.description}</dd>
          </div>
        ))}
      </dl>
    );
  },
);

/** @internal — CVA variant helper; compose via MetadataList props instead. */
export { metadataListVariants };
