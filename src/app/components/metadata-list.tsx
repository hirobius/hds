/**
 * MetadataList — semantic term/description list for object metadata (Status,
 * Owner, Updated…). The idiomatic replacement for badge-stickers-on-prose.
 * @category Display
 * @tier pattern
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=2041-47
 * @public
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import hds from '../design-system/tokens';

// ── Variants ───────────────────────────────────────────────────────────────────
// Orientation is the only styling axis. Vertical stacks each term above its
// description; horizontal lays each pair out as a two-column grid row.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- content-sized term column has no Tailwind-theme utility
const metadataListVariants = /* @__PURE__ */ cva('', {
  variants: {
    orientation: {
      vertical: 'flex flex-col gap-3',
      // The term column hugs its longest term; it was half the list (146px at 1280, hds#522).
      horizontal: 'grid grid-cols-[max-content_minmax(0,1fr)] gap-x-scale-sm gap-y-scale-xs',
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
   * - `'divided'` — a full-width rule
   *   between each pair (term above its rich description). Ignores `orientation`
   *   (always term-above-description). Use for spec sheets / namespace tables.
   */
  variant?: 'plain' | 'divided';
  /**
   * Optional summary row rendered last, under its own rule, in secondary text —
   * e.g. a footnote or aggregate note. Only rendered by the `divided` variant.
   */
  footer?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Renders object metadata as a semantic `<dl>` of term/description pairs. */
export const MetadataList = /* @__PURE__ */ React.forwardRef<HTMLDListElement, MetadataListProps>(
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
          // No box, radius or inset: MetadataList pads nothing (layout contract v1), so the term starts at
          // the same x as in the plain and horizontal variants. Only the rules between pairs remain.
          className={cn('flex flex-col', className)}
          {...rest}
        >
          {items.map((item, index) => (
            <div
              key={index}
              // eslint-disable-next-line tailwindcss/no-arbitrary-value -- scale-sm spacing token has no Tailwind-theme utility; var()-based so still token-driven
              className="flex flex-col gap-2 py-[var(--semantic-space-scale-sm)] first:pt-0 last:pb-0"
              style={
                index === 0
                  ? undefined
                  : {
                      borderTop: `${hds.borderWidth.default} solid var(--semantic-color-border-subtle)`,
                    }
              }
            >
              <dt
                className="hds-type-ui"
                style={{ color: 'var(--semantic-color-content-secondary)' }}
              >
                {item.term}
              </dt>
              <dd className="m-0 text-foreground">{item.description}</dd>
            </div>
          ))}
          {footer != null && (
            <div
              // eslint-disable-next-line tailwindcss/no-arbitrary-value -- scale-sm spacing token has no Tailwind-theme utility; var()-based so still token-driven
              className="py-[var(--semantic-space-scale-sm)] pb-0 hds-type-ui"
              style={{
                borderTop: `${hds.borderWidth.default} solid var(--semantic-color-border-subtle)`,
                color: 'var(--semantic-color-content-secondary)',
              }}
            >
              <dt className="sr-only">Summary</dt>
              <dd className="m-0">{footer}</dd>
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
              <dt className="hds-type-ui text-muted-foreground">{item.term}</dt>
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
            <dt className="hds-type-ui text-muted-foreground">{item.term}</dt>
            <dd className={cn('m-0 text-foreground')}>{item.description}</dd>
          </div>
        ))}
      </dl>
    );
  },
);
