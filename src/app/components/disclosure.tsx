/**
 * Disclosure - compact disclosure surface for optional explanatory content.
 * @category Layout
 * @tier pattern
 */
import React, { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import hds from '../design-system/tokens';
import { Icon } from './icon';
import { Stack } from './stack';
import { Surface } from './surface';

type DisclosureVariant = 'panel' | 'nav' | 'card';

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

/** @public */
export const Disclosure = React.forwardRef<HTMLDivElement, DisclosureProps>(function Disclosure({
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
}, ref) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [hovered, setHovered] = useState(false);
  const panelId = useId();
  const resolvedOpen = open ?? internalOpen;

  function handleToggle() {
    const nextOpen = !resolvedOpen;
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  const triggerClassName = [
    'hds-focus',
    variant === 'nav' ? 'hds-text-hover hds-bg-hover-neutral' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  const baseTriggerStyle: CSSProperties = {
    display: variant === 'card' ? 'grid' : 'flex',
    alignItems: 'center',
    justifyContent: variant === 'card' ? undefined : 'space-between',
    width: '100%',
    gap: hds.semantic.space.sidebar.gap,
    color: 'var(--semantic-color-content-primary)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: [
      `border-color ${hds.motion.productive.duration}s ${hds.motion.productive.easing}`,
      `box-shadow ${hds.motion.productive.duration}s ${hds.motion.productive.easing}`,
      `color ${hds.motion.productive.duration}s ${hds.motion.productive.easing}`,
    ].join(', '),
  };

  const variantTriggerStyle: Record<DisclosureVariant, CSSProperties> = {
    panel: {
      minWidth: 0,
    },
    nav: {
      paddingBlock: 'var(--component-nav-paddingY)',
      paddingInline: 0,
      border: 'none',
      borderRadius: hds.borderRadius.action,
      background: resolvedOpen || hovered ? 'var(--semantic-color-surface-raised)' : 'transparent',
    },
    card: {
      gridTemplateColumns: 'minmax(0, 1fr) auto', // grid-ok: label + caret row; minmax(0,1fr) lets label shrink to any viewport, caret is small auto column
      columnGap: hds.semantic.space.component.gap,
      rowGap: resolvedOpen ? hds.semantic.space.component.gap : 0,
    },
  };

  const containerGap = variant === 'panel'
    ? (resolvedOpen ? hds.semantic.space.sidebar.gap : 0)
    : variant === 'card'
      ? resolvedOpen ? hds.semantic.space.component.gap : 0
      : resolvedOpen ? hds.semantic.space.sidebar.sectionGap : 0;

  const labelContent = typeof label === 'string'
    ? (
        <span style={{ ...(variant === 'nav' ? hds.typeStyles.ui : hds.typeStyles.caption), margin: 0, color: 'currentColor' }}>
          {label}
        </span>
      )
    : label;

  const disclosureBody = (
    <>
      <button // audit-ok: hds-focus applied via triggerClassName variable
        type="button"
        onClick={handleToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-expanded={resolvedOpen}
      aria-controls={panelId}
      className={triggerClassName}
      style={{
          ...baseTriggerStyle,
          ...variantTriggerStyle[variant],
          ...triggerStyle,
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: 1,
            ['display']: 'grid',
            gap: hds.semantic.space.subgrid.gap,
            alignItems: 'start',
          }}
        >
          {labelContent}
        </div>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: resolvedOpen ? 0 : -90 }}
          transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
          style={{
            display: 'inline-grid',
            placeItems: 'center',
            width: hds.iconSize.small,
            height: hds.iconSize.small,
            flexShrink: 0,
            alignSelf: 'center',
            lineHeight: 0,
            transformOrigin: '50% 50%',
            overflow: 'hidden',
          }}
        >
          <Icon
            icon={ChevronDown}
            size="small"
            color="currentColor"
          />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {resolvedOpen && (
          <motion.div
            id={panelId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
            style={{ overflow: 'hidden' }}
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
      <Stack
        ref={ref}
        gap="tight"
        style={{ gap: containerGap }}
      >
        {disclosureBody}
      </Stack>
    );
  }

  return (
    <Surface
      ref={ref}
      padding="component"
      style={{
        overflow: variant === 'card' ? 'hidden' : undefined,
      }}
    >
      <Stack gap="tight" style={{ gap: containerGap }}>
        {disclosureBody}
      </Stack>
    </Surface>
  );
});
