/**
 * PageHeader - the one header every screen opens with.
 * @category Layout
 * @usage Open a screen with its title, plus optional breadcrumb, status and actions.
 * @tier pattern
 * @a11y component required a11y:page-header.title-menu-named The title menu button is named by titleMenuLabel and sits beside the heading.
 * @a11y component required a11y:page-header.title-menu-keyboard Tab reaches the title menu button; Enter opens it; Escape closes it and returns focus.
 */

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import hds from '../design-system/tokens';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Icon } from './icon';
import { Menu } from './menu';
import { Stack } from './stack';
import { Text } from './text';

/** @public */
export type PageHeaderLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** @public */
export type PageHeaderDescriptionPlacement = 'below' | 'title';

/** @public */
export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Trail above the title (a `Breadcrumb`). Omit on a top-level screen. */
  breadcrumb?: React.ReactNode;
  /** The screen title. Always set in the `heading2` type style; there is no size prop. */
  title: React.ReactNode;
  /** One supporting line under the title, in secondary body text. Only when it
   *  adds information; longer context belongs in the page body. */
  description?: React.ReactNode;
  /** `below` (default): under the title row. `title`: in the title column, beside the actions. */
  descriptionPlacement?: PageHeaderDescriptionPlacement;
  /** `Menu.Item`s for a chevron menu beside the title (rename, switch). */
  titleMenu?: React.ReactNode;
  /** Name of the title menu button. */
  titleMenuLabel?: string;
  /** Facts about the screen's subject (source, stage), as a wrapping row of
   *  `Badge`s above the title; mirrors `Card.Header`'s `metadata`. Facts only:
   *  the single state belongs in `status`. */
  metadata?: React.ReactNode;
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
 * (`heading2`), a metadata row above the title, a status slot and an actions slot. Every screen has exactly one.
 * `display` and `h1` type are reserved for marketing and landing surfaces.
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=2121-3
 * @screenPattern
 */
export const PageHeader = /* @__PURE__ */ React.forwardRef<HTMLElement, PageHeaderProps>(
  function PageHeader(
    {
      breadcrumb,
      title,
      description,
      descriptionPlacement = 'below',
      titleMenu,
      titleMenuLabel = 'Title options',
      metadata,
      status,
      actions,
      level = 1,
      className,
      ...props
    },
    ref,
  ) {
    const Heading = `h${level}` as const;
    const descriptionNode = description ? (
      <Text as="p" variant="body" data-slot="description" className="m-0 text-muted-foreground">
        {description}
      </Text>
    ) : null;
    const titleRow = (
      <Stack
        direction="row"
        wrap="wrap"
        gap="tight"
        align="center"
        justify="start"
        data-slot={descriptionPlacement === 'title' ? undefined : 'title-group'}
      >
        <Heading
          // inline-ok: the one canonical page-title size, bound to the title role
          style={{
            ...hds.typeStyles.title,
            margin: 0,
            color: 'var(--semantic-color-content-primary)',
          }}
        >
          {title}
        </Heading>
        {titleMenu ? (
          <div data-slot="title-menu">
            <Menu>
              <Menu.Trigger asChild>
                <Button
                  iconOnly
                  size="sm"
                  variant="tertiary"
                  label={titleMenuLabel}
                  iconLeft={<Icon icon={ChevronDown} size="small" />}
                />
              </Menu.Trigger>
              <Menu.Content align="start">{titleMenu}</Menu.Content>
            </Menu>
          </div>
        ) : null}
        {status ? <div data-slot="status">{status}</div> : null}
      </Stack>
    );
    return (
      <header
        ref={ref}
        data-hds-component="PageHeader"
        className={cn('w-full', className)}
        {...props}
      >
        <Stack gap="tight">
          {breadcrumb ? <div data-slot="breadcrumb">{breadcrumb}</div> : null}
          {metadata ? (
            <div data-slot="metadata">
              <Stack direction="row" wrap="wrap" gap="tight" align="center" justify="start">
                {metadata}
              </Stack>
            </div>
          ) : null}
          <Stack direction="row" wrap="wrap" gap="normal" align="start" justify="space-between">
            {descriptionPlacement === 'title' ? (
              <Stack gap="tight" data-slot="title-group">
                {titleRow}
                {descriptionNode}
              </Stack>
            ) : (
              titleRow
            )}
            {actions ? (
              <div data-slot="actions" className="ml-auto">
                <Stack direction="row" wrap="wrap" gap="tight" align="center" justify="end">
                  {actions}
                </Stack>
              </div>
            ) : null}
          </Stack>
          {descriptionPlacement === 'title' ? null : descriptionNode}
        </Stack>
      </header>
    );
  },
);
