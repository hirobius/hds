'use client';

import { VisuallyHidden } from '@hirobius/design-system';
import { DEMOS, DemoFrame } from './component-demos';
import type { PreviewedComponent } from '../lib/previewed-components';

/**
 * Client boundary: picks the demo by name so the server page passes only a string.
 * The demo sits under the page h1, before the first h2, so the frame opens with a
 * hidden h2: a demo's own h3 headings (Card.Title) then keep the heading order.
 */
export function ComponentDemo({ name }: { name: PreviewedComponent }) {
  const Demo = DEMOS[name];
  return (
    <DemoFrame>
      <VisuallyHidden as="h2">Live example</VisuallyHidden>
      <Demo />
    </DemoFrame>
  );
}
