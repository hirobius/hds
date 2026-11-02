/**
 * Kbd — inline keyboard key / shortcut hint rendered as a native <kbd>.
 * @category Display
 * @tier primitive
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=2026-9
 * @usage Show a keyboard key or shortcut hint inline, as a native kbd element.
 * @whenNot Code samples, or a control that runs the shortcut.
 * @useInstead Text inline code and other typography
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// One styling axis (size). Chrome is a sunken key cap (surface.sunken, so it shows on a raised Card) —
// no second hue, a border.strong edge and the 2px hard key shadow from .hds-kbd (theme.css; no layout size), font-medium (never bold), all spacing on the 8px grid.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- border.strong has no Tailwind border-color utility name; var()-based so still token-driven
const kbdVariants = /* @__PURE__ */ cva(
  'hds-kbd inline-flex items-center justify-center whitespace-nowrap align-middle select-none rounded border border-[color:var(--semantic-color-border-strong)] bg-[var(--semantic-color-surface-sunken)] text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'h-5 min-w-5 px-fixed-2xs hds-type-caption',
        md: 'h-6 min-w-6 px-1.5 hds-type-caption',
        lg: 'h-7 min-w-7 px-scale-xs hds-type-ui',
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
