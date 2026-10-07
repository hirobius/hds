/**
 * Slider — range slider with label and value display.
 * @category Inputs
 * @tier primitive
 * @usage Pick a number within a known range by dragging, when the exact value matters less than the position.
 * @whenNot A precise number the person must type or read exactly.
 * @useInstead Input a precise typed value (type="number")
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=82-265
 */

import { useState, forwardRef } from 'react';
import { motion } from 'motion/react';
import hds from '../design-system/tokens';
import { useHdsMotion } from '../hooks/useHdsMotion';
import { FORM_CONTROL_WIDTH } from './form-control';

/** Slider — range slider with label and value display. */
export interface SliderProps {
  /** Slider label. */
  label: string;
  /** Minimum value in the range. */
  min: number;
  /** Maximum value in the range. */
  max: number;
  /** Step increment for the range input. */
  step?: number;
  /** Current slider value. */
  value: number;
  /** Called when the slider value changes. */
  onChange: (v: number) => void;
}

export const Slider = /* @__PURE__ */ forwardRef<HTMLInputElement, SliderProps>(function Slider(
  { label, min, max, step = 1, value, onChange },
  ref,
) {
  const [isActive, setIsActive] = useState(false);
  const range = max - min;
  const progress = range <= 0 ? 0 : Math.min(Math.max((value - min) / range, 0), 1);
  const progressPercent = `${progress * 100}%`;
  const productiveMotion = useHdsMotion('productive');
  const expressiveMotion = useHdsMotion('expressive');

  return (
    // eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven gap; var()-based, no Tailwind-theme utility exists
    <div className={`flex flex-col gap-[var(--semantic-space-scale-xs)] ${FORM_CONTROL_WIDTH}`}>
      {/* eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven gap; var()-based, no Tailwind-theme utility exists */}
      <div className="flex justify-between items-baseline gap-[var(--semantic-space-scale-xs)]">
        <label
          style={{
            ...hds.typeStyles.ui,
            color: 'var(--semantic-color-content-primary)',
          }}
        >
          {label}
        </label>
        <motion.span
          key={value}
          className="text-secondary shrink-0"
          initial={{ opacity: 0.72, y: hds.space.px2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: productiveMotion.duration,
            ease: productiveMotion.easing,
          }}
          style={{ ...hds.typeStyles.mono }}
        >
          {value}
        </motion.span>
      </div>
      {/* eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven height; var()-based, no Tailwind-theme utility exists */}
      <motion.div className="relative h-[var(--semantic-size-control-md)] grid items-center">
        <div
          aria-hidden="true"
          // A bare track, not a padded Surface: Surface's inset padding made the track a 48px slab with a 0px fill (hds#522).
          // eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven inset/height/color; var()-based, no Tailwind-theme utility exists
          className="absolute [inset-inline:0] top-1/2 h-[var(--semantic-size-control-sm)] -translate-y-1/2 rounded-[var(--primitive-radius-full)] bg-[var(--semantic-color-border-default)] overflow-hidden" // tier-ok: radius-full is the "fully round" constant
        >
          <motion.div
            animate={{
              width: progressPercent,
              opacity: isActive ? 1 : 0.92,
            }}
            transition={{
              duration: expressiveMotion.duration,
              ease: productiveMotion.easing,
            }}
            // eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven radius/color; var()-based, no Tailwind-theme utility exists
            className="h-full rounded-[var(--primitive-radius-full)] bg-[var(--semantic-color-surface-accent)]" // tier-ok: radius-full (9999px) is the mathematical "fully round" constant — one possible value, not a design-scale choice. hds#186
          />
        </div>
        <input
          ref={ref}
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={() => setIsActive(true)}
          onPointerUp={() => setIsActive(false)}
          onPointerCancel={() => setIsActive(false)}
          onBlur={() => setIsActive(false)}
          // eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven accent-color/z-index; var()-based, no Tailwind-theme utility exists
          className="hds-focus hds-slider-input w-full h-full block m-0 bg-transparent accent-[var(--semantic-color-surface-accent)] cursor-pointer relative z-[var(--semantic-zIndex-control)]"
        />
      </motion.div>
    </div>
  );
});
