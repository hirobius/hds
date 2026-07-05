/**
 * SideNav - sidebar navigation row primitive.
 *
 * Two levels:
 *   root   — top-level section link. Full-width row using the shared nav label
 *            type style.
 *   nested — child page link. Keeps the same full-width hit area and label type
 *            treatment, with indentation handled via inner padding only.
 *
 * No indicator bar (reserved for HdsTocNav).
 * Idle text = content-secondary → primary on hover/active.
 * Accent surface fill on active state.
 * @category Navigation
 * @tier primitive
 * @public
 */
import { useState } from 'react';
import type { CSSProperties, FocusEvent, MouseEvent, PointerEvent } from 'react';
import hds from '../design-system/tokens';
import { useLanguage } from '../context/LanguageContext';
import { useFrozenState } from '../context/DemoStateContext';

export type SideNavLevel = 'root' | 'nested';

export interface SideNavProps {
  label: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  titleLabel?: boolean;
  /** Visual level — root matches group-header altitude, nested is an indented page link. */
  level?: SideNavLevel;
  /** Nested depth offset applied via inner padding while keeping the row full width. */
  indent?: boolean | number;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

// ── Layout per level ──────────────────────────────────────────────────────────

const LEVEL_LAYOUT: Record<
  SideNavLevel,
  {
    typeStyle: CSSProperties;
    getPaddingLeft: (indent: boolean, isRtl: boolean) => string;
    getPaddingRight: (indent: boolean, isRtl: boolean) => string;
    paddingY: string;
    marginTop: string;
    getMarginLeft: (indent: boolean, isRtl: boolean) => string;
    getMarginRight: (indent: boolean, isRtl: boolean) => string;
    getWidth: (indent: boolean) => string;
  }
> = {
  root: {
    typeStyle: hds.typeStyles.ui,
    getPaddingLeft: (_indent, isRtl) =>
      isRtl ? hds.semantic.space.sidebar.gap : hds.semantic.space.sidebar.sectionGap,
    getPaddingRight: (_indent, isRtl) => (isRtl ? hds.semantic.space.sidebar.sectionGap : '0px'),
    paddingY: '0px',
    marginTop: '0',
    getMarginLeft: () => '0px',
    getMarginRight: () => '0px',
    getWidth: () => '100%',
  },
  nested: {
    typeStyle: hds.typeStyles.ui,
    getPaddingLeft: (indent, isRtl) =>
      isRtl
        ? hds.semantic.space.sidebar.gap
        : `calc(${hds.semantic.space.sidebar.sectionGap} + ${indent ? hds.semantic.space.sidebar.indent : '0px'})`,
    getPaddingRight: (indent, isRtl) =>
      isRtl
        ? `calc(${hds.semantic.space.sidebar.sectionGap} + ${indent ? hds.semantic.space.sidebar.indent : '0px'})`
        : '0px',
    paddingY: 'var(--component-nav-paddingY)',
    marginTop: '0',
    getMarginLeft: () => '0px',
    getMarginRight: () => '0px',
    getWidth: () => '100%',
  },
};

// ── State tokens ──────────────────────────────────────────────────────────────

const BG = {
  idle: 'transparent',
  hover: 'var(--semantic-color-surface-raised)',
  pressed: 'var(--semantic-color-surface-accentSubtle)',
  active: 'var(--semantic-color-surface-accentSubtle)',
  disabled: 'transparent',
} as const;

const TEXT = {
  idle: 'var(--semantic-color-content-secondary)',
  active: 'var(--semantic-color-content-accent)',
  disabled: 'var(--semantic-color-content-disabled)',
} as const;

// ── Component ────────────────────────────────────────────────────────────────

export function SideNav({
  label,
  href,
  active = false,
  disabled = false,
  titleLabel = false,
  level = 'nested',
  indent = 0,
  onNavigate,
}: SideNavProps) {
  const { isRtl } = useLanguage();
  const frozenState = useFrozenState();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isFocusVisible, setFocusVisible] = useState(false);

  // Resolve visual state — frozen demo state overrides live interaction
  const resolved = frozenState ?? null;
  const visualState = disabled
    ? 'disabled'
    : active
      ? 'active'
      : resolved === 'hover'
        ? 'hover'
        : resolved === 'active'
          ? 'active'
          : resolved === 'disabled'
            ? 'disabled'
            : resolved === 'pressed' || resolved === 'press'
              ? 'pressed'
              : isPressed
                ? 'pressed'
                : isFocusVisible
                  ? 'focus'
                  : isHovered
                    ? 'hover'
                    : 'default';

  const showActive = active || visualState === 'active';
  const showHover = visualState === 'hover';
  const showPressed = visualState === 'pressed';
  const showFocus = visualState === 'focus';
  const layout = LEVEL_LAYOUT[level];
  const labelTypeStyle = titleLabel ? hds.typeStyles.eyebrow : layout.typeStyle;

  const bg = disabled
    ? BG.disabled
    : showActive
      ? BG.active
      : showPressed
        ? BG.pressed
        : showHover
          ? BG.hover
          : BG.idle;

  const textColor = disabled
    ? TEXT.disabled
    : showActive || showPressed
      ? TEXT.active
      : showHover
        ? 'var(--semantic-color-content-primary)'
        : TEXT.idle;

  const indentDepth = typeof indent === 'number' ? indent : indent ? 1 : 0;

  const style: CSSProperties = {
    ...labelTypeStyle,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: layout.getWidth(indentDepth > 0),
    minWidth: 0,
    minHeight: 'var(--primitive-size-interactive-min)', // tier-ok: a11y touch target — 44px min interactive size has no semantic alias
    marginTop: layout.marginTop,
    marginLeft: layout.getMarginLeft(indentDepth > 0, isRtl),
    marginRight: layout.getMarginRight(indentDepth > 0, isRtl),
    paddingTop: layout.paddingY,
    paddingBottom: layout.paddingY,
    paddingLeft:
      level === 'nested' && !isRtl
        ? `calc(${hds.semantic.space.sidebar.sectionGap} + (${hds.semantic.space.sidebar.indent} * ${indentDepth}))`
        : layout.getPaddingLeft(indentDepth > 0, isRtl),
    paddingRight:
      level === 'nested' && isRtl
        ? `calc(${hds.semantic.space.sidebar.sectionGap} + (${hds.semantic.space.sidebar.indent} * ${indentDepth}))`
        : layout.getPaddingRight(indentDepth > 0, isRtl),
    color: textColor,
    backgroundColor: bg,
    textDecoration: 'none',
    textAlign: isRtl ? 'right' : 'left',
    cursor: disabled ? 'default' : 'pointer',
    outline: showFocus ? `${hds.borderWidth.sm} solid var(--semantic-color-border-accent)` : 'none',
    outlineOffset: showFocus ? '2px' : undefined,
    transition: `background-color ${hds.motion.productive.duration}s ease, color ${hds.motion.productive.duration}s ease`,
    pointerEvents: frozenState !== null ? 'none' : undefined,
  };

  const handlers = {
    onFocus: (e: FocusEvent<HTMLElement>) => {
      const modality = document.documentElement.dataset['inputModality'];
      setFocusVisible(e.currentTarget.matches(':focus-visible') || modality === 'keyboard');
    },
    onBlur: () => {
      setFocusVisible(false);
      setIsPressed(false);
    },
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => {
      setIsHovered(false);
      setIsPressed(false);
    },
    onPointerDown: (_e: PointerEvent<HTMLElement>) => {
      setIsPressed(true);
      setFocusVisible(false);
    },
    onPointerUp: (_e: PointerEvent<HTMLElement>) => setIsPressed(false),
    onPointerCancel: (_e: PointerEvent<HTMLElement>) => setIsPressed(false),
  };

  const text = (
    <span
      style={{
        color: titleLabel ? 'var(--semantic-color-content-primary)' : textColor,
      }}
    >
      {label}
    </span>
  );

  if (titleLabel) {
    return (
      <p
        style={{
          ...style,
          margin: 0,
          color: 'var(--semantic-color-content-primary)',
          backgroundColor: 'transparent',
          cursor: 'default',
          pointerEvents: 'none',
        }}
      >
        {text}
      </p>
    );
  }

  if (!href) {
    return (
      <button // audit-ok: hds-focus applied via className
        type="button"
        disabled={disabled}
        aria-disabled={disabled || undefined}
        className="hds-focus"
        style={style}
        {...handlers}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          onNavigate?.(e as unknown as MouseEvent<HTMLAnchorElement>);
        }}
      >
        {text}
      </button>
    );
  }

  return (
    <a // audit-ok: hds-focus applied via className
      href={disabled ? undefined : href}
      aria-disabled={disabled || undefined}
      aria-current={showActive ? 'page' : undefined}
      className="hds-focus"
      style={style}
      {...handlers}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        onNavigate?.(e);
      }}
    >
      {text}
    </a>
  );
}
