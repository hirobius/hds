/**
 * Disclosure - compact disclosure surface for optional explanatory content.
 * @category Layout
 * @tier pattern
 * @usage Hide optional explanatory content behind a heading that people can expand. An expandable list row (one-line preview, actions beside the trigger) is variant="row".
 * @whenNot Content people must see, or switching between panels.
 * @useInstead Tabs switching between panels of content
 * @a11y component required a11y:disclosure.expanded-state The trigger is a button whose aria-expanded follows the panel and whose aria-controls names it.
 * @a11y component required a11y:disclosure.keyboard Enter and Space toggle it.
 * @a11y component required a11y:disclosure.hidden-collapsed A collapsed panel stays in the document but is visibility:hidden once its collapse ends, so assistive technology and the tab order cannot reach it.
 * @a11y component required a11y:disclosure.focus-return Collapsing while focus is inside the panel returns focus to the trigger.
 * @a11y component required a11y:disclosure.focus-ring The trigger carries the shared focus ring.
 * @a11y component required a11y:disclosure.target-size The trigger is at least 24px tall in every variant (WCAG 2.5.8).
 * @a11y component required a11y:disclosure.chevron-hidden The chevron is decorative and hidden from assistive technology.
 * @a11y component required gate:check-reduced-motion The height, visibility and chevron transitions take their duration from the --hds-motion-productive token, which is zero under prefers-reduced-motion, so the panel opens instantly.
 * @a11y component required a11y:disclosure.row-preview The row variant shows a one-line preview while collapsed and hides it (visibility:hidden) once open, so the text is never read twice.
 * @a11y component required a11y:disclosure.row-actions The row variant's actions sit beside the trigger, never inside it, so no interactive control is nested in the button.
 * @a11y component required a11y:disclosure.row-expanded-state The row trigger keeps aria-expanded and aria-controls like every variant.
 * @a11y component required a11y:disclosure.row-target-size The row trigger is at least 24px tall (WCAG 2.5.8).
 * @a11y component required a11y:disclosure.row-keyboard Enter and Space toggle the row; Tab then reaches its actions.
 * @a11y consumer recommended Put the Disclosure under a heading of the right level when it introduces a section, so the section stays in the outline.
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=88-453
 */
import React, { useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { scale, sidebar, subgrid, typeStyles } from '../design-system/component-tokens';
import { Icon } from './icon';
import { Surface } from './surface';

type DisclosureVariant = 'panel' | 'nav' | 'card' | 'row';

// ── Variants ───────────────────────────────────────────────────────────────────
// `variant` is the structural axis (panel | nav | card). Open/closed state is
// expressed the Radix way — a `data-state="open"|"closed"` attribute on the
// trigger driving `data-[state=open]:` selectors — instead of the previous JS
// `hovered` boolean re-rendering an inline style object on every mousemove.
// Height and chevron rotation are CSS transitions on the productive motion token
// (see `collapse` and `tween` below), not motion/react (hds#1508).
// min-h: the caption-size label is 18px tall, under the 24px WCAG 2.5.8 floor (hds#520).
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- sidebar/component-disclosure/surface/radius tokens have no Tailwind-theme utility; var()-based so still token-driven
const disclosureTriggerVariants = /* @__PURE__ */ cva(
  // tier-ok: 24px WCAG 2.5.8 target floor, not tenant-scaled (hds#520)
  'flex min-h-[var(--primitive-size-interactive-minCompact)] hds-touch-row w-full cursor-pointer items-center gap-[var(--semantic-space-sidebar-gap)] text-left text-foreground transition-[border-color,box-shadow,color]',
  {
    variants: {
      variant: {
        panel: 'min-w-0 justify-between',
        nav: 'justify-between rounded-[var(--semantic-radius-action)] border-0 px-0 py-[var(--component-disclosure-paddingY)] hover:bg-[var(--semantic-color-surface-raised)] data-[state=open]:bg-[var(--semantic-color-surface-raised)]',
        // row: list row; the trigger holds label + preview + chevron, actions are a sibling
        row: 'min-w-0 justify-between py-[var(--semantic-space-scale-xs)]',
        // grid-ok: label + caret row; minmax(0,1fr) lets label shrink to any viewport, caret is a small auto column
        card: 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[var(--semantic-space-scale-xs)] gap-y-0 data-[state=open]:gap-y-[var(--semantic-space-scale-xs)]',
      },
    },
    defaultVariants: { variant: 'panel' },
  },
);

// The space between trigger and body. It is the body's top padding, not the wrapper's gap:
// a gap that flips 0 -> N in the opening frame moves the rows below before the height tween
// starts (hds#1508), while padding inside the tweened body grows with it.
const disclosureBodyInset: Partial<Record<DisclosureVariant, string>> = {
  panel: sidebar.gap,
  nav: sidebar.sectionGap,
};

// One height tween for the body and the row preview: `grid-template-rows` 0fr -> 1fr on the
// productive motion token, so the two move in the same frame and the rows below travel one way
// (hds#1508). The token var is zero under prefers-reduced-motion, so the change is instant there.
// `visibility` rides the same duration: a closed panel stays visible while it collapses, then
// leaves the accessibility tree and the tab order.
const tween = 'all var(--hds-motion-productive)';

function collapse(
  show: boolean,
  content: ReactNode,
  panel?: { ref: React.Ref<HTMLDivElement>; id: string },
) {
  return (
    <div
      {...panel}
      className="grid"
      style={{
        gridTemplateRows: show ? '1fr' : '0fr',
        visibility: show ? 'visible' : 'hidden',
        transition: tween,
      }}
    >
      <div className="min-h-0 overflow-hidden">{content}</div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type DisclosureProps = {
  /** Summary label rendered in the disclosure trigger. Accepts a string or ReactNode for icon+label combos. */
  label: ReactNode;
  /** Whether the disclosure starts in the open state. */
  defaultOpen?: boolean;
  /** Controlled open state. */
  open?: boolean;
  /** Called whenever the disclosure toggles. */
  onOpenChange?: (open: boolean) => void;
  /** Visual treatment for docs panels, nav groups, summary cards, or expandable list rows. */
  variant?: DisclosureVariant;
  /** variant="row" only: one-line preview under the label, clamped to a single line and hidden while open. */
  preview?: ReactNode;
  /** variant="row" only: controls rendered beside the trigger (outside the button, so nothing interactive nests inside it). */
  actions?: ReactNode;
  /** Keeps the disclosure visually highlighted even when closed. */
  accent?: boolean;
  /** Optional className passthrough for the trigger. */
  className?: string;
  /** Optional trigger style overrides. */
  triggerStyle?: CSSProperties;
  /** Optional inner content style overrides. */
  contentStyle?: CSSProperties;
  /** Content revealed when the disclosure is expanded. */
  children: ReactNode;
};

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export const Disclosure = /* @__PURE__ */ React.forwardRef<HTMLDivElement, DisclosureProps>(
  function Disclosure(
    {
      label,
      defaultOpen = false,
      open,
      onOpenChange,
      variant = 'panel',
      preview,
      actions,
      accent: _accent = false,
      className,
      triggerStyle,
      contentStyle,
      children,
    },
    ref,
  ) {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const panelId = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const resolvedOpen = open ?? internalOpen;

    function handleToggle() {
      const nextOpen = !resolvedOpen;
      // If collapsing while focus sits on a child inside the (about-to-unmount)
      // panel, return focus to the trigger so it doesn't fall to <body>.
      if (!nextOpen && panelRef.current?.contains(document.activeElement)) {
        triggerRef.current?.focus();
      }
      if (open === undefined) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    }

    const triggerClassName = cn(
      'hds-focus hds-touch-row',
      disclosureTriggerVariants({ variant }),
      variant === 'nav' ? 'hds-text-hover hds-bg-hover-neutral' : '',
      className,
    );

    const labelContent =
      typeof label === 'string' ? (
        <span
          className="m-0 text-current"
          style={variant === 'nav' ? typeStyles.ui : typeStyles.caption}
        >
          {label}
        </span>
      ) : (
        label
      );

    const isRow = variant === 'row';

    const triggerButton = (
      <button // audit-ok: hds-focus applied via triggerClassName variable
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={resolvedOpen}
        aria-controls={panelId}
        data-state={resolvedOpen ? 'open' : 'closed'}
        className={triggerClassName}
        style={triggerStyle}
      >
        <div className="grid min-w-0 flex-1 items-start">
          {labelContent}
          {isRow &&
            preview != null &&
            preview !== false &&
            collapse(
              !resolvedOpen,
              // The label-to-preview gap lives on the preview, so it collapses with it.
              <span
                className="block min-w-0 truncate text-muted-foreground"
                style={{ ...typeStyles.caption, paddingTop: subgrid.gap }}
              >
                {preview}
              </span>,
            )}
        </div>
        <span
          aria-hidden="true"
          style={{
            transform: resolvedOpen ? 'none' : 'rotate(-90deg)',
            transition: tween,
          }}
          // Was --primitive-typography-size-base: a chevron BOX sized off the body
          // type rung, so a ramp change would have resized it. Now the icon token.
          // type-ramp-ok: leading-none on an icon box, not text
          // eslint-disable-next-line tailwindcss/no-arbitrary-value -- icon-size token has no Tailwind-theme utility; var()-based so still token-driven
          className="inline-grid size-[var(--hds-icon-small)] shrink-0 origin-center place-items-center self-center overflow-hidden leading-none"
        >
          <Icon icon={ChevronDown} size="small" color="currentColor" />
        </span>
      </button>
    );

    const disclosureBody = (
      <>
        {isRow ? (
          // The trigger keeps its top when the preview collapses; the actions stay centred on the row.
          // eslint-disable-next-line tailwindcss/no-arbitrary-value -- scale token has no Tailwind-theme utility; var()-based so still token-driven
          <div className="flex min-w-0 items-start gap-[var(--semantic-space-scale-xs)]">
            {triggerButton}
            {actions != null && (
              <div className="flex shrink-0 items-center self-center">{actions}</div>
            )}
          </div>
        ) : (
          triggerButton
        )}

        {collapse(
          resolvedOpen,
          <div
            style={{
              paddingTop: disclosureBodyInset[variant] ?? scale.xs,
              ...contentStyle,
            }}
          >
            {children}
          </div>,
          { ref: panelRef, id: panelId },
        )}
      </>
    );

    if (isRow || variant === 'nav') {
      return <div ref={ref}>{disclosureBody}</div>;
    }

    return (
      <Surface
        ref={ref}
        padding="component"
        className={variant === 'card' ? 'overflow-hidden' : undefined}
      >
        {disclosureBody}
      </Surface>
    );
  },
);
