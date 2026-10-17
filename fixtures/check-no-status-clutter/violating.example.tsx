// violating: each line below paints status clutter (Adrian, 2026-10-16).
import * as React from 'react';
import { Badge } from '@hirobius/design-system';

export function Clutter() {
  return (
    <div>
      <Badge dot tone="success" />
      <Badge tone="danger" dot />
      <div className="rounded-lg border border-border border-l-4 border-l-feedback-success p-4">
        tile
      </div>
      <div className="border-l-[3px] border-primary">tile</div>
    </div>
  );
}

export const css = `.tile { border-left: 3px solid var(--hds-accent-bar); }`;
