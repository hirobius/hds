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
 * Overflow:
 *   TabsList is horizontally scrollable (`overflow-x-auto whitespace-nowrap`)
 *   for cases like /ops/atlas with 8 tabs at narrow viewports. Scrollbar
 *   chrome is hidden cross-browser (-webkit / firefox / IE).
 *
 * @category Navigation
 * @tier primitive
 */

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex h-10 items-center gap-6 overflow-x-auto whitespace-nowrap',
        'border-b border-border/40 mb-6',
        '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative -mb-px inline-flex items-center px-3 py-2 text-sm transition-colors',
        'border-b-2 border-transparent text-muted-foreground rounded-t-md',
        'data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-accent/5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
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
      className={cn(
        'bg-accent/5 rounded-b-md p-6 -mt-6',
        className,
      )}
      {...props}
    />
  );
}
