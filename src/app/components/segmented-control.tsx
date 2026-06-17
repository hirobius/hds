/**
 * SegmentedControl " segmented selection input for compact mutually-exclusive choices.
 * @category Inputs
 * @tier primitive
 */
import { forwardRef, useState } from 'react';
import { motion } from 'motion/react';
import hds from '../design-system/tokens';
import { useFrozenState } from '../context/DemoStateContext';

const segmentedControlStyles = {
  outerWrapper: {
    display: 'inline-flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: hds.semantic.space.component.gap,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    padding: 0,
  } satisfies React.CSSProperties,
  railBase: {
    display: 'flex',
    alignItems: 'stretch',
    maxWidth: '100%',
    border: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
    borderRadius: 'calc(var(--semantic-radius-action) + 4px)',
    overflowX: 'auto' as const,
    overflowY: 'hidden' as const,
    scrollbarWidth: 'thin' as const,
    gap: hds.semantic.space.subgrid.gap,
  } satisfies React.CSSProperties,
} as const;

interface HdsSegmentedOption {
  /** Value submitted when this option is selected. */
  value: string;
  /** Visible label for the option. */
  label: string;
  /** Optional supporting description shown below the label. */
  description?: string;
}

interface SegmentedControlProps {
  /** Accessible label for the control. */
  label?: string;
  /** Accessible label when no visible label should be rendered. */
  ariaLabel?: string;
  /** Option set rendered inside the segmented rail. */
  options: HdsSegmentedOption[];
  /** Currently selected value. */
  value: string;
  /** Called when the user selects a different option. */
  onChange: (value: string) => void;
  /** Sizing variant for the control. */
  size?: 'default' | 'compact';
  /** Visual treatment for the rail and active segment. */
  variant?: 'primary' | 'secondary';
  /** Whether the control should stretch to the width of its container. */
  fullWidth?: boolean;
  /** Padding inside the rail container. */
  railPadding?: React.CSSProperties['padding'];
  /** Horizontal padding inside each segment. */
  segmentPaddingX?: React.CSSProperties['paddingLeft'];
}

/** @public */
export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(
  function SegmentedControl(
    {
      label,
      ariaLabel,
      options,
      value,
      onChange,
      size = 'default',
      variant = 'primary',
      fullWidth = false,
      railPadding,
      segmentPaddingX,
    },
    ref,
  ) {
    const [hoveredValue, setHoveredValue] = useState<string | null>(null);
    const [focusedValue, setFocusedValue] = useState<string | null>(null);
    const frozenState = useFrozenState();
    const demoState = frozenState as 'rest' | 'hover' | 'focused' | 'pressed' | 'disabled' | null;
    const isDisabled = demoState === 'disabled';
    const isCompact = size === 'compact';
    const isSecondary = variant === 'secondary';
    const resolvedAriaLabel = ariaLabel ?? label;
    const resolvedSegmentPaddingX =
      segmentPaddingX ??
      (isCompact ? hds.semantic.space.component.gap : hds.semantic.space.layout.gap);

    return (
      <div
        ref={ref}
        style={{ ...segmentedControlStyles.outerWrapper, width: fullWidth ? '100%' : 'fit-content' }}
      >
        {label && (
          <span
            className="text-secondary"
            style={{
              ...hds.typeStyles.ui,
              color: 'var(--semantic-color-content-primary)',
              paddingBottom: hds.semantic.space.subgrid.gap,
            }}
          >
            {label}
          </span>
        )}
        <div
          role="group"
          aria-label={resolvedAriaLabel}
          style={{ ...segmentedControlStyles.railBase, width: fullWidth ? '100%' : 'fit-content', padding: railPadding ?? '4px', background: isSecondary ? 'var(--semantic-color-surface-page)' : 'var(--semantic-color-surface-raised)' }}
        >
          {options.map((option) => {
            const active = option.value === value;
            const showHover = demoState
              ? demoState === 'hover' && active
              : hoveredValue === option.value;
            const showPressed = demoState === 'pressed' && active;
            const showFocused = demoState
              ? demoState === 'focused' && active
              : focusedValue === option.value;
            const showDisabled = isDisabled;

            return (
              <div
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  flex: fullWidth ? '1 1 0' : '0 0 auto',
                  minWidth: fullWidth ? 0 : isCompact ? 'max-content' : 'auto',
                }}
              >
                <motion.button
                  type="button"
                  onClick={() => !showDisabled && onChange(option.value)}
                  onHoverStart={() => !demoState && setHoveredValue(option.value)}
                  onHoverEnd={() => !demoState && setHoveredValue(null)}
                  onFocus={() => !demoState && setFocusedValue(option.value)}
                  onBlur={() => !demoState && setFocusedValue(null)}
                  className="hds-focus"
                  aria-pressed={active}
                  disabled={showDisabled}
                  animate={
                    isSecondary
                      ? {
                          y: active ? 0 : showPressed ? 1 : 0,
                          scale: active ? 1 : showHover ? 0.995 : 1,
                        }
                      : undefined
                  }
                  transition={
                    isSecondary
                      ? {
                          duration: hds.motion.productive.duration,
                          ease: hds.motion.productive.easing,
                        }
                      : undefined
                  }
                  // inline-ok: segmented segment button — active/hover/pressed/disabled/compact/fullWidth/secondary all intersect; not reducible without opacity traps
                  style={{
                    position: 'relative',
                    zIndex: active ? 1 : hds.zIndex.base,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: hds.semantic.space.subgrid.hairline,
                    minHeight: isCompact ? hds.size[32] : hds.size[48],
                    width: fullWidth ? '100%' : isCompact ? 'max-content' : '100%',
                    paddingTop: hds.semantic.space.subgrid.gap,
                    paddingBottom: hds.semantic.space.subgrid.gap,
                    paddingLeft: resolvedSegmentPaddingX,
                    paddingRight: resolvedSegmentPaddingX,
                    border: 'none',
                    borderRadius: hds.borderRadius.action,
                    cursor: showDisabled ? 'not-allowed' : 'pointer',
                    background: 'transparent',
                    color: showDisabled
                      ? 'var(--semantic-color-content-disabled)'
                      : active
                        ? isSecondary
                          ? 'var(--semantic-color-content-primary)'
                          : 'var(--semantic-color-content-onAccent)'
                        : showHover
                          ? isSecondary
                            ? 'var(--semantic-color-content-secondary)'
                            : 'var(--semantic-color-content-primary)'
                          : 'var(--semantic-color-content-secondary)',
                    outline:
                      showFocused && demoState
                        ? `${hds.borderWidth.sm} solid ${isSecondary ? 'var(--semantic-color-border-default)' : 'var(--semantic-color-border-accent)'}`
                        : undefined,
                    outlineOffset:
                      showFocused && demoState ? hds.semantic.space.subgrid.gap : undefined,
                    transform: isSecondary ? 'none' : showPressed ? 'translateY(1px)' : 'none',
                    transition: `color ${hds.motion.productive.duration}s ease, outline-color ${hds.motion.productive.duration}s ease, transform ${hds.motion.productive.duration}s ease`,
                    textAlign: 'center',
                    margin: 0,
                  }}
                >
                  <span
                    aria-hidden="true"
                    // inline-ok: segment background indicator — background/boxShadow driven by active×hover×pressed×disabled×secondary state matrix
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: hds.borderRadius.action,
                      background: showDisabled
                        ? isSecondary
                          ? 'var(--semantic-color-surface-page)'
                          : 'var(--semantic-color-surface-raised)'
                        : active
                          ? isSecondary
                            ? showPressed
                              ? 'var(--semantic-color-surface-raised)'
                              : showHover
                                ? 'var(--semantic-color-surface-raised)'
                                : 'var(--semantic-color-surface-raised)'
                            : showPressed
                              ? 'var(--semantic-accent-pressed)'
                              : showHover
                                ? 'var(--semantic-accent-hover)'
                                : 'var(--semantic-accent-rest)'
                          : showHover
                            ? isSecondary
                              ? 'var(--semantic-color-surface-raised)'
                              : 'var(--semantic-color-surface-accentSubtle)'
                            : 'transparent',
                      zIndex: hds.zIndex.base,
                      boxShadow:
                        active || showHover
                          ? `inset 0 0 0 1px ${isSecondary ? 'var(--semantic-color-border-default)' : 'var(--semantic-color-border-accent)'}`
                          : 'none',
                      pointerEvents: 'none',
                    }}
                  />
                  <span
                    style={{
                      position: 'relative',
                      zIndex: hds.zIndex.focus,
                      ...hds.typeStyles.ui,
                      color: 'currentColor',
                    }}
                  >
                    {option.label}
                  </span>
                  {option.description && (
                    <span
                      style={{
                        position: 'relative',
                        zIndex: hds.zIndex.focus,
                        ...hds.typeStyles.caption,
                        color: showDisabled
                          ? 'var(--semantic-color-content-disabled)'
                          : active && !(showHover || showPressed)
                            ? isSecondary
                              ? 'var(--semantic-color-content-secondary)'
                              : 'var(--semantic-color-content-onAccent)'
                            : 'var(--semantic-color-content-secondary)',
                      }}
                    >
                      {option.description}
                    </span>
                  )}
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
