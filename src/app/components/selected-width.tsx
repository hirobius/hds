/**
 * @internal — not part of @hirobius/design-system public API surface.
 * @doc-ignore shared helper for Tabs, Tag and SegmentedControl labels, not an HDS component
 */
import * as React from 'react';

/**
 * Holds a text label at its selected (semibold) width in every state, so selecting it does
 * not move its neighbours (#1593). utilities.css `.hds-selected-width` draws the label again
 * as a hidden, zero-height semibold `::after` from `data-text`; the box takes the wider of the
 * two. A pseudo-element adds no DOM text, so getByText and screen readers see one label.
 * Non-text children render unchanged.
 */
export function SelectedWidth({ children }: { children: React.ReactNode }) {
  if (typeof children !== 'string' && typeof children !== 'number') return <>{children}</>;
  return (
    <span className="hds-selected-width" data-text={children}>
      {children}
    </span>
  );
}
