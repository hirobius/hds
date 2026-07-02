/**
 * HdsSlider — range slider with label and value display, on Radix Slider.
 * @category Inputs
 * @tier primitive
 *
 * ADR-020 §1: wraps @radix-ui/react-slider for consistent cross-browser
 * styling, keyboard, and ARIA (native <input type=range> can't be styled
 * reliably and can't render a two-thumb range). The public API is unchanged
 * for the single-value case (`value: number`, `onChange: (v) => void`); the
 * visual skin stays bound to HDS tokens.
 */

import { forwardRef } from 'react';
import { motion } from 'motion/react';
import * as RadixSlider from '@radix-ui/react-slider';
import hds from '../design-system/tokens';

/** HdsSlider — range slider with label and value display. */
interface SliderProps {
  /** Slider label. */
  label: string;
  /** Minimum value in the range. */
  min: number;
  /** Maximum value in the range. */
  max: number;
  /** Step increment. */
  step?: number;
  /** Current slider value. */
  value: number;
  /** Called when the slider value changes. */
  onChange: (v: number) => void;
}

export const HdsSlider = forwardRef<HTMLSpanElement, SliderProps>(function HdsSlider(
  { label, min, max, step = 1, value, onChange },
  ref,
) {
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
      <RadixSlider.Root
        ref={ref}
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(vals) => onChange(vals[0] ?? value)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          height: hds.size[20],
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <RadixSlider.Track
          style={{
            position: 'relative',
            flexGrow: 1,
            height: hds.size[8],
            borderRadius: hds.borderRadius.full,
            background: 'var(--semantic-color-border-default)',
            overflow: 'hidden',
          }}
        >
          <RadixSlider.Range
            style={{
              position: 'absolute',
              height: '100%',
              borderRadius: hds.borderRadius.full,
              background: 'var(--semantic-color-surface-accent)',
            }}
          />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          className="hds-focus"
          aria-label={label}
          style={{
            display: 'block',
            width: hds.size[16],
            height: hds.size[16],
            borderRadius: hds.borderRadius.full,
            background: 'var(--semantic-color-surface-accent)',
            border: `${hds.borderWidth.sm} solid var(--semantic-color-surface-page)`,
            cursor: 'pointer',
          }}
        />
      </RadixSlider.Root>
    </div>
  );
});
