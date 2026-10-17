// violating: each line below paints status clutter (Adrian, 2026-10-16).
import * as React from 'react';
import { Badge, StatusListItem } from '@hirobius/design-system';

export function Clutter() {
  return (
    <div>
      <Badge dot tone="success" />
      <Badge tone="danger" dot />
      <div className="rounded-lg border border-border border-l-4 border-l-feedback-success p-4">
        tile
      </div>
      <div className="border-l-[3px] border-primary">tile</div>
      <StatusListItem tone="warning" title="Invoice overdue" />
      <span className="status-dot" />
      <span className="size-2 rounded-full bg-feedback-success" />
      <span>● Online</span>
    </div>
  );
}

export const css = `.tile { border-left: 3px solid var(--hds-accent-bar); }`;
