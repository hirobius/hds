/**
 * NavItem - navigation row primitive for sidebars, table of contents, and list navigation.
 * @category Navigation
 * @tier primitive
 */
// motion-ok: motion delivered via Tailwind transition-colors on the state-keyed
// cva classes below; timing matches hds.motion.productive (150ms) via Tailwind's
// default transition-colors duration.
import { useState } from 'react';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  MouseEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import hds from '../design-system/tokens';
import { useHdsRouter } from '../context/RouterContext';
import { useLanguage } from '../context/LanguageContext';
import { useFrozenState } from '../context/DemoStateContext';
import { useFocusVisible } from '../hooks/useFocusVisible';
import { getNavLevelInset, type NavLevel } from '../lib/navLevels';

// ── Variants ───────────────────────────────────────────────────────────────────
// State colors previously lived in a NAV_STATE_TOKENS inline-style map (#93).
// `state` is the internal rest/hover/focus/active/disabled matrix — computed in
// JS (below) because it must also reflect Storybook's demo-state freeze
// (useFrozenState), not just real pointer/keyboard interaction, so it can't be
// expressed as bare `hover:`/`focus-visible:` pseudo-classes alone.

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- --primitive-size-interactive-min a11y touch target + --semantic-color-* state tokens have no Tailwind-theme utility; var()-based so still token-driven
const navItemVariants = cva(
  'relative flex min-h-[var(--primitive-size-interactive-min)] min-w-0 items-center no-underline transition-colors',
  {
    variants: {
      variant: {
        side: '',
        toc: '',
      },
      state: {
        default:
          'cursor-pointer bg-transparent text-[var(--semantic-color-content-secondary)] outline-none',
        hover:
          'cursor-pointer bg-[var(--semantic-color-surface-raised)] text-[var(--semantic-color-content-primary)] outline-none',
        focus:
          'cursor-pointer bg-transparent text-[var(--semantic-color-content-secondary)] outline outline-[length:var(--primitive-borderWidth-sm)] outline-[color:var(--semantic-color-border-accent)] outline-offset-2',
        active:
          'cursor-pointer bg-[var(--semantic-color-surface-accentSubtle)] text-[var(--semantic-color-content-accent)] outline-none',
        disabled:
          'cursor-default bg-transparent text-[var(--semantic-color-content-disabled)] outline-none',
      },
    },
    defaultVariants: { variant: 'side', state: 'default' },
  },
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- --primitive-borderWidth-sm indicator width + --semantic-color-border-* state tokens have no Tailwind-theme utility; var()-based so still token-driven
const navIndicatorVariants = cva(
  'absolute inset-y-0 w-[length:var(--primitive-borderWidth-sm)] transition-colors',
  {
    variants: {
      state: {
        default: 'bg-[var(--semantic-color-border-default)]',
        hover: 'bg-[var(--semantic-color-border-strong)]',
        focus: 'bg-[var(--semantic-color-border-default)]',
        active: 'bg-[var(--semantic-color-border-accent)]',
        disabled: 'bg-transparent',
      },
    },
    defaultVariants: { state: 'default' },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type NavItemVariantProps = VariantProps<typeof navItemVariants>;
type NavVariant = NonNullable<NavItemVariantProps['variant']>;
type NavState = NonNullable<NavItemVariantProps['state']>;
/** Internal visual state matrix — `pressed` collapses into `active` (identical tokens). */
type NavVisualState = NavState | 'pressed';

type NavNativeProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'onClick'>;

interface NavProps extends NavNativeProps {
  /** Visual layout variant for side nav or table of contents usage. */
  variant?: NavVariant;
  /** Text label displayed inside the navigation row. */
  label: string;
  /** Marks the item as the current route. */
  active?: boolean;
  /** Disables interaction and muted the nav row. */
  disabled?: boolean;
  /** Visual hierarchy level for the navigation row. */
  level?: NavLevel;
  /** Navigation callback fired before the browser follows the link. */
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

const NAV_VARIANT_LAYOUT: Record<
  NavVariant,
  {
    typeStyle: CSSProperties;
    leadingPaddingX: string;
    trailingPaddingX: string;
    paddingY: string;
    width: (inset: string) => string;
  }
> = {
  side: {
    typeStyle: hds.typeStyles.ui,
    leadingPaddingX: hds.semantic.space.sidebar.railPadding,
    trailingPaddingX: 'var(--component-nav-paddingX)',
    paddingY: 'var(--component-nav-paddingY)',
    width: (inset) => `calc(100% - ${inset})`,
  },
  toc: {
    typeStyle: hds.typeStyles.ui,
    leadingPaddingX: hds.semantic.space.sidebar.sectionGap,
    trailingPaddingX: hds.semantic.space.sidebar.gap,
    paddingY: 'var(--component-nav-paddingY)',
    width: () => '100%',
  },
};

/** @public */
export function NavItem({
  variant = 'side',
  label,
  href,
  active = false,
  disabled = false,
  level = 'root',
  onNavigate,
  className,
  style,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onBlur,
  ...rest
}: NavProps) {
  const { isRtl } = useLanguage();
  const { navigate } = useHdsRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  // Modality-aware focus ring — shared seam with side-nav (ADR-015).
  const { isFocusVisible, onFocus: onFocusVisible, clearFocusVisible } = useFocusVisible();
  const frozenState = useFrozenState();
  const effectiveDemoState = frozenState;
  const layout = NAV_VARIANT_LAYOUT[variant];
  const normalizedDemoState: NavVisualState | undefined =
    effectiveDemoState === 'focused' ? 'focus' : (effectiveDemoState as NavVisualState | undefined);
  const visualState: NavVisualState = disabled
    ? 'disabled'
    : active
      ? 'active'
      : (normalizedDemoState ??
        (isPressed ? 'pressed' : isFocusVisible ? 'focus' : isHovered ? 'hover' : 'default'));
  // `pressed` shares active's tokens (background/text/indicator) — collapse for
  // both the data-state attribute and the cva state lookup.
  const state: NavState = visualState === 'pressed' ? 'active' : visualState;
  const showActive = active || visualState === 'active' || visualState === 'pressed';

  const inset = variant === 'side' ? getNavLevelInset(level) : '0px';
  const rowClassName = cn(
    navItemVariants({ variant, state }),
    isRtl ? 'text-right' : 'text-left',
    className,
  );
  const baseStyle: CSSProperties = {
    ...layout.typeStyle,
    marginLeft: isRtl ? 0 : inset,
    marginRight: isRtl ? inset : 0,
    width: layout.width(inset),
    paddingTop: layout.paddingY,
    paddingBottom: layout.paddingY,
    paddingLeft: isRtl ? layout.trailingPaddingX : layout.leadingPaddingX,
    paddingRight: isRtl ? layout.leadingPaddingX : layout.trailingPaddingX,
    pointerEvents: frozenState !== null ? 'none' : undefined,
    ...style,
  };
  const isInternalHref = typeof href === 'string' && href.startsWith('/');

  const sharedProps = {
    style: baseStyle,
    className: rowClassName,
    'data-disabled': disabled ? 'true' : undefined,
    'data-level': level,
    'data-state': state,
    'data-variant': variant,
    onFocus: (event: ReactFocusEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      onFocusVisible(event.currentTarget);
      onFocus?.(event as ReactFocusEvent<HTMLAnchorElement>);
    },
    onMouseEnter: (event: ReactMouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      setIsHovered(true);
      onMouseEnter?.(event as ReactMouseEvent<HTMLAnchorElement>);
    },
    onMouseLeave: (event: ReactMouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      setIsHovered(false);
      setIsPressed(false);
      onMouseLeave?.(event as ReactMouseEvent<HTMLAnchorElement>);
    },
    onPointerDown: (event: ReactPointerEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      setIsPressed(true);
      clearFocusVisible();
      onPointerDown?.(event as ReactPointerEvent<HTMLAnchorElement>);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      setIsPressed(false);
      onPointerUp?.(event as ReactPointerEvent<HTMLAnchorElement>);
    },
    onPointerCancel: (event: ReactPointerEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      setIsPressed(false);
      onPointerCancel?.(event as ReactPointerEvent<HTMLAnchorElement>);
    },
    onBlur: (event: ReactFocusEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      clearFocusVisible();
      setIsPressed(false);
      onBlur?.(event as ReactFocusEvent<HTMLAnchorElement>);
    },
  };

  const content = (
    <>
      {variant === 'toc' && (
        <div className={cn(navIndicatorVariants({ state }), isRtl ? 'right-0' : 'left-0')} />
      )}
      <span style={layout.typeStyle}>{label}</span>
    </>
  );

  if (!href) {
    return (
      <button // audit-ok: focus ring driven by the state-keyed cva `focus` branch (outline utilities above), not a literal hds-focus/focus-visible: substring — see ADR-015 useFocusVisible
        type="button"
        disabled={disabled}
        aria-disabled={disabled || undefined}
        {...(rest as unknown as ButtonHTMLAttributes<HTMLButtonElement>)}
        {...sharedProps}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onNavigate?.(event as unknown as MouseEvent<HTMLAnchorElement>);
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <a // audit-ok: focus ring driven by the state-keyed cva `focus` branch (outline utilities above), not a literal hds-focus/focus-visible: substring — see ADR-015 useFocusVisible
      href={disabled ? undefined : href}
      aria-disabled={disabled || undefined}
      aria-current={
        showActive ? (rest['aria-current'] ?? (variant === 'toc' ? 'location' : 'page')) : undefined
      }
      {...sharedProps}
      {...rest}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onNavigate?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (
          isInternalHref &&
          event.button === 0 &&
          !event.metaKey &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.shiftKey
        ) {
          event.preventDefault();
          navigate(href);
          return;
        }
      }}
    >
      {content}
    </a>
  );
}

/** @internal — CVA variant helpers; compose via NavItem props instead. */
export { navItemVariants, navIndicatorVariants };
