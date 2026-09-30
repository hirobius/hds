/**
 * ButtonGroup — attaches Button children into one segmented control.
 * @category Actions
 * @tier primitive
 * @usage Attach related Buttons into one segmented row or column that reads as a single control.
 * @whenNot Buttons that are unrelated, or choosing one of several views.
 * @useInstead SegmentedControl choosing one of several views
 * @useInstead Stack loosely spaced buttons
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Collapses the shared inner radii and overlaps the 1px borders so a row/column
// of Buttons reads as a single unit. `[&>*]` child selectors are Tailwind
// arbitrary variants (like button.tsx's `[&_svg]`), not arbitrary values.
const buttonGroupVariants = /* @__PURE__ */ cva(
  'isolate inline-flex [&>*]:relative [&>*:focus-visible]:z-10',
  {
    variants: {
      orientation: {
        horizontal:
          'flex-row [&>*:not(:first-child)]:-ml-px [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none',
        vertical:
          'flex-col [&>*:not(:first-child)]:-mt-px [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none',
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type ButtonGroupVariantProps = VariantProps<typeof buttonGroupVariants>;

/** @public */
export interface ButtonGroupProps
  extends React.HTMLAttributes<HTMLDivElement>, ButtonGroupVariantProps {}

// ── Component ──────────────────────────────────────────────────────────────────

/** Groups Button (or button-like) children into a single attached segment. */
export const ButtonGroup = /* @__PURE__ */ React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  function ButtonGroup({ className, orientation, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        role="group"
        data-orientation={orientation ?? 'horizontal'}
        className={cn(buttonGroupVariants({ orientation }), className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

/** @internal — CVA variant helper; compose via ButtonGroup props instead. */
export { buttonGroupVariants };
