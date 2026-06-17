/**
 * Sketch — shared shell for generative canvases and WebGL sketches.
 * @category Layout
 * @tier pattern
 */

import type { CSSProperties, ReactNode } from 'react';
import hds from '../design-system/tokens';
import { Surface } from './surface';
import { Stack } from './stack';

/** @public */
export interface SketchProps {
  title: string;
  children: ReactNode;
  controls?: ReactNode;
}

export function Sketch({ title, children, controls }: SketchProps) {
  const headerStyle: CSSProperties = {
    padding: hds.semantic.space.component.padding,
    borderBottom: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
    flexShrink: 0,
  };

  const titleStyle: CSSProperties = {
    ...hds.typeStyles.ui,
    color: 'var(--semantic-color-content-primary)',
  };

  const canvasAreaStyle: CSSProperties = {
    position: 'relative',
    flex: 1,
    minHeight: 0,
  };

  return (
    <Surface
      theme="dark"
      padding="none"
      overflow="hidden"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <Stack gap="gap" style={headerStyle}>
        <Stack
          direction="row"
          align="center"
          justify={controls ? 'space-between' : 'start'}
          wrap="wrap"
          gap="gap"
        >
          <span style={titleStyle}>{title}</span>
          {controls ?? null}
        </Stack>
      </Stack>
      <div style={canvasAreaStyle}>{children}</div>
    </Surface>
  );
}
