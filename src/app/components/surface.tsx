/**
 * Surface — governed inset surface primitive.
 *
 * Enforces the "Surface Inset" rule: backgrounds MUST have internal padding.
 * - Default padding: px24 (cards) | px16 (items)
 * - Default border: none (elevation model — use shadow for lift)
 * - Fixed radius: var(--component-card-radius)
 * - shadow prop: applies a two-layer elevation shadow for card lift
 *
 * Usage:
 *   <Surface>Card content</Surface>
 *   <Surface padding="item">Compact item</Surface>
 *   <Surface shadow>Lifted card with elevation shadow.</Surface>
 *
 * @category Layout
 * @tier primitive
 * @doc-exempt: foundational inset primitive documented by usage throughout the system rather than a dedicated component doc page
 * @ai-intent Creates the only approved padded background-bearing wrapper in HDS so agents can express card, panel, and inset content without inventing ad hoc container chrome.
 * @ai-rules Use Surface only when content needs a background-bearing inset wrapper. Do NOT use Surface for macro page layouts, section spacing, or pure width constraints. Do NOT nest extra padded wrappers inside Surface to simulate another card. Do NOT recreate surface behavior with raw div padding, backgroundColor, or border styles elsewhere.
 */
"use client";

import React, { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';
import hds from '../design-system/tokens';

type PaddingOption = 'component' | 'item' | 'px16' | 'px24' | 'none';

const paddingMap: Record<PaddingOption, string> = {
  component: 'var(--semantic-space-component-padding)',
  item: '16px',
  px16: '16px',
  px24: '24px',
  none: '0px',
};

interface SurfaceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'className'> {
  /** Surface content. */
  children?: ReactNode;
  /** Padding: 'component' (24px, default) | 'item' (16px) | primitive px values | 'none' (0px). */
  padding?: PaddingOption;
  /** Reserved for future token incubation. Currently a no-op to keep surfaces token-governed. */
  shadow?: boolean;
  /** Override CSS overflow. */
  overflow?: CSSProperties['overflow'];
  /** Force a theme regardless of context: 'dark' | 'light'. Defaults to context value. */
  theme?: 'dark' | 'light';
  /** Escape hatch: only use for narrow layout adjustments that do not belong in the primitive API. */
  style?: CSSProperties;
  /** Escape hatch: only use when tokenized props cannot express the required wrapper class. */
  className?: string;
  /** Element rendered as the outer wrapper. Defaults to 'div'. */
  as?: React.ElementType;
}

/** @public */
export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  function Surface(
    { children, padding = 'component', shadow = false, overflow, theme: themeProp, style, className, as: Tag = 'div', ...rest },
    ref,
  ) {
    const { isDark: contextIsDark } = useTheme();
    const isDark = themeProp !== undefined ? themeProp === 'dark' : contextIsDark;
    const surfaceBackground = isDark ? hds.color.surface.raised.dark : hds.color.surface.raised.light;

    const surfaceStyle: CSSProperties = {
      backgroundColor: surfaceBackground,
      padding: paddingMap[padding],
      borderRadius: 'var(--component-card-radius)',
      border: 'none',
      ...(shadow && { boxShadow: '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.05)' }),
      boxSizing: 'border-box',
      height: '100%',
      ...(overflow !== undefined && { overflow }),
      ...style,
    };

    return (
      <Tag
        ref={ref}
        className={className}
        style={surfaceStyle}
        data-hds-surface="true"
        data-hds-component="Surface"
        data-hds-metrics={`padding:${padding}`}
        {...rest}
      >
        {children}
      </Tag>
    );
  },
);
