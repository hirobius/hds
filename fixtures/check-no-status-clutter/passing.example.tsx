// passing: status lives in the content, not in a dot or a coloured left bar.
import * as React from 'react';
import { Avatar, Badge, StatusListItem } from '@hirobius/design-system';

export function Clean() {
  return (
    <div>
      <Badge tone="success">Applied</Badge>
      <StatusListItem title="Invoice sent" trailing={<Badge tone="warning">Overdue</Badge>} />
      <blockquote className="border-l-2 border-border pl-4">
        A neutral quote rule is not a status bar.
      </blockquote>
      <Avatar name="Ada Lovelace" />
      <span className="size-10 rounded-full bg-muted" />
      <span>Ada • 3 min ago</span>
    </div>
  );
}
