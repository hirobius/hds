/**
 * Icon — semantic icon wrapper for Lucide icons.
 * @category Display
 * @tier primitive
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import hds from '../design-system/tokens';

/** @public */
export type IconSize = keyof typeof hds.iconSize | number | string;

// Map Phosphor weight names to Lucide strokeWidth values for backward compat.
const WEIGHT_TO_STROKE: Record<string, number> = {
  thin: 1,
  light: 1.5,
  regular: 2,
  bold: 2.5,
  fill: 2,
  duotone: 2,
};

export interface IconProps {
  /** Lucide icon component to render. */
  icon: LucideIcon;
  /** Size token from `hds.iconSize`. */
  size?: IconSize;
  /** CSS color value or token, such as `var(--semantic-color-content-secondary)`. */
  color?: string;
  /** Optional class hook for layout or utility styling (rotation, transition, etc.). */
  className?: string;
  /** Optional inline styles for rare rotation, transition, or layout tweaks. */
  style?: React.CSSProperties;
  /**
   * Stroke weight shim for backward compatibility with former Phosphor weight prop.
   * Maps to Lucide's `strokeWidth` (thin=1, light=1.5, regular=2, bold=2.5).
   */
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  /** `aria-hidden` defaults to true because HDS icons are decorative by default. */
  'aria-hidden'?: boolean | 'true' | 'false';
}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
  {
    icon: IconComponent,
    size = 'small',
    color = 'currentColor',
    className = '',
    style,
    weight,
    'aria-hidden': ariaHidden = true,
  },
  ref,
) {
  if (import.meta.env.DEV && !IconComponent) {
    console.warn('[Icon] icon prop is missing or undefined. Provide a Lucide icon component.');
    return null;
  }

  // If the size isn't a known hds.iconSize token, use it literally (fallback)
  const numericSize = hds.iconSize[size as keyof typeof hds.iconSize] || size;
  const strokeWidth = weight ? WEIGHT_TO_STROKE[weight] : undefined;
  const resolvedStyle = {
    width: numericSize,
    height: numericSize,
    minWidth: numericSize,
    minHeight: numericSize,
    display: 'block',
    flexShrink: 0,
    aspectRatio: '1 / 1',
    ...(style && typeof style === 'object' ? style : undefined),
  } satisfies React.CSSProperties;

  // Lucide's `size` prop is written to the SVG `width`/`height` *attributes*,
  // which only accept a raw length — a token like `var(--primitive-*)` is
  // invalid there and the browser rejects it (console error). Our `style` below
  // already sizes the icon via those same vars (valid as CSS), so only forward
  // `size` when it's a real number; otherwise let the style drive it.
  const numericSizeProp = typeof numericSize === 'number' ? numericSize : undefined;

  return (
    <IconComponent
      ref={ref}
      size={numericSizeProp}
      color={color}
      className={className}
      style={resolvedStyle}
      strokeWidth={strokeWidth}
      aria-hidden={ariaHidden}
      data-hds-icon=""
    />
  );
});
