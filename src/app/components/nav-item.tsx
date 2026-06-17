/**
 * NavItem - navigation row primitive for sidebars, table of contents, and list navigation.
 * @category Navigation
 * @tier primitive
 */
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
import { useNavigate } from 'react-router';
import hds from '../design-system/tokens';
import { useLanguage } from '../context/LanguageContext';
import { useFrozenState } from '../context/DemoStateContext';
import { getNavLevelInset, type NavLevel } from '../lib/navLevels';

const navItemStyles = {
  tocIndicatorBase: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    width: 2,
  } satisfies React.CSSProperties,
} as const;

type NavVariant = 'side' | 'toc';
type NavState = 'default' | 'hover' | 'focus' | 'active' | 'disabled';

type NavNativeProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'onClick'>;
type NavVisualState = NavState | 'pressed';

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

const NAV_STATE_TOKENS = {
  indicator: {
    idle: 'var(--semantic-color-border-default)',
    hover: 'var(--semantic-color-border-strong)',
    active: 'var(--semantic-color-border-accent)',
  },
  background: {
    idle: 'transparent',
    hover: 'var(--semantic-color-surface-raised)',
    pressed: 'var(--semantic-color-surface-accentSubtle)',
    active: 'var(--semantic-color-surface-accentSubtle)',
    disabled: 'transparent',
  },
  text: {
    idle: 'var(--semantic-color-content-secondary)',
    active: 'var(--semantic-color-content-accent)',
    disabled: 'var(--semantic-color-content-disabled)',
  },
} as const;

const NAV_VARIANT_LAYOUT: Record<NavVariant, {
  typeStyle: CSSProperties;
  leadingPaddingX: string;
  trailingPaddingX: string;
  paddingY: string;
  width: (inset: string) => string;
}> = {
  side: {
    typeStyle: hds.typeStyles.ui,
    leadingPaddingX: hds.semantic.space.sidebar.railPadding,
    trailingPaddingX: 'var(--component-nav-paddingX)',
    paddingY: 'var(--component-nav-paddingY)',
    width: inset => `calc(100% - ${inset})`,
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
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const frozenState = useFrozenState();
  const effectiveDemoState = frozenState;
  const layout = NAV_VARIANT_LAYOUT[variant];
  const normalizedDemoState: NavVisualState | undefined = effectiveDemoState === 'focused'
    ? 'focus'
    : effectiveDemoState as NavVisualState | undefined;
  const visualState: NavVisualState = disabled
    ? 'disabled'
    : active
      ? 'active'
      : normalizedDemoState ?? (isPressed ? 'pressed' : isFocusVisible ? 'focus' : isHovered ? 'hover' : 'default');

  const showHover = visualState === 'hover';
  const showFocus = visualState === 'focus';
  const showPressed = visualState === 'pressed';
  const showActive = active || visualState === 'active';
  const indicatorColor = visualState === 'disabled'
    ? 'transparent'
    : showActive || showPressed
      ? NAV_STATE_TOKENS.indicator.active
      : showHover
        ? NAV_STATE_TOKENS.indicator.hover
        : NAV_STATE_TOKENS.indicator.idle;
  const backgroundColor = visualState === 'disabled'
    ? NAV_STATE_TOKENS.background.disabled
    : showActive
      ? NAV_STATE_TOKENS.background.active
      : showPressed
        ? NAV_STATE_TOKENS.background.pressed
        : showHover
          ? NAV_STATE_TOKENS.background.hover
          : NAV_STATE_TOKENS.background.idle;
  const idleTextColor = variant === 'side'
    ? 'var(--semantic-color-content-secondary)'
    : NAV_STATE_TOKENS.text.idle;
  const textColor = visualState === 'disabled'
    ? NAV_STATE_TOKENS.text.disabled
    : showActive || showPressed
      ? NAV_STATE_TOKENS.text.active
      : showHover
        ? 'var(--semantic-color-content-primary)'
      : idleTextColor;
  const inset = variant === 'side' ? getNavLevelInset(level) : '0px';
  const baseStyle: CSSProperties = {
    ...layout.typeStyle,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginLeft: isRtl ? 0 : inset,
    marginRight: isRtl ? inset : 0,
    width: layout.width(inset),
    minWidth: 0,
    minHeight: 'var(--primitive-size-interactive-min)', // tier-ok: a11y touch target — 44px min interactive size has no semantic alias
    paddingTop: layout.paddingY,
    paddingBottom: layout.paddingY,
    paddingLeft: isRtl ? layout.trailingPaddingX : layout.leadingPaddingX,
    paddingRight: isRtl ? layout.leadingPaddingX : layout.trailingPaddingX,
    textDecoration: 'none',
    textAlign: isRtl ? 'right' : 'left',
    color: textColor,
    backgroundColor,
    outline: showFocus ? `${hds.borderWidth.sm} solid var(--semantic-color-border-accent)` : 'none',
    outlineOffset: showFocus ? '2px' : undefined,
    cursor: visualState === 'disabled' ? 'default' : 'pointer',
    pointerEvents: frozenState !== null ? 'none' : undefined,
    transition: `background-color ${hds.motion.productive.duration}s ease, color ${hds.motion.productive.duration}s ease`,
    ...style,
  };
  const mergedClassName = className ? `hds-focus ${className}` : 'hds-focus';
  const isInternalHref = typeof href === 'string' && href.startsWith('/');

  const sharedProps = {
    style: baseStyle,
    'data-disabled': disabled ? 'true' : undefined,
    'data-level': level,
    'data-state': visualState === 'pressed' ? 'active' : visualState,
    'data-variant': variant,
    onFocus: (event: ReactFocusEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      const target = event.currentTarget;
      const modality = document.documentElement.dataset['inputModality'];
      setIsFocusVisible(target.matches(':focus-visible') || modality === 'keyboard');
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
      setIsFocusVisible(false);
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
      setIsFocusVisible(false);
      setIsPressed(false);
      onBlur?.(event as ReactFocusEvent<HTMLAnchorElement>);
    },
  };

  const content = (
    <>
      {variant === 'toc' && (
        <div
          className="hds-nav-indicator"
          data-active={showActive ? 'true' : undefined}
          style={{ ...navItemStyles.tocIndicatorBase, left: isRtl ? 'auto' : 0, right: isRtl ? 0 : 'auto', background: indicatorColor }}
        />
      )}
      <span
        style={{
          ...layout.typeStyle,
          color: textColor,
        }}
      >
        {label}
      </span>
    </>
  );

  if (!href) {
    return (
      <button // audit-ok: hds-focus applied via mergedClassName
        className={mergedClassName}
        type="button"
        disabled={disabled}
        aria-disabled={disabled || undefined}
        {...(rest as unknown as ButtonHTMLAttributes<HTMLButtonElement>)}
        {...sharedProps}
        onClick={event => {
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
    <a // audit-ok: hds-focus applied via mergedClassName
      className={mergedClassName}
      href={disabled ? undefined : href}
      aria-disabled={disabled || undefined}
      aria-current={showActive ? rest['aria-current'] ?? (variant === 'toc' ? 'location' : 'page') : undefined}
      {...sharedProps}
      {...rest}
      onClick={event => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onNavigate?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (isInternalHref && event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey) {
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

