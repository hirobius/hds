import * as React from 'react';
import { cva } from 'class-variance-authority';

export const widgetVariants = cva('widget', {
  variants: { tone: { info: '', danger: '' } },
  defaultVariants: { tone: 'info' },
});

export interface WidgetProps {
  tone?: 'info' | 'danger';
}

/**
 * Fixture component.
 * @figma https://www.figma.com/design/FIXTUREKEY/Fixture?node-id=1-2
 */
export function Widget({ tone }: WidgetProps) {
  return <div className={widgetVariants({ tone })} />;
}
