/**
 * MetaLine — one line of secondary facts, at most two, joined by a bullet.
 * @category Typography
 * @tier primitive
 * @usage Show one or two secondary facts on a single line, joined by a bullet ("Acme Cloud · Remote").
 * @whenNot Three or more facts, or labelled key-value pairs.
 * @useInstead A second MetaLine row per extra fact, or MetadataList for labelled pairs
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

/** One or two items. A third is a type error: give it its own row (a second MetaLine). */
export type MetaLineItems = [React.ReactNode] | [React.ReactNode, React.ReactNode];

/** @public */
export interface MetaLineProps extends Omit<
  React.HTMLAttributes<HTMLParagraphElement>,
  'children'
> {
  /** One or two text items; the separator is drawn between them. */
  items: MetaLineItems;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Secondary facts on one line ("Acme Cloud · Remote"). Max two items per line so
 * long strings in other languages never wrap mid-line; more facts go in more rows.
 * The `hds/max-two-meta-items` lint rule enforces the same limit on bullet-joined
 * text in JSX; it cannot see chains built in code (`[a, b, c].join(' · ')`), so
 * those rely on this type and review.
 */
export const MetaLine = /* @__PURE__ */ React.forwardRef<HTMLParagraphElement, MetaLineProps>(
  function MetaLine({ items, className, ...props }, ref) {
    return (
      <p ref={ref} className={cn('hds-type-caption text-muted-foreground', className)} {...props}>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <span aria-hidden="true" data-meta-separator="">
                {' · '}
              </span>
            )}
            {item}
          </React.Fragment>
        ))}
      </p>
    );
  },
);
