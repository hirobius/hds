/**
 * @internal — not part of @hirobius/design-system public API surface.
 * @doc-ignore  label root shared by Checkbox, Toggle and Radio, not an HDS component
 */
/**
 * The `<m.label>` root that Checkbox, Toggle and Radio all render around
 * their native input: one tab stop (`tabIndex={-1}`), the 0.99 tap scale on
 * the productive motion token, and, when `pointer` is passed, the hover/press
 * handlers of the useInteractionState machine. Radio leaves `pointer` out,
 * because it puts those handlers on its input. ControlLabelText is the visible
 * label text inside it. Local to the three files (hds#1009).
 */

import type { ReactNode } from 'react';
import { LazyMotion, domAnimation, m, type TargetAndTransition } from 'motion/react';
import hds from '../design-system/tokens';
import { useHdsMotion } from '../hooks/useHdsMotion';
import { useFrozenState } from '../context/DemoStateContext';
import { useInteractionState, type InteractionVisualState } from '../hooks/useInteractionState';

type PointerHandlers = Pick<
  ReturnType<typeof useInteractionState>['handlers'],
  'onMouseEnter' | 'onMouseLeave' | 'onPointerDown' | 'onPointerUp' | 'onPointerCancel'
>;

export interface ControlLabelProps {
  /** Turns the tap scale off. */
  disabled: boolean;
  /** The machine's hover/press handlers, set on the label. */
  pointer?: PointerHandlers;
  /** Motion target for the label itself (Toggle's press nudge). */
  animate?: TargetAndTransition;
  className: string;
  children: ReactNode;
}

export function ControlLabel({
  disabled,
  pointer,
  animate,
  className,
  children,
}: ControlLabelProps) {
  const productiveMotion = useHdsMotion('productive');
  return (
    <LazyMotion features={domAnimation}>
      <m.label
        // motion's whileTap puts tabindex=0 on a non-focusable element, which gave
        // every control two tab stops (the label, then the input). An explicit
        // tabindex keeps motion from adding it; the native input is the one stop (hds#522).
        tabIndex={-1}
        whileTap={disabled ? undefined : { scale: 0.99 }}
        transition={{ duration: productiveMotion.duration, ease: productiveMotion.easing }}
        onMouseEnter={pointer?.onMouseEnter}
        onMouseLeave={pointer?.onMouseLeave}
        onPointerDown={pointer?.onPointerDown}
        onPointerUp={pointer?.onPointerUp}
        onPointerCancel={pointer?.onPointerCancel}
        animate={animate}
        className={className}
      >
        {children}
      </m.label>
    </LazyMotion>
  );
}

export interface ControlLabelTextProps {
  /** Nudges the text a hairline right while the control is pressed. */
  pressed: boolean;
  /** Paints the text in the disabled content colour. */
  disabled: boolean;
  className?: string;
  children: ReactNode;
}

export function ControlLabelText({
  pressed,
  disabled,
  className,
  children,
}: ControlLabelTextProps) {
  const productiveMotion = useHdsMotion('productive');
  return (
    <LazyMotion features={domAnimation}>
      <m.span
        className={className}
        animate={{ x: pressed ? hds.semantic.space.subgrid.hairline : 0 }}
        transition={{
          duration: productiveMotion.duration,
          ease: productiveMotion.easing,
        }}
        style={{
          ...hds.typeStyles.ui,
          color: disabled
            ? 'var(--semantic-color-content-disabled)'
            : 'var(--semantic-color-content-primary)',
        }}
      >
        {children}
      </m.span>
    </LazyMotion>
  );
}

/**
 * The shared single-element interaction machine (ADR-015) as Checkbox, Toggle
 * and Radio read it: the real `disabled` prop plus the frozen demo state from
 * the nearest FreezeState (hds#1009).
 */
export function useControlInteraction(
  disabled: boolean | undefined,
): ReturnType<typeof useInteractionState> {
  const frozenState = useFrozenState();
  return useInteractionState({
    disabled,
    frozenState: frozenState as InteractionVisualState | null,
  });
}
