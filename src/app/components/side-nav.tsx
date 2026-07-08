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
// motion-ok: motion delivered via Tailwind transition-colors on the state-keyed
// cva classes below; timing matches hds.motion.productive (150ms) via Tailwind's
// default transition-colors duration.
import { useState } from 'react';
import type { CSSProperties, FocusEvent, MouseEvent, PointerEvent } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import hds from '../design-system/tokens';
import { useLanguage } from '../context/LanguageContext';
import { useFrozenState } from '../context/DemoStateContext';
import { useFocusVisible } from '../hooks/useFocusVisible';

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

// ── Variants ───────────────────────────────────────────────────────────────────
// State colors previously lived in BG/TEXT inline-style maps. `state` is the
// internal rest/hover/focus/active/disabled matrix — computed in JS (below)
// because it must also reflect Storybook's demo-state freeze (useFrozenState),
// not just real pointer/keyboard interaction, so it can't be expressed as bare
// `hover:`/`focus-visible:` pseudo-classes alone. Token bindings are ported 1:1
// from the removed BG/TEXT maps and match nav-item.tsx's `navItemVariants`
// state matrix (ADR-015 shared seam — same idle/hover/focus/active/disabled
// tokens). `level` formalizes the previous LEVEL_LAYOUT paddingY split — the
// RTL/indent-aware horizontal padding stays dynamic (see LEVEL_HORIZONTAL_PADDING
// below) since it depends on runtime indent depth, not just level.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- --primitive-size-interactive-min a11y touch target + --component-nav-paddingY level spacing + --semantic-color-* state tokens have no Tailwind-theme utility; var()-based so still token-driven
const sideNavVariants = cva(
  'relative m-0 flex min-h-[var(--primitive-size-interactive-min)] w-full min-w-0 items-center no-underline transition-colors',
  {
    variants: {
      level: {
        root: 'py-0',
        nested: 'py-[var(--component-nav-paddingY)]',
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
    defaultVariants: { level: 'nested', state: 'default' },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type SideNavVariantProps = VariantProps<typeof sideNavVariants>;
type SideNavState = NonNullable<SideNavVariantProps['state']>;
/** Internal visual state matrix — `pressed` collapses into `active` (identical tokens). */
type SideNavVisualState = SideNavState | 'pressed';

// ── Label color (span + titleLabel override) ─────────────────────────────────
// The row's own bg/text now live in sideNavVariants above; this small map only
// feeds the inner label <span> and the titleLabel override, which — like the
// original BG/TEXT maps — must resolve to the exact same tokens.
const TEXT_COLOR_VAR = {
  idle: 'var(--semantic-color-content-secondary)',
  hover: 'var(--semantic-color-content-primary)',
  active: 'var(--semantic-color-content-accent)',
  disabled: 'var(--semantic-color-content-disabled)',
} as const;

// ── Horizontal padding per level ──────────────────────────────────────────────
// RTL + numeric indent depth math — kept dynamic (not cva) because it depends
// on runtime props, not just the level axis.

const LEVEL_HORIZONTAL_PADDING: Record<
  SideNavLevel,
  {
    getPaddingLeft: (indent: boolean, isRtl: boolean) => string;
    getPaddingRight: (indent: boolean, isRtl: boolean) => string;
  }
> = {
  root: {
    getPaddingLeft: (_indent, isRtl) =>
      isRtl ? hds.semantic.space.sidebar.gap : hds.semantic.space.sidebar.sectionGap,
    getPaddingRight: (_indent, isRtl) => (isRtl ? hds.semantic.space.sidebar.sectionGap : '0px'),
  },
  nested: {
    getPaddingLeft: (indent, isRtl) =>
      isRtl
        ? hds.semantic.space.sidebar.gap
        : `calc(${hds.semantic.space.sidebar.sectionGap} + ${indent ? hds.semantic.space.sidebar.indent : '0px'})`,
    getPaddingRight: (indent, isRtl) =>
      isRtl
        ? `calc(${hds.semantic.space.sidebar.sectionGap} + ${indent ? hds.semantic.space.sidebar.indent : '0px'})`
        : '0px',
  },
};

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
  // Modality-aware focus ring — shared seam with nav-item (ADR-015).
  const { isFocusVisible, onFocus: onFocusVisible, clearFocusVisible } = useFocusVisible();

  // Resolve visual state — frozen demo state overrides live interaction. Only
  // 'hover' | 'active' | 'disabled' | 'pressed'/'press' are recognized freeze
  // values here (unlike nav-item, 'focused'/'rest' fall through to live state —
  // preserved verbatim from the pre-cva implementation).
  const resolved = frozenState ?? null;
  const visualState: SideNavVisualState = disabled
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

  // `pressed` shares active's tokens (background/text) — collapse for both the
  // data-state attribute and the cva state lookup.
  const state: SideNavState = visualState === 'pressed' ? 'active' : visualState;
  // aria-current intentionally excludes `pressed` (matches pre-cva behavior).
  const showActive = active || visualState === 'active';

  const labelTypeStyle = titleLabel ? hds.typeStyles.eyebrow : hds.typeStyles.ui;

  const textColor = disabled
    ? TEXT_COLOR_VAR.disabled
    : visualState === 'active' || visualState === 'pressed'
      ? TEXT_COLOR_VAR.active
      : visualState === 'hover'
        ? TEXT_COLOR_VAR.hover
        : TEXT_COLOR_VAR.idle;

  const indentDepth = typeof indent === 'number' ? indent : indent ? 1 : 0;
  const horizontalPadding = LEVEL_HORIZONTAL_PADDING[level];

  const style: CSSProperties = {
    ...labelTypeStyle,
    paddingLeft:
      level === 'nested' && !isRtl
        ? `calc(${hds.semantic.space.sidebar.sectionGap} + (${hds.semantic.space.sidebar.indent} * ${indentDepth}))`
        : horizontalPadding.getPaddingLeft(indentDepth > 0, isRtl),
    paddingRight:
      level === 'nested' && isRtl
        ? `calc(${hds.semantic.space.sidebar.sectionGap} + (${hds.semantic.space.sidebar.indent} * ${indentDepth}))`
        : horizontalPadding.getPaddingRight(indentDepth > 0, isRtl),
  };

  const rowClassName = cn(
    sideNavVariants({ level, state }),
    isRtl ? 'text-right' : 'text-left',
    frozenState !== null && 'pointer-events-none',
  );

  const handlers = {
    onFocus: (e: FocusEvent<HTMLElement>) => {
      onFocusVisible(e.currentTarget);
    },
    onBlur: () => {
      clearFocusVisible();
      setIsPressed(false);
    },
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => {
      setIsHovered(false);
      setIsPressed(false);
    },
    onPointerDown: (_e: PointerEvent<HTMLElement>) => {
      setIsPressed(true);
      clearFocusVisible();
    },
    onPointerUp: (_e: PointerEvent<HTMLElement>) => setIsPressed(false),
    onPointerCancel: (_e: PointerEvent<HTMLElement>) => setIsPressed(false),
  };

  const text = (
    <span style={{ color: titleLabel ? 'var(--semantic-color-content-primary)' : textColor }}>
      {label}
    </span>
  );

  if (titleLabel) {
    return (
      <p
        style={style}
        className={cn(
          sideNavVariants({ level, state: 'default' }),
          isRtl ? 'text-right' : 'text-left',
          'cursor-default text-[var(--semantic-color-content-primary)] pointer-events-none',
        )}
        data-level={level}
      >
        {text}
      </p>
    );
  }

  if (!href) {
    return (
      <button // audit-ok: focus ring driven by the state-keyed cva `focus` branch (outline utilities above), not a literal hds-focus/focus-visible: substring — see ADR-015 useFocusVisible
        type="button"
        disabled={disabled}
        aria-disabled={disabled || undefined}
        data-level={level}
        data-state={state}
        data-disabled={disabled ? 'true' : undefined}
        className={rowClassName}
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
    <a // audit-ok: focus ring driven by the state-keyed cva `focus` branch (outline utilities above), not a literal hds-focus/focus-visible: substring — see ADR-015 useFocusVisible
      href={disabled ? undefined : href}
      aria-disabled={disabled || undefined}
      aria-current={showActive ? 'page' : undefined}
      data-level={level}
      data-state={state}
      data-disabled={disabled ? 'true' : undefined}
      className={rowClassName}
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

/** @internal — CVA variant helper; compose via SideNav props instead. */
export { sideNavVariants };
