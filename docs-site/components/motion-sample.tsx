/**
 * The thing that moves in the motion demos (hds#1397): a rounded square in the cobalt accent,
 * so it never reads as another button. Shared by the Motion page's token presets and its
 * recipe demos. Decorative: the demo's button and caption carry the meaning.
 */
import type { CSSProperties, ReactNode } from 'react';

export function MotionSample({
  children,
  className,
  style,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      data-accent="cobalt"
      aria-hidden="true"
      className={['hds-motion-sample', className].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </span>
  );
}
