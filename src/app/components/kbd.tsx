/**
 * Kbd — inline keyboard key / shortcut hint rendered as a native <kbd>.
 * @category Display
 * @tier primitive
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components-Copy?node-id=2026-9
 * @usage Show a keyboard key or shortcut hint inline, as a native kbd element.
 * @whenNot Code samples, or a control that runs the shortcut.
 * @useInstead Text inline code and other typography
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// One styling axis (size). Chrome is a muted key cap on the neutral surface —
// no second hue, font-medium (never bold), all spacing on the 8px grid.
const kbdVariants = /* @__PURE__ */ cva(
  'inline-flex items-center justify-center whitespace-nowrap align-middle select-none rounded border border-border bg-muted text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'h-5 min-w-5 px-1 hds-type-caption',
        md: 'h-6 min-w-6 px-1.5 hds-type-caption',
        lg: 'h-7 min-w-7 px-2 hds-type-ui',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type KbdVariantProps = VariantProps<typeof kbdVariants>;

/** @public */
export interface KbdProps extends React.HTMLAttributes<HTMLElement>, KbdVariantProps {}

// ── Component ──────────────────────────────────────────────────────────────────

/** Renders a keyboard key or shortcut token, e.g. `<Kbd>⌘K</Kbd>`. */
export const Kbd = /* @__PURE__ */ React.forwardRef<HTMLElement, KbdProps>(function Kbd(
  { className, size, children, ...props },
  ref,
) {
  return (
    <kbd
      ref={ref}
      data-size={size ?? 'md'}
      className={cn(kbdVariants({ size }), className)}
      {...props}
    >
      {children}
    </kbd>
  );
});
