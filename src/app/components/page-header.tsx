/**
 * PageHeader - the one header every screen opens with.
 * @category Layout
 * @tier pattern
 */

import * as React from 'react';
import hds from '../design-system/tokens';
import { cn } from '../../lib/utils';
import { Cluster } from './cluster';
import { Stack } from './stack';

/** @public */
export type PageHeaderLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** @public */
export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Trail above the title (a `Breadcrumb`). Omit on a top-level screen. */
  breadcrumb?: React.ReactNode;
  /** The screen title. Always set in the `heading2` type style; there is no size prop. */
  title: React.ReactNode;
  /** Status marker beside the title (a `Badge`). One marker, not a row of them. */
  status?: React.ReactNode;
  /** Screen-level actions, right-aligned; they wrap below the title on narrow widths. */
  actions?: React.ReactNode;
  /**
   * Heading element for the title. Changes only the DOM element, never the size:
   * the size is fixed at `heading2` so every screen reads at the same scale.
   * Defaults to 1; a screen has exactly one `PageHeader`.
   */
  level?: PageHeaderLevel;
}

/**
 * Screen header: breadcrumb slot, the title at the one canonical page-title size
 * (`heading2`), a status slot and an actions slot. Every screen has exactly one.
 * `display` and `h1` type are reserved for marketing and landing surfaces.
 *
 * Distinct from the docs-only page header in `src/docs-tooling`.
 * @screenPattern
 */
export const PageHeader = /* @__PURE__ */ React.forwardRef<HTMLElement, PageHeaderProps>(
  function PageHeader({ breadcrumb, title, status, actions, level = 1, className, ...props }, ref) {
    const Heading = `h${level}` as const;
    return (
      <header
        ref={ref}
        data-hds-component="PageHeader"
        className={cn('w-full', className)}
        {...props}
      >
        <Stack gap="tight">
          {breadcrumb ? <div data-slot="breadcrumb">{breadcrumb}</div> : null}
          <Cluster gap="normal" align="start" justify="space-between">
            <Cluster gap="tight" align="center">
              <Heading
                // inline-ok: the one canonical page-title size, bound to the heading2 type style
                style={{
                  ...hds.typeStyles.heading2,
                  margin: 0,
                  color: 'var(--semantic-color-content-primary)',
                }}
              >
                {title}
              </Heading>
              {status ? <div data-slot="status">{status}</div> : null}
            </Cluster>
            {actions ? (
              <div data-slot="actions" className="ml-auto">
                <Cluster gap="tight" align="center" justify="end">
                  {actions}
                </Cluster>
              </div>
            ) : null}
          </Cluster>
        </Stack>
      </header>
    );
  },
);
