'use client';

import { DEMOS, DemoFrame } from './component-demos';
import type { PreviewedComponent } from '../lib/previewed-components';

/** Client boundary: picks the demo by name so the server page passes only a string. */
export function ComponentDemo({ name }: { name: PreviewedComponent }) {
  const Demo = DEMOS[name];
  return (
    <DemoFrame>
      <Demo />
    </DemoFrame>
  );
}
