// @doc-exempt: internal HDS documentation shell wrapper, not a standalone component artifact
import type { ReactNode } from 'react';
import { DocLayout, type DocLayoutContentMaxWidth } from './DocLayout';

/**
 * HdsSystemDocLayout — single centered content column for documentation pages.
 * Thin wrapper around DocLayout: takes only `contentSlot` and `contentMaxWidth`,
 * with no sidebar or nav region to pass one into. Not the three-column docs
 * shell (left rail + content + right rail) — that is tracked as its own shell
 * component (hds#280).
 * @public
 */
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
