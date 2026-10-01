/**
 * Tooltip — accessible hover/focus tooltip on Radix (Overlays).
 * @category Overlays
 * @tier primitive
 * @figma https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=93-15
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
 * shadow-floating (semantic.elevation.floating, the popover and dropdown
 * shadow; shadow-overlay is for dialogs), and a matching arrow. Text reuses the
 * caption type composite.
 */

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import hds from '../design-system/tokens';
import { cn } from '../../lib/utils';
import { withHdsPortal } from '../context/hds-portal';

const TooltipPortal = /* @__PURE__ */ withHdsPortal(TooltipPrimitive.Portal);

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

const HdsTooltipContent = /* @__PURE__ */ React.forwardRef<
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
          'z-50 max-w-xs select-none px-2 py-1 shadow-floating',
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

// A wrapper of our own, not the Radix Root itself: the compound below attaches
// the parts to it. Writing them onto a component at module scope is a side
// effect webpack and esbuild keep in every bundle that reaches the shared
// chunk (hds#363, hds#365).
function TooltipRoot({
  delayDuration = 300,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root> & { delayDuration?: number }) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

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
 * @usage Name an icon-only control, or add a short hint that appears on hover and keyboard focus.
 * @whenNot Anything interactive, text people need to finish a task, or a hint touch users must see (touch has no hover).
 * @useInstead Popover interactive or longer content that opens on click
 * @useInstead Text a hint that must stay visible
 * @keyboard Focus Opens the tooltip when the trigger receives keyboard focus.
 * @keyboard Escape Closes the tooltip and keeps focus on the trigger.
 * @keyboard Tab Moves on to the next control and closes the tooltip.
 * @public
 */
const Tooltip: HdsTooltipComponent = /* @__PURE__ */ Object.assign(TooltipRoot, {
  Trigger: TooltipPrimitive.Trigger,
  Content: HdsTooltipContent,
  // Set here, not by a later `Tooltip.displayName = …` write: a top-level
  // property write is a side effect that keeps the module alive.
  displayName: 'Tooltip',
});

export { Tooltip };
