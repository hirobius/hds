/**
 * EmptyState — consistent no-data placeholder for lists, grids, and sections.
 * @category Display
 * @tier primitive
 * @usage Say that a list, grid or section has no data yet, with a title, an optional description, and an optional action that teaches the next step. When the empty state is the whole view and teaches the first step, use variant="teaching" (centred, icon tile, bold title); add framed when it sits loose on the page.
 * @whenNot Content that is still loading, or a full-page error.
 * @useInstead Skeleton content that is still loading
 * @useInstead Alert a message about something that went wrong
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=88-352
 * @a11y component required a11y:empty-state.icon-decorative The icon, and the teaching variant's icon tile, are hidden from assistive technology; the title carries the message.
 * @a11y component required a11y:empty-state.reading-order Title, description and action are read in the order they are shown, in the inline and the teaching layout; the title is a paragraph, not a heading.
 * @a11y consumer required When the empty state is a whole region's content, name the region yourself (a heading or aria-label on the section); the title is not a heading.
 * @ai-intent Inline empty-state placeholder so any list, grid, or section can
 *   communicate "no data yet" with consistent muted typography instead of agents
 *   inventing one-off `<p>No items.</p>` lines.
 * @ai-rules Use only for inline empty states inside an existing section. Do NOT
 *   use for full-page errors (use ErrorPage) or for loading states (use a
 *   skeleton). Do NOT wrap in Surface or Card — the empty state is a
 *   typographic message, not a chrome-bearing container; when a loose
 *   teaching empty state needs a panel, pass `framed` instead.
 */

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Icon } from './icon';
import { Text } from './text';

/** @public */
export type EmptyStateVariant = 'inline' | 'teaching';

/** @public */
export interface EmptyStateProps {
  /**
   * `inline` (default): a left-aligned muted line inside a section. `teaching`:
   * one centred column for a view that is empty and teaches the first step, with
   * the icon in a tile, a bold title, and the action set further below (hds#863).
   */
  variant?: EmptyStateVariant;
  /**
   * `variant="teaching"` only: draw it in one raised panel (a card fill, no
   * outline) when it sits loose on the page rather than inside a panel already.
   */
  framed?: boolean;
  /** Optional Lucide icon shown above the title. Decorative: hidden from assistive tech. */
  icon?: LucideIcon;
  /** Primary message. Sentence-case, no trailing period required. */
  title: React.ReactNode;
  /** Optional supporting line. */
  description?: React.ReactNode;
  /** Optional action that fills the space, rendered under the description. */
  action?: React.ReactNode;
  /**
   * Set the message in italic. Defaults to `false` (upright) for both
   * variants; pass `italic` to opt the message back in to italic.
   */
  italic?: boolean;
  /** Escape hatch for layout adjustments — token-only, no business logic. */
  className?: string;
}

// The tile is the 40px square semantic.size.row.compact (the same square as the Tag dismiss hit area, so it adds no CSS rule) on surface.muted; var()-based, token-driven.
const TILE_CLASS =
  'inline-flex size-[var(--semantic-size-row-compact)] items-center justify-center rounded-md bg-[var(--semantic-color-surface-muted)] text-foreground';

/** @public */
export const EmptyState = /* @__PURE__ */ React.forwardRef<HTMLDivElement, EmptyStateProps>(
  function EmptyState(
    {
      variant = 'inline',
      framed = false,
      icon,
      title,
      description,
      action,
      italic = false,
      className,
    },
    ref,
  ) {
    const teaching = variant === 'teaching';
    const isFramed = teaching && framed;
    return (
      <div
        ref={ref}
        data-hds-component="EmptyState"
        data-variant={teaching ? variant : undefined}
        data-framed={isFramed ? 'true' : undefined}
        className={cn(
          'flex flex-col gap-fixed-2xs hds-type-ui text-muted-foreground',
          italic ? 'italic' : 'not-italic',
          teaching && 'items-center gap-scale-xs text-center',
          isFramed && 'rounded-lg bg-card p-surface-padding',
          className,
        )}
      >
        {icon &&
          (teaching ? (
            <span data-hds-empty-state-tile="" aria-hidden="true" className={TILE_CLASS}>
              <Icon icon={icon} size="medium" />
            </span>
          ) : (
            <Icon icon={icon} size="medium" />
          ))}
        {/* Teaching: the title steps up through Text (body role, bold weight step, primary content colour). */}
        {teaching ? (
          <Text as="p" variant="body" weight="bold" tone="primary">
            {title}
          </Text>
        ) : (
          <p className="m-0">{title}</p>
        )}
        {description && <p className="m-0 not-italic hds-type-caption">{description}</p>}
        {/* not-italic: the root is italic for the message; the action opts back
            out so a button or link inside keeps its own type style. The wrapper
            also keeps the action at its natural width instead of stretching.
            Teaching sets the action one more step (scale.xs) below the sentence. */}
        {action && <div className={cn('not-italic', teaching && 'pt-scale-xs')}>{action}</div>}
      </div>
    );
  },
);
