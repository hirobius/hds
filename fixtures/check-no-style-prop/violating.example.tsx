// violating: this feedback primitive leaks `style` two ways — an explicit
// style prop AND an un-omitted HTMLAttributes extension. Either alone fails.
import * as React from 'react';

export interface ViolatingBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'info' | 'success' | 'danger' | 'warning';
  style?: React.CSSProperties;
}

export function ViolatingBadge({ tone, style, ...rest }: ViolatingBadgeProps) {
  return <span data-tone={tone} style={style} {...rest} />;
}
