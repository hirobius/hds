/**
 * Stepper - horizontal or vertical step indicator for multi-step wizard and
 * checkout flows, marking each step as complete, current, or upcoming.
 * @category Navigation
 * @tier pattern
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// State is the only styling axis for the circular marker: complete uses the
// solid primary fill, current uses a thicker ring in the foreground tone, and
// upcoming stays a quiet outline so the eye tracks progress left-to-right.
/** @internal */
const stepMarkerVariants = cva(
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
  {
    variants: {
      state: {
        complete: 'bg-primary text-primary-foreground',
        current: 'border-2 border-ring text-foreground',
        upcoming: 'border border-border text-muted-foreground',
      },
    },
    defaultVariants: { state: 'upcoming' },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface Step {
  /** Visible label for the step. */
  label: React.ReactNode;
  /** Optional supporting copy shown under the label. */
  description?: React.ReactNode;
}

type StepState = NonNullable<VariantProps<typeof stepMarkerVariants>['state']>;

/** @public */
export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  /** Ordered steps from first to last. */
  steps: Step[];
  /** 0-based index of the current step. */
  activeStep: number;
  /** Layout direction. Defaults to 'horizontal'. */
  orientation?: 'horizontal' | 'vertical';
}

function stepState(index: number, activeStep: number): StepState {
  if (index < activeStep) return 'complete';
  if (index === activeStep) return 'current';
  return 'upcoming';
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Step indicator for multi-step flows. Purely presentational — no navigation. */
export const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(function Stepper(
  { steps, activeStep, orientation = 'horizontal', className, ...props },
  ref,
) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <ol
      ref={ref}
      data-orientation={orientation}
      className={cn(
        'flex list-none',
        isHorizontal ? 'w-full items-start' : 'flex-col items-stretch gap-4',
        className,
      )}
      {...props}
    >
      {steps.map((step, index) => {
        const state = stepState(index, activeStep);
        const isLast = index === steps.length - 1;
        const connectorComplete = index < activeStep;

        return (
          <li
            key={index}
            data-state={state}
            aria-current={index === activeStep ? 'step' : undefined}
            className={cn(
              'flex',
              isHorizontal ? 'flex-1 flex-col items-center gap-2 text-center' : 'flex-row gap-3',
            )}
          >
            <div
              className={cn(
                'flex items-center',
                isHorizontal ? 'w-full' : 'flex-col items-center self-stretch',
              )}
            >
              <span className={cn(stepMarkerVariants({ state }))}>
                {state === 'complete' ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
              </span>
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    connectorComplete ? 'bg-primary' : 'bg-border',
                    isHorizontal ? 'h-px flex-1' : 'my-1 w-px flex-1',
                  )}
                />
              )}
            </div>
            <div
              className={cn('flex flex-col', isHorizontal ? 'items-center' : 'items-start pb-4')}
            >
              <span
                className={cn(
                  'text-sm font-medium',
                  state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {step.label}
              </span>
              {step.description && (
                <span className="text-muted-foreground text-xs">{step.description}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
});

/** @internal — CVA variant helper; compose via Stepper's internal state instead. */
export { stepMarkerVariants };
