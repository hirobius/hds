/**
 * Disclosure - compact disclosure surface for optional explanatory content.
 * @category Layout
 * @tier pattern
 */
import React, { useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import hds from '../design-system/tokens';
import { Icon } from './icon';
import { Stack } from './stack';
import { Surface } from './surface';

type DisclosureVariant = 'panel' | 'nav' | 'card';

// ── Variants ───────────────────────────────────────────────────────────────────
// `variant` is the structural axis (panel | nav | card). Open/closed state is
// expressed the Radix way — a `data-state="open"|"closed"` attribute on the
// trigger driving `data-[state=open]:` selectors — instead of the previous JS
// `hovered` boolean re-rendering an inline style object on every mousemove.
// Height/opacity/chevron-rotation stay motion/react-driven (JS spring/tween
// timing an accordion needs, not a CSS transition), so that animation is
// untouched by this migration — only the static layout/color styling moved.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- sidebar/component-nav/surface/radius tokens have no Tailwind-theme utility; var()-based so still token-driven
const disclosureTriggerVariants = cva(
  'flex w-full cursor-pointer items-center gap-[var(--semantic-space-sidebar-gap)] text-left text-primary transition-[border-color,box-shadow,color]',
  {
    variants: {
      variant: {
        panel: 'min-w-0 justify-between',
        nav: 'justify-between rounded-[var(--semantic-radius-action)] border-0 px-0 py-[var(--component-nav-paddingY)] hover:bg-[var(--semantic-color-surface-raised)] data-[state=open]:bg-[var(--semantic-color-surface-raised)]',
        // grid-ok: label + caret row; minmax(0,1fr) lets label shrink to any viewport, caret is a small auto column
        card: 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[var(--semantic-space-component-gap)] gap-y-0 data-[state=open]:gap-y-[var(--semantic-space-component-gap)]',
      },
    },
    defaultVariants: { variant: 'panel' },
  },
);

const disclosureContainerGap: Record<DisclosureVariant, string> = {
  panel: hds.semantic.space.sidebar.gap,
  nav: hds.semantic.space.sidebar.sectionGap,
  card: hds.semantic.space.component.gap,
};

// ── Types ──────────────────────────────────────────────────────────────────────

type DisclosureProps = {
  /** Summary label rendered in the disclosure trigger. Accepts a string or ReactNode for icon+label combos. */
  label: ReactNode;
  /** Whether the disclosure starts in the open state. */
  defaultOpen?: boolean;
  /** Controlled open state. */
  open?: boolean;
  /** Called whenever the disclosure toggles. */
  onOpenChange?: (open: boolean) => void;
  /** Visual treatment for docs panels, nav groups, or summary cards. */
  variant?: DisclosureVariant;
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
export const Disclosure = React.forwardRef<HTMLDivElement, DisclosureProps>(function Disclosure(
  {
    label,
    defaultOpen = false,
    open,
    onOpenChange,
    variant = 'panel',
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
  const state = resolvedOpen ? 'open' : 'closed';

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
    'hds-focus',
    disclosureTriggerVariants({ variant }),
    variant === 'nav' ? 'hds-text-hover hds-bg-hover-neutral' : '',
    className,
  );

  const containerGap = resolvedOpen ? disclosureContainerGap[variant] : 0;

  const labelContent =
    typeof label === 'string' ? (
      <span
        className="m-0 text-current"
        style={variant === 'nav' ? hds.typeStyles.ui : hds.typeStyles.caption}
      >
        {label}
      </span>
    ) : (
      label
    );

  const disclosureBody = (
    <>
      <button // audit-ok: hds-focus applied via triggerClassName variable
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={resolvedOpen}
        aria-controls={panelId}
        data-state={state}
        className={triggerClassName}
        style={triggerStyle}
      >
        {/* eslint-disable-next-line tailwindcss/no-arbitrary-value -- subgrid gap token has no Tailwind-theme utility; var()-based so still token-driven */}
        <div className="grid min-w-0 flex-1 items-start gap-[var(--semantic-space-subgrid-gap)]">
          {labelContent}
        </div>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: resolvedOpen ? 0 : -90 }}
          transition={{
            duration: hds.motion.productive.duration,
            ease: hds.motion.productive.easing,
          }}
          // eslint-disable-next-line tailwindcss/no-arbitrary-value -- icon-size token has no Tailwind-theme utility; var()-based so still token-driven
          className="inline-grid size-[var(--primitive-typography-size-base)] shrink-0 origin-center place-items-center self-center overflow-hidden leading-none"
        >
          <Icon icon={ChevronDown} size="small" color="currentColor" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {resolvedOpen && (
          <motion.div
            ref={panelRef}
            id={panelId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              duration: hds.motion.productive.duration,
              ease: hds.motion.productive.easing,
            }}
            className="overflow-hidden"
          >
            <div
              style={{
                ...contentStyle,
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (variant === 'nav') {
    return (
      <Stack ref={ref} gap="tight" style={{ gap: containerGap }}>
        {disclosureBody}
      </Stack>
    );
  }

  return (
    <Surface
      ref={ref}
      padding="component"
      className={variant === 'card' ? 'overflow-hidden' : undefined}
    >
      <Stack gap="tight" style={{ gap: containerGap }}>
        {disclosureBody}
      </Stack>
    </Surface>
  );
});

/** @internal — CVA variant helper; compose via Disclosure props instead. */
export { disclosureTriggerVariants };
