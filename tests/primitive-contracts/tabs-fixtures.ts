/**
 * Tabs assertions shared by src/app/components/tabs.test.tsx and the
 * navigation accessibility contract, so both check the focus ring the same way.
 *
 * Not a test file (no `.test.` in the name), so vitest does not collect it.
 */
import { expect } from 'vitest';
import { screen } from '@testing-library/react';

/** The scrolling tablist is `overflow-x-auto`, so every trigger's ring must be inset or it is clipped. */
export function expectInsetFocusRing() {
  expect(screen.getByRole('tablist').className).toContain('overflow-x-auto');
  for (const tab of screen.getAllByRole('tab')) {
    const cls = tab.className.split(/\s+/);
    // .hds-focus-inset: the shared ring (semantic.focus.ring.width) drawn inside the edge.
    expect(cls).toContain('hds-focus-inset');
  }
}
