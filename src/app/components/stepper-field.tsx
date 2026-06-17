/**
 * StepperField ” numeric input with decrement/increment controls.
 * @category Inputs
 * @tier pattern
 *
 * Classification baseline:
 * Material Design, Chakra UI, and Ant Design treat steppers as numeric input
 * controls rather than page-specific controls. This lives in shared components
 * so sketches and docs consume the same primitive.
 */
import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import hds from '../design-system/tokens';
import { IconButton } from './icon-button';
import { Input } from './input';
import { Surface } from './surface';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDecimalPlaces(step: number) {
  const decimal = step.toString().split('.')[1];
  return decimal ? decimal.length : 0;
}

function formatValue(value: number, step: number) {
  const decimals = getDecimalPlaces(step);
  return decimals > 0 ? value.toFixed(decimals) : String(value);
}

interface StepperFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  inputStep?: number;
  precision?: number;
}

/** @public */
export function StepperField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  inputStep,
  precision,
}: StepperFieldProps) {
  const [draftValue, setDraftValue] = useState(() => formatValue(value, inputStep ?? step));
  const resolvedInputStep = inputStep ?? step;
  const resolvedPrecision = precision ?? getDecimalPlaces(step);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftValue(formatValue(value, resolvedInputStep));
  }, [resolvedInputStep, value]);

  const setValue = (nextValue: number) => {
    if (Number.isNaN(nextValue)) return;
    const resolvedValue = clamp(Number(nextValue.toFixed(resolvedPrecision)), min, max);
    onChange(resolvedValue);
    setDraftValue(formatValue(resolvedValue, resolvedInputStep));
  };

  const commitDraftValue = () => {
    if (
      draftValue.trim() === '' ||
      draftValue === '-' ||
      draftValue === '.' ||
      draftValue === '-.'
    ) {
      setDraftValue(formatValue(value, resolvedInputStep));
      return;
    }

    const parsedValue = Number(draftValue);
    if (Number.isNaN(parsedValue)) {
      setDraftValue(formatValue(value, resolvedInputStep));
      return;
    }

    setValue(parsedValue);
  };

  return (
    <Surface padding="component">
      <label className="text-secondary" style={{ ...hds.typeStyles.caption }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: hds.semantic.space.component.gap }}>
        <IconButton
          icon={Minus}
          size="sm"
          iconSize="small"
          variant="secondary"
          aria-label={`Decrease ${label}`}
          onClick={() => setValue(value - step)}
        />
        <Input
          type="number"
          textStyle="mono"
          inputMode={resolvedPrecision > 0 ? 'decimal' : 'numeric'}
          min={min}
          max={max}
          step={resolvedInputStep}
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onBlur={commitDraftValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitDraftValue();
              e.currentTarget.blur();
            }
          }}
          inputClassName="hds-stepper-input"
          style={{
            width: hds.size[96],
            minWidth: hds.size[96],
            textAlign: 'center',
            paddingLeft: 'var(--component-input-paddingX)',
            paddingRight: 'var(--component-input-paddingX)',
            appearance: 'textfield',
            MozAppearance: 'textfield',
            transition: `background-color ${hds.motion.productive.duration}s ease, border-color ${hds.motion.productive.duration}s ease`,
          }}
        />
        <IconButton
          icon={Plus}
          size="sm"
          iconSize="small"
          variant="secondary"
          aria-label={`Increase ${label}`}
          onClick={() => setValue(value + step)}
        />
      </div>
    </Surface>
  );
}
