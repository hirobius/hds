import * as React from 'react';
import { cva } from 'class-variance-authority';

export const widgetVariants = cva('widget', {
  variants: { tone: { neutral: '', danger: '' } },
  defaultVariants: { tone: 'neutral' },
});

export interface WidgetProps {
  tone?: 'neutral' | 'danger';
}

export function Widget({ tone }: WidgetProps) {
  return <div className={widgetVariants({ tone })} />;
}
