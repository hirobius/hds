// passing: status lives in the content, not in a dot or a coloured left bar.
import * as React from 'react';
import { Badge } from '@hirobius/design-system';

export function Clean() {
  return (
    <div>
      <Badge tone="success">Applied</Badge>
      <blockquote className="border-l-2 border-border pl-4">
        A neutral quote rule is not a status bar.
      </blockquote>
    </div>
  );
}
