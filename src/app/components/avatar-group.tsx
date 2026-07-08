/**
 * AvatarGroup — an overlapping cluster of Avatars with an overflow count.
 * @category Display
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import type { AvatarProps } from './avatar';

// ── Variants ───────────────────────────────────────────────────────────────────
// Non-interactive — no hover/active/focus states. The overflow "+N" bubble is
// the only element AvatarGroup itself paints; sizing mirrors avatar.tsx's own
// sm/md/lg ramp so the bubble lines up exactly with the avatars it follows.
const overflowBubbleVariants = cva(
  'inline-flex -ml-2 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-2 ring-background',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type OverflowBubbleVariantProps = VariantProps<typeof overflowBubbleVariants>;
// avatar.tsx and the overflow bubble share the same sm/md/lg ramp by contract.
type AvatarGroupSize = NonNullable<AvatarProps['size']>;

/** @public */
export interface AvatarGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>, OverflowBubbleVariantProps {
  /** Avatar elements to cluster. Extra items beyond `max` collapse into +N. */
  children: React.ReactNode;
  /** Maximum avatars shown before collapsing into an overflow chip. */
  max?: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Renders up to `max` overlapping avatars followed by a `+N` overflow chip. */
export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  { className, children, max, size, ...props },
  ref,
) {
  const resolvedSize: AvatarGroupSize = (size ?? 'md') as AvatarGroupSize;
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const limit = max && max > 0 ? max : items.length;
  const shown = items.slice(0, limit);
  const overflow = items.length - shown.length;

  return (
    <div
      ref={ref}
      role="group"
      data-size={resolvedSize}
      className={cn('flex items-center', className)}
      {...props}
    >
      {shown.map((child, i) =>
        React.cloneElement(child as React.ReactElement<AvatarProps>, {
          key: (child as React.ReactElement).key ?? i,
          size: resolvedSize,
          className: cn(
            'ring-2 ring-background',
            i > 0 && '-ml-2',
            (child.props as { className?: string }).className,
          ),
        }),
      )}
      {overflow > 0 && (
        <span aria-label={`+${overflow} more`} className={overflowBubbleVariants({ size })}>
          +{overflow}
        </span>
      )}
    </div>
  );
});

/** @internal — CVA variant helper; compose via AvatarGroup props instead. */
export { overflowBubbleVariants };
