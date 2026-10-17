/**
 * Tabs — Radix-backed underline tabs (Root, List, Trigger, Content).
 *
 * Underline pattern math:
 *   - TabsList carries `border-b border-border/40` (the divider, half-strength
 *     so it anchors the strip without competing with content).
 *   - TabsTrigger has `border-b-2 border-transparent -mb-px` at rest.
 *     The `-mb-px` offsets the trigger DOWN by 1px so the trigger sits
 *     on top of the list divider; the active 2px bottom border visually
 *     REPLACES that 1px segment instead of stacking on it.
 *   - Active state pairs the underline with a soft `bg-accent/5` tint that
 *     extends down into TabsContent — the active tab visually "claims" its
 *     content panel (folder-tab affordance, modern-soft).
 *
 * Indicator:
 *   One bar (.hds-tabs-indicator) slides to the active trigger on the
 *   productive motion token. TabsList measures the active trigger and sets
 *   data-indicator once the bar is placed; until then (SSR, no JS) the
 *   trigger's own 2px border draws the line. The bar is styled inline, not in
 *   CSS, to keep the stylesheet inside its size budget.
 *
 * Overflow:
 *   TabsList is horizontally scrollable (`overflow-x-auto whitespace-nowrap`)
 *   for cases like /ops/atlas with 8 tabs at narrow viewports. Scrollbar
 *   chrome is hidden cross-browser (-webkit / firefox / IE); a mask fades the
 *   edge that has hidden tabs (`data-overflow`). The trigger's
 *   focus ring is `ring-inset` because `overflow-x-auto` clips anything drawn
 *   outside the list box (an outer ring was cut on the first/last tab).
 *
 * @category Navigation
 * @tier primitive
 */

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

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

/** Which edges of the strip have tabs scrolled out of view. */
type TabsOverflow = 'start' | 'end' | 'both' | undefined;

function measureOverflow(el: HTMLElement): TabsOverflow {
  const hiddenStart = el.scrollLeft > 1;
  const hiddenEnd = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  if (hiddenStart && hiddenEnd) return 'both';
  if (hiddenStart) return 'start';
  if (hiddenEnd) return 'end';
  return undefined;
}

const FADE = 'var(--semantic-space-scale-lg)';

// Hidden until measured, so the first placement does not slide in from the left edge.
const BAR_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  height: 'var(--semantic-borderWidth-emphasis)',
  background: 'var(--semantic-color-content-primary)',
  pointerEvents: 'none',
  opacity: 0,
};

/** Mask that fades the edge(s) with hidden tabs, one fade width (scale.lg) deep. Inline, so it costs no CSS. */
function fadeStyle(overflow: TabsOverflow): React.CSSProperties | undefined {
  if (!overflow) return undefined;
  const start = overflow === 'end' ? '0px' : FADE;
  const end = overflow === 'start' ? '0px' : FADE;
  const mask = `linear-gradient(90deg,transparent,currentColor ${start},currentColor calc(100% - ${end}),transparent)`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

/**
 * The tab strip. When tabs scroll out of view it fades the hidden edge
 * (`data-overflow="start" | "end" | "both"`), so tabs past the edge do not look
 * absent. The fade is a mask, so it needs no colour and holds in light and dark.
 */
export const TabsList = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentProps<typeof TabsPrimitive.List>
>(function TabsList({ className, onScroll, style, children, ...props }, forwardedRef) {
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const barRef = React.useRef<HTMLSpanElement | null>(null);
  const [overflow, setOverflow] = React.useState<TabsOverflow>(undefined);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const placeBar = React.useCallback(() => {
    const list = innerRef.current;
    const bar = barRef.current;
    if (!list || !bar) return;
    const active = list.querySelector<HTMLElement>(':scope > [role="tab"][data-state="active"]');
    if (!active) {
      list.removeAttribute('data-indicator');
      return;
    }
    bar.style.translate = `${active.offsetLeft}px 0`;
    bar.style.width = `${active.offsetWidth}px`;
    if (!list.hasAttribute('data-indicator')) {
      // First placement lands without sliding in from 0: commit it, then turn the transition on.
      bar.getBoundingClientRect();
      bar.style.opacity = '1';
      bar.style.transition =
        'translate var(--hds-motion-productive), width var(--hds-motion-productive)';
      list.setAttribute('data-indicator', '');
    }
  }, []);

  const update = React.useCallback(() => {
    if (innerRef.current) setOverflow(measureOverflow(innerRef.current));
    placeBar();
  }, [placeBar]);

  React.useEffect(() => {
    const el = innerRef.current;
    if (!el || typeof MutationObserver === 'undefined') return;
    const mo = new MutationObserver(placeBar);
    mo.observe(el, { attributes: true, attributeFilter: ['data-state'], subtree: true });
    return () => mo.disconnect();
  }, [placeBar]);

  React.useEffect(() => {
    update();
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // A tab can change width on its own (a web font lands, a badge count grows),
    // and the bar must follow it, so each tab is watched too.
    for (const tab of el.querySelectorAll(':scope > [role="tab"]')) ro.observe(tab);
    return () => ro.disconnect();
  }, [update]);

  return (
    <TabsPrimitive.List
      ref={setRefs}
      data-overflow={overflow}
      style={{ ...fadeStyle(overflow), ...style }}
      onScroll={(event) => {
        update();
        onScroll?.(event);
      }}
      className={cn(
        'hds-tabs-list relative flex h-10 items-center gap-6 overflow-x-auto whitespace-nowrap',
        'border-b border-border/40 mb-6',
        '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        className,
      )}
      {...props}
    >
      {children}
      <span ref={barRef} aria-hidden="true" className="hds-tabs-indicator" style={BAR_STYLE} />
    </TabsPrimitive.List>
  );
});

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative -mb-px inline-flex items-center px-3 py-2 hds-type-ui hds-touch-row transition-colors',
        // border colour via arbitrary values: utilities.css ships an unlayered .border-transparent that beats Tailwind's data-[state=active] variants (bug bash 24, item 4)
        'border-b-2 border-b-[color:transparent] text-muted-foreground rounded-t-md', // impeccable-disable-line border-accent-on-rounded -- false positive: the bottom edge and top corners never touch
        'data-[state=active]:border-b-[color:var(--semantic-color-content-primary)] data-[state=active]:text-foreground data-[state=active]:bg-accent/5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:text-[var(--semantic-color-content-disabled)]',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('bg-accent/5 rounded-b-md p-6 -mt-6', className)}
      {...props}
    />
  );
}
