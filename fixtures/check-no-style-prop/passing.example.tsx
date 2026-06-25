// passing: a feedback primitive that is className-only — its props interface
// omits 'style' from the HTMLAttributes it extends, and declares no style prop.
import * as React from 'react';

export interface PassingBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'style'> {
  tone?: 'neutral' | 'info' | 'success' | 'danger' | 'warning';
}

export function PassingBadge({ tone, ...rest }: PassingBadgeProps) {
  return <span data-tone={tone} {...rest} />;
}
