/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 */
﻿// @doc-exempt: preview harness used by docs and lab tooling, not a consumer-facing HDS surface.
/**
 * ComponentPreview - framed preview harness for utility and lab specimens.
 * @category Utilities
 */
import React from 'react';
import hds from '../design-system/tokens';
import { Surface } from './surface';

interface ComponentPreviewProps {
  component: React.ComponentType<Record<string, unknown>>;
  props?: Record<string, unknown>;
  bgColor?: string;
}

export function ComponentPreview({ component: Component, props = {}, bgColor = 'var(--semantic-color-surface-raised)' }: ComponentPreviewProps) {
  return (
    <Surface
      padding="component"
      className="w-full h-full flex items-center justify-center"
      style={{ backgroundColor: bgColor }}
    >
      <div className="w-full max-w-md" style={{ minHeight: hds.size[64] }}>
        <Component {...props} />
      </div>
    </Surface>
  );
}

