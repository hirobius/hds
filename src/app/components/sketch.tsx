/**
 * Sketch — shared shell for generative canvases and WebGL sketches.
 * @category Layout
 * @tier pattern
 */

import type { CSSProperties, ReactNode } from 'react';
import { warnOnce } from '../../lib/deprecation';
import hds from '../design-system/tokens';
import { Surface } from './surface';
import { Stack } from './stack';

/** @public */
export interface SketchProps {
  title: string;
  children: ReactNode;
  controls?: ReactNode;
}

/**
 * Sketch — shared shell for generative canvases and WebGL sketches.
 *
 * @deprecated Sketch is an HDS docs/lab internal (shell for generative canvas/WebGL specimen pages), not a consumer-facing HDS surface. It will be retiered to `utility` (dropped from the published barrel) at the named major.
 * @removeIn 1.0.0
 */
export function Sketch({ title, children, controls }: SketchProps) {
  warnOnce(
    'sketch-deprecated',
    'Sketch is an HDS docs/lab internal and will be removed from the published barrel in 1.0.0.',
  );
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
