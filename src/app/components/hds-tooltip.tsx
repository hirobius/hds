/**
 * Tooltip — accessible hover/focus tooltip on Radix (Overlays).
 * @category Overlays
 * @tier primitive
 * @doc-exempt: no Overlays doc page yet — add demo when the overlays page is created
 *
 * Radix Tooltip (@radix-ui/react-tooltip) themed with role tokens. Provides
 * Floating-UI collision-aware positioning, ARIA wiring, keyboard focus support,
 * open/close delay, and portal mounting out of the box. Unlike the
 * internal `ExpandTooltip` (an @internal image-expand pill bound to AssetImg), this is the
 * general-purpose accessible tooltip for labelling controls.
 *
 *   <Tooltip>
 *     <Tooltip.Trigger asChild>
 *       <IconButton icon={Link} aria-label="Copy link" />
 *     </Tooltip.Trigger>
 *     <Tooltip.Content>Copy link</Tooltip.Content>
 *   </Tooltip>
 *
 * Skin: inverse surface bubble (semantic.color.surface.inverse) + inverse
 * content text (semantic.color.content.inverse) — these are a designed pair, so
 * the bubble reads correctly in BOTH themes (dark bubble/light text in light
 * mode, light bubble/dark text in dark mode). Radius 4 (primitive.radius.4),
 * shadow-overlay, and a matching arrow. Text reuses the caption type composite.
 */

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import hds from '../design-system/tokens';
import { cn } from '../../lib/utils';
import { withHdsPortal } from '../context/hds-portal';

const TooltipPortal = withHdsPortal(TooltipPrimitive.Portal);

// ── Content ────────────────────────────────────────────────────────────────────

/** @public */
export type HdsTooltipContentProps = React.ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Content
> & {
  /**
   * Element to portal into. Defaults to the nearest `data-hds` scope, so the
   * overlay inherits its theme; pass `null` to use `document.body`.
   */
  container?: HTMLElement | null;
};

const HdsTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  HdsTooltipContentProps
>(function HdsTooltipContent({ className, sideOffset = 6, children, container, ...props }, ref) {
  return (
    <TooltipPortal container={container}>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          'z-50 max-w-xs select-none px-2 py-1 shadow-overlay',
          'bg-[var(--semantic-color-surface-inverse)] rounded-[var(--primitive-radius-4)]', // tier-ok: 4px primitive radius, no semantic 4px token
          className,
        )}
        style={{
          ...hds.typeStyles.caption,
          color: 'var(--semantic-color-content-inverse)',
          margin: 0,
        }}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow
          // eslint-disable-next-line tailwindcss/no-arbitrary-value -- inverse-surface fill matches the bubble; var()-based
          className="fill-[var(--semantic-color-surface-inverse)]"
          width={11}
          height={5}
        />
      </TooltipPrimitive.Content>
    </TooltipPortal>
  );
});

// ── Compound export ──────────────────────────────────────────────────────────

interface HdsTooltipComponent extends React.FC<
  React.ComponentProps<typeof TooltipPrimitive.Root> & {
    /** Hover-open delay in ms (Radix Provider). Default 300. */
    delayDuration?: number;
  }
> {
  Trigger: typeof TooltipPrimitive.Trigger;
  Content: typeof HdsTooltipContent;
}

/**
 * Tooltip root. Bakes in the Radix Provider so a single `<Tooltip>` is
 * self-contained — no app-level provider required. Controlled via
 * `open`/`onOpenChange`, or uncontrolled with `defaultOpen`.
 * @public
 */
const Tooltip = (({
  delayDuration = 300,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root> & { delayDuration?: number }) => (
  <TooltipPrimitive.Provider delayDuration={delayDuration}>
    <TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
)) as HdsTooltipComponent;
Tooltip.Trigger = TooltipPrimitive.Trigger;
Tooltip.Content = HdsTooltipContent;

export { Tooltip };
