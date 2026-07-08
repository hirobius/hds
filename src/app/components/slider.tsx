/**
 * HdsSlider — range slider with label and value display.
 * @category Inputs
 * @tier primitive
 */

import { useState, forwardRef } from 'react';
import { motion } from 'motion/react';
import hds from '../design-system/tokens';
import { Surface } from './surface';

/** HdsSlider — range slider with label and value display. */
interface SliderProps {
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

export const HdsSlider = forwardRef<HTMLInputElement, SliderProps>(function HdsSlider(
  { label, min, max, step = 1, value, onChange },
  ref,
) {
  const [isActive, setIsActive] = useState(false);
  const range = max - min;
  const progress = range <= 0 ? 0 : Math.min(Math.max((value - min) / range, 0), 1);
  const progressPercent = `${progress * 100}%`;

  return (
    // eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven gap; var()-based, no Tailwind-theme utility exists
    <div className="flex flex-col gap-[var(--semantic-space-component-gap)]">
      {/* eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven gap; var()-based, no Tailwind-theme utility exists */}
      <div className="flex justify-between items-baseline gap-[var(--semantic-space-component-gap)]">
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
            duration: hds.motion.productive.duration,
            ease: hds.motion.productive.easing,
          }}
          style={{ ...hds.typeStyles.technical }}
        >
          {value}
        </motion.span>
      </div>
      {/* eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven height; var()-based, no Tailwind-theme utility exists */}
      <motion.div className="relative h-[var(--primitive-size-20)] grid items-center">
        <Surface
          aria-hidden="true"
          padding="component"
          // eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven inset/height/color; var()-based, no Tailwind-theme utility exists
          className="absolute [inset-inline:0] top-1/2 h-[var(--primitive-size-8)] -translate-y-1/2 bg-[var(--semantic-color-border-default)] overflow-hidden"
        >
          <motion.div
            animate={{
              width: progressPercent,
              opacity: isActive ? 1 : 0.92,
            }}
            transition={{
              duration: hds.motion.expressive.duration,
              ease: hds.motion.productive.easing,
            }}
            // eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven radius/color; var()-based, no Tailwind-theme utility exists
            className="h-full rounded-[var(--primitive-radius-full)] bg-[var(--semantic-color-surface-accent)]"
          />
        </Surface>
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
          className="hds-focus hds-slider-input w-full h-full block m-0 bg-transparent accent-[var(--semantic-color-surface-accent)] cursor-pointer relative z-[var(--primitive-zIndex-10)]"
        />
      </motion.div>
    </div>
  );
});
