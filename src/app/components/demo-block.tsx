/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 */
// @doc-exempt: documentation primitive used to frame component-doc specimens.
/**
 * DemoBlock - framed surface for component-doc specimens (variant strips, matrices).
 * Wraps content in the same neutral surface as PreviewFrame, without the corner caption.
 * Optional heading renders above the frame as the section label.
 * @category Utilities
 */
import type { ReactNode } from 'react';
import hds from '../design-system/tokens';
import { PreviewFrame } from './preview-frame';

export function DemoBlock({
  children,
  heading,
  align = 'start',
  minHeight,
}: {
  children: ReactNode;
  heading?: string;
  align?: 'center' | 'start';
  minHeight?: number;
}) {
  if (!heading) {
    return (
      <PreviewFrame label="" align={align} minHeight={minHeight}>
        {children}
      </PreviewFrame>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: hds.semantic.space.component.gap }}>
      <h4
        style={{
          ...hds.typeStyles.ui,
          color: 'var(--semantic-color-content-primary)',
          margin: 0,
        }}
      >
        {heading}
      </h4>
      <PreviewFrame label="" align={align} minHeight={minHeight}>
        {children}
      </PreviewFrame>
    </div>
  );
}
