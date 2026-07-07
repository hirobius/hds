// @doc-exempt: internal HDS documentation shell wrapper, not a standalone component artifact
import type { ReactNode } from 'react';
import { DocLayout, type DocLayoutContentMaxWidth } from './DocLayout';

/** @public */
export function HdsSystemDocLayout({
  contentSlot,
  contentMaxWidth = 'content',
}: {
  contentSlot: ReactNode;
  contentMaxWidth?: DocLayoutContentMaxWidth;
}) {
  return (
    <div className="hds-page-enter" style={{ marginTop: 0, paddingTop: 0 }}>
      <DocLayout contentSlot={contentSlot} contentMaxWidth={contentMaxWidth} />
    </div>
  );
}
