/**
 * AvatarGroup — an overlapping cluster of Avatars with an overflow count.
 * @category Display
 * @tier primitive
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import type { AvatarProps } from './avatar';

// ── Config ─────────────────────────────────────────────────────────────────────
// Overflow bubble sizing mirrors avatar.tsx's own size scale so the +N chip lines
// up exactly with the avatars it follows.
type AvatarGroupSize = NonNullable<AvatarProps['size']>;

const BUBBLE_SIZE: Record<AvatarGroupSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Avatar elements to cluster. Extra items beyond `max` collapse into +N. */
  children: React.ReactNode;
  /** Maximum avatars shown before collapsing into an overflow chip. */
  max?: number;
  /** Size applied to every avatar and the overflow chip. Defaults to `md`. */
  size?: AvatarGroupSize;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Renders up to `max` overlapping avatars followed by a `+N` overflow chip. */
export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  { className, children, max, size = 'md', ...props },
  ref,
) {
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const limit = max && max > 0 ? max : items.length;
  const shown = items.slice(0, limit);
  const overflow = items.length - shown.length;

  return (
    <div
      ref={ref}
      role="group"
      data-size={size}
      className={cn('flex items-center', className)}
      {...props}
    >
      {shown.map((child, i) =>
        React.cloneElement(child as React.ReactElement<AvatarProps>, {
          key: (child as React.ReactElement).key ?? i,
          size,
          className: cn(
            'ring-2 ring-background',
            i > 0 && '-ml-2',
            (child.props as { className?: string }).className,
          ),
        }),
      )}
      {overflow > 0 && (
        <span
          aria-label={`+${overflow} more`}
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-2 ring-background -ml-2',
            BUBBLE_SIZE[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
});
