/**
 * Checkbox, Radio and Toggle share one label row. The gap between the control
 * and its text is the 8px spacing step (semantic.space.scale.xs), so the focus
 * ring around the control has clear space before the text. It was 4px
 * (subgrid.gap), which let the ring crowd the label.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Checkbox } from './checkbox';
import { Radio } from './radio';
import { Toggle } from './toggle';

afterEach(cleanup);

const controls = {
  Checkbox: () => <Checkbox label="Label" checked={false} onChange={() => {}} />,
  Radio: () => <Radio label="Label" checked={false} onChange={() => {}} />,
  Toggle: () => <Toggle label="Label" checked={false} onChange={() => {}} />,
};

describe('control label gap', () => {
  for (const [name, renderControl] of Object.entries(controls)) {
    it(`${name}: 8px (scale.xs) between the control and its label`, () => {
      render(renderControl());
      const label = screen.getByText('Label').closest('label') as HTMLLabelElement;
      const classes = label.className.split(/\s+/);
      expect(classes).toContain('gap-scale-xs');
      expect(classes).not.toContain('gap-[var(--semantic-space-subgrid-gap)]');
    });
  }
});
