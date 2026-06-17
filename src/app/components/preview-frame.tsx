/* eslint-disable no-restricted-syntax */
/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 */
// @doc-exempt: documentation preview shell used by component docs and utilities.
/**
 * PreviewFrame - documentation preview shell for storefront component demos.
 * @category Utilities
 */
import type { ReactNode } from 'react';
import hds from '../design-system/tokens';
import { Surface } from './surface';
import { Text } from './text';

const previewFrameLabelStyle = {
  position: 'absolute',
  bottom: hds.semantic.space.component.gap,
  right: hds.semantic.space.component.gap,
  ...hds.typeStyles.caption,
  color: 'var(--semantic-color-content-secondary)',
  userSelect: 'none',
  pointerEvents: 'none',
} as const;

export function PreviewFrame({
  children,
  label = 'preview',
  minHeight,
  align = 'center',
}: {
  children: ReactNode;
  label?: string;
  minHeight?: number;
  align?: 'center' | 'start';
}) {
  const alignItems = align === 'center' ? 'center' : 'start';

  return (
    <Surface
      padding="component"
      style={{
        position: 'relative',
        overflow: 'hidden',
        border: `${hds.borderWidth.xs} solid var(--semantic-color-border-subtle)`,
        backgroundColor: 'transparent',
      }}
    >
      <div
        style={{
          minHeight,
          display: 'grid',
          alignItems,
          justifyItems: alignItems,
        }}
      >
        {children}
      </div>
      {label ? (
        <Text as="span" variant="caption" aria-hidden="true" style={previewFrameLabelStyle}>
          {label}
        </Text>
      ) : null}
    </Surface>
  );
}
