/**
 * AppShell — application layout scaffold with semantic header, sidebar, and main regions, built for dashboards and admin surfaces.
 * @category Layout
 * @tier template
 * @public
 *
 * Composes a full-height page frame from three optional/required regions: an
 * optional top `header` (spans full width), an optional left `sidebar` (fixed
 * width via `sidebarWidth`), and required `children` rendered in `<main>`.
 * Regions map to native landmark elements (`<header>`, `<aside>`, `<main>`)
 * so assistive tech gets banner/complementary/main roles for free.
 *
 * Usage:
 *   <AppShell header={<TopBar />} sidebar={<NavRail />}>
 *     <PageContent />
 *   </AppShell>
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Sidebar width is the only styling axis — three token-driven fixed widths.
const appShellVariants = cva('shrink-0 border-r border-border', {
  variants: {
    sidebarWidth: {
      sm: 'w-56',
      md: 'w-64',
      lg: 'w-72',
    },
  },
  defaultVariants: { sidebarWidth: 'md' },
});

// ── Types ──────────────────────────────────────────────────────────────────────

type AppShellVariantProps = VariantProps<typeof appShellVariants>;

/** @public */
export interface AppShellProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Optional top region, rendered full-width above the sidebar/main row. */
  header?: React.ReactNode;
  /** Optional left region, rendered as a fixed-width `<aside>` beside main. */
  sidebar?: React.ReactNode;
  /** Main content, rendered inside `<main>`. */
  children: React.ReactNode;
  /** Sidebar width token: sm (224px) / md (256px) / lg (288px). Defaults to 'md'. */
  sidebarWidth?: NonNullable<AppShellVariantProps['sidebarWidth']>;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Renders a header/sidebar/main application frame, e.g. `<AppShell sidebar={<Nav />}>...</AppShell>`. */
export const AppShell = React.forwardRef<HTMLDivElement, AppShellProps>(function AppShell(
  { className, header, sidebar, sidebarWidth = 'md', children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cn('flex min-h-screen flex-col bg-background', className)} {...rest}>
      {header !== undefined && <header>{header}</header>}
      <div className="flex flex-1 min-w-0">
        {sidebar !== undefined && (
          <aside
            data-sidebar-width={sidebarWidth}
            className={cn(appShellVariants({ sidebarWidth }))}
          >
            {sidebar}
          </aside>
        )}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
});

/** @internal — CVA variant helper; compose via AppShell props instead. */
export { appShellVariants };
