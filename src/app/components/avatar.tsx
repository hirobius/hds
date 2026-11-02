/**
 * Avatar - user or entity image with an initials or icon fallback and an optional status dot.
 * @category Display
 * @tier primitive
 * @usage Show a person or entity as an image with an initials fallback, or a neutral person icon when nobody is signed in; add a status dot for a state such as unsynced. As an account button, pass it as the iconLeft of a tertiary iconOnly Button.
 * @whenNot A generic pictogram, or a status marker on its own.
 * @useInstead Icon a generic pictogram
 * @useInstead Badge a status marker on its own
 * @a11y component required a11y:avatar.named The image, initials or icon is one image named by alt; an empty alt makes initials or icon decorative, for use beside a visible name.
 * @a11y component required a11y:avatar.status-named A status dot with statusLabel is an image named by it; without one it is hidden.
 * @a11y consumer required As a button, name the Button for the account and its status ("Account, not synced"): the Button label replaces the avatar's own name.
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=34-18
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from './badge';
import { Icon } from './icon';

// ── Variants ───────────────────────────────────────────────────────────────────
// The root is not overflow-hidden, so a status dot can sit on the rim; the face
// span inside clips the image to the circle.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- surface.sunken has no Tailwind-theme utility; var()-based so still token-driven (bg-muted was 1.04:1 on a raised Card, hds#522)
const avatarVariants = /* @__PURE__ */ cva(
  'relative inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--semantic-color-surface-sunken)] text-muted-foreground select-none',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 hds-type-caption',
        md: 'h-10 w-10 hds-type-ui',
        lg: 'h-12 w-12 hds-type-body',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

// The icon and the dot follow the avatar's sm/md/lg ramp: 16/20/24px icons
// (hds.iconSize) and Badge's 6/8/10px dots.
const ICON_SIZE = { sm: 'small', md: 'medium', lg: 'large' } as const;

/** @public */
export type AvatarStatus = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

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
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>, AvatarVariantProps {
  /** Image source. When absent or it fails to load, the initials fallback shows. */
  src?: string;
  /** Required descriptive alt / accessible name (e.g. the person's name). */
  alt: string;
  /** Explicit initials. Falls back to the first letters derived from `alt`. */
  initials?: string;
  /** What shows without an image: `initials` (default) or a neutral person icon, e.g. when signed out. With no initials to show, the icon shows. */
  fallback?: 'initials' | 'icon';
  /** Tone of a status dot on the rim (a Badge dot), e.g. `warning` for unsynced. No dot when unset. */
  status?: AvatarStatus;
  /** Names the status dot for assistive technology (e.g. "Not synced"). Without it the dot is hidden. */
  statusLabel?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Circular avatar. Renders the image when available, else initials from `alt` or a person icon, with an optional status dot. */
export const Avatar = /* @__PURE__ */ React.forwardRef<HTMLSpanElement, AvatarProps>(
  function Avatar(
    { className, size, src, alt, initials, fallback = 'initials', status, statusLabel, ...props },
    ref,
  ) {
    const [failed, setFailed] = React.useState(false);
    // Reset the fallback when `src` changes, so a new valid photo isn't masked
    // by a previous one's load error. Adjust-during-render, not an effect.
    const [prevSrc, setPrevSrc] = React.useState(src);
    if (src !== prevSrc) {
      setPrevSrc(src);
      setFailed(false);
    }
    const showImage = Boolean(src) && !failed;
    const label = initials || deriveInitials(alt);
    const showIcon = fallback === 'icon' || !label;
    const resolvedSize = size ?? 'md';

    return (
      <span
        ref={ref}
        data-size={resolvedSize}
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
          {showImage ? (
            <img
              src={src}
              alt={alt}
              className="h-full w-full object-cover"
              onError={() => setFailed(true)}
            />
          ) : showIcon ? (
            <span aria-label={alt || undefined} role={alt ? 'img' : undefined}>
              <Icon icon={User} size={ICON_SIZE[resolvedSize]} />
            </span>
          ) : (
            <span
              aria-label={alt || undefined}
              role={alt ? 'img' : undefined}
              aria-hidden={alt ? undefined : true}
            >
              {label}
            </span>
          )}
        </span>
        {status && (
          // status-clutter-ok: an attention dot on an account avatar (Adrian, 2026-10-21), not a status dot on a card or tile (hds#759)
          <Badge
            // eslint-disable-next-line hds/no-status-clutter -- see status-clutter-ok above
            dot
            tone={status}
            size={resolvedSize}
            label={statusLabel}
            className="absolute right-0 top-0 ring-2 ring-background"
          />
        )}
      </span>
    );
  },
);
