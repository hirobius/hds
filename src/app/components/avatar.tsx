/**
 * Avatar - user or entity image with an initials fallback.
 * @category Display
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground font-medium uppercase select-none',
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

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Up to two leading letters from a name, e.g. "Adrian Milsap" → "AM". */
function deriveInitials(name?: string): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2);
  return (words[0][0] ?? '') + (words[words.length - 1][0] ?? '');
}

// ── Types ──────────────────────────────────────────────────────────────────────

type AvatarVariantProps = VariantProps<typeof avatarVariants>;

/** @public */
export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    AvatarVariantProps {
  /** Image source. When absent or it fails to load, the initials fallback shows. */
  src?: string;
  /** Required descriptive alt / accessible name (e.g. the person's name). */
  alt: string;
  /** Explicit initials. Falls back to the first letters derived from `alt`. */
  initials?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Circular avatar. Renders the image when available, else initials from `alt`. */
export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { className, size, src, alt, initials, ...props },
  ref,
) {
  const [failed, setFailed] = React.useState(false);
  const showImage = Boolean(src) && !failed;
  const label = initials || deriveInitials(alt);

  return (
    <span
      ref={ref}
      data-size={size ?? 'md'}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label={alt} role="img">
          {label}
        </span>
      )}
    </span>
  );
});
