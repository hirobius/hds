/**
 * Tabs — Radix-backed underline tabs (Root, List, Trigger, Content).
 *
 * Underline pattern (hds#891 soft surfaces):
 *   - TabsList draws no divider at rest: space below it (mb-6) separates the
 *     strip from its panel.
 *   - TabsTrigger has a transparent `border-b-2` at rest, so the active 2px
 *     underline takes no extra height when it appears.
 *   - Active state pairs the underline with a `surface.selected` fill that
 *     extends down into TabsContent — the active tab visually "claims" its
 *     content panel (folder-tab affordance, modern-soft).
 *
 * Overflow:
 *   TabsList is horizontally scrollable (`overflow-x-auto whitespace-nowrap`)
 *   for cases like /ops/atlas with 8 tabs at narrow viewports. Scrollbar
 *   chrome is hidden cross-browser (-webkit / firefox / IE); a mask fades the
 *   edge that has hidden tabs (`data-overflow`), and the selected tab is
 *   scrolled into view on mount and on change (Radix does not; hds#823). The trigger's
 *   focus ring is `ring-inset` because `overflow-x-auto` clips anything drawn
 *   outside the list box (an outer ring was cut on the first/last tab).
 *
 * @category Navigation
 * @tier primitive
 */

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { scrollEdgeFadeStyle, useKeepSelectedInView, useScrollEdgeFade } from './scroll-edge-fade';

/**
 * The tab set itself. Tagged here rather than in the file block because
 * TabsList and TabsContent share this module and have no Figma node of their
 * own — a file-level @figma would silently claim this node for all four.
 * @usage Switch between panels of related content in the same place, one visible at a time.
 * @whenNot A compact mode switch with no panels, or content that must all be visible.
 * @useInstead SegmentedControl a compact switch with no panels
 * @useInstead Disclosure optional content that expands in place
 * @a11y component required a11y:tabs.roles It exposes tablist, tab and tabpanel roles, with aria-selected on the active tab and aria-controls and aria-labelledby linking each tab to its panel.
 * @a11y component required a11y:tabs.single-tab-stop The tablist is one Tab stop, entering on the selected tab; Tab then moves on to the panel.
 * @a11y component required a11y:tabs.arrow-keys Left and Right move between tabs and select them, wrapping at the ends; Home and End jump to the first and last tab.
 * @a11y component required a11y:tabs.disabled-skipped Arrow keys skip a disabled tab.
 * @a11y component required a11y:tabs.panel-focus The active panel is focusable, so keyboard users can reach and scroll its content.
 * @a11y component required a11y:tabs.focus-ring The trigger focus ring is drawn inset, so the scrolling tab list cannot clip it.
 * @a11y component required a11y:tabs.target-size The tab strip is 40px tall, over the 24px floor (WCAG 2.5.8).
 * @a11y consumer required Give every TabsTrigger value a TabsContent with the same value, so aria-controls resolves.
 * @a11y consumer recommended Name the TabsList (aria-label or aria-labelledby) when the surrounding heading does not make its purpose clear.
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=86-89
 */
export const Tabs = TabsPrimitive.Root;

/**
 * The tab strip. When tabs scroll out of view it fades the hidden edge
 * (`data-overflow="start" | "end" | "both"`), so tabs past the edge do not look
 * absent. The fade is a mask, so it needs no colour and holds in light and dark.
 * The selected tab is kept in view: on mount, and on change (smooth unless the
 * user prefers reduced motion), so a selected tab is never left past the edge.
 */
export const TabsList = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentProps<typeof TabsPrimitive.List>
>(function TabsList({ className, onScroll, style, ...props }, forwardedRef) {
  const { ref: innerRef, overflow, update } = useScrollEdgeFade<HTMLDivElement>();
  useKeepSelectedInView(innerRef, '[role="tab"][data-state="active"]');

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef, innerRef],
  );

  return (
    <TabsPrimitive.List
      ref={setRefs}
      data-overflow={overflow}
      style={{ ...scrollEdgeFadeStyle(overflow), ...style }}
      onScroll={(event) => {
        update();
        onScroll?.(event);
      }}
      className={cn(
        'flex h-10 items-center gap-fixed-md overflow-x-auto whitespace-nowrap',
        'mb-fixed-md',
        '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        className,
      )}
      {...props}
    />
  );
});

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative inline-flex items-center px-fixed-xs py-scale-xs hds-type-ui hds-touch-row transition-colors',
        // border colour via arbitrary values: utilities.css ships an unlayered .border-transparent that beats Tailwind's data-[state=active] variants (bug bash 24, item 4)
        'border-b-2 border-b-[color:transparent] text-muted-foreground rounded-t-md', // impeccable-disable-line border-accent-on-rounded -- false positive: the bottom edge and top corners never touch
        'data-[state=active]:border-b-[color:var(--semantic-color-content-primary)] data-[state=active]:text-foreground data-[state=active]:bg-[var(--semantic-color-surface-selected)]',
        'hds-focus-inset',
        'disabled:pointer-events-none disabled:text-[var(--semantic-color-content-disabled)]',
        className,
      )}
      {...props}
    />
  );
}

// `panel` is the tinted surface pulled up under the strip (in-page tabs); `bare` sits on the page,
// for tabs that are an app's top-level nav or a page's sections (hds#819).
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- surface.selected has no Tailwind-theme utility; the old bg-accent/5 tint was near-invisible (hds#522)
const tabsContentVariants = /* @__PURE__ */ cva('hds-tabs-content', {
  variants: {
    variant: {
      panel: 'bg-[var(--semantic-color-surface-selected)] rounded-b-md p-fixed-md -mt-fixed-md',
      bare: '',
    },
  },
  defaultVariants: { variant: 'panel' },
});

/** @public */
export type TabsContentProps = React.ComponentProps<typeof TabsPrimitive.Content> &
  VariantProps<typeof tabsContentVariants>;

export function TabsContent({ className, variant, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Content className={cn(tabsContentVariants({ variant }), className)} {...props} />
  );
}
