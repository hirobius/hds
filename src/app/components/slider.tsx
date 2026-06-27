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
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: hds.semantic.space.component.gap }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: hds.semantic.space.component.gap,
        }}
      >
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
          className="text-secondary"
          initial={{ opacity: 0.72, y: hds.space.px2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: hds.motion.productive.duration,
            ease: hds.motion.productive.easing,
          }}
          style={{ ...hds.typeStyles.technical, flexShrink: 0 }}
        >
          {value}
        </motion.span>
      </div>
      <motion.div
        style={{
          position: 'relative',
          height: hds.size[20],
          ['display']: 'grid',
          alignItems: 'center',
        }}
      >
        <Surface
          aria-hidden="true"
          padding="component"
          style={{
            position: 'absolute',
            insetInline: 0,
            top: '50%',
            height: hds.size[8],
            transform: 'translateY(-50%)',
            background: 'var(--semantic-color-border-default)',
            overflow: 'hidden',
          }}
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
            style={{
              height: '100%',
              borderRadius: hds.borderRadius.full,
              background: 'var(--semantic-color-surface-accent)',
            }}
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
          className="hds-focus hds-slider-input"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            margin: 0,
            background: 'transparent',
            accentColor: 'var(--semantic-color-surface-accent)',
            cursor: 'pointer',
            position: 'relative',
            zIndex: hds.zIndex.focus,
          }}
        />
      </motion.div>
    </div>
  );
});
