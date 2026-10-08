/**
 * Tests for Select — label + selected-value rendering, ref forwarding.
 * Plain-DOM assertions (no jest-dom). Radix Select's open/option interaction
 * relies on pointer-capture APIs jsdom lacks, so these cover the render contract.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Select } from './select';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

const OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
];

describe('Select', () => {
  it('renders the field label and the selected option label on the trigger', () => {
    render(<Select label="Plan" value="pro" onChange={() => {}} options={OPTIONS} />);
    expect(screen.getByText('Plan')).not.toBeNull();
    expect(screen.getByText('Pro')).not.toBeNull();
  });

  it('omits the visible label when showLabel is false', () => {
    render(
      <Select label="Plan" showLabel={false} value="free" onChange={() => {}} options={OPTIONS} />,
    );
    expect(screen.queryByText('Plan')).toBeNull();
    expect(screen.getByText('Free')).not.toBeNull();
  });

  it('forwards its ref to the trigger button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Select ref={ref} label="Plan" value="pro" onChange={() => {}} options={OPTIONS} />);
    expect(ref.current?.tagName).toBe('BUTTON');
  });

  it('does not crash with empty options (async list not loaded) and labels the trigger with the field name', () => {
    expect(() =>
      render(<Select label="Plan" value="" onChange={() => {}} options={[]} />),
    ).not.toThrow();
    expect(screen.getByRole('combobox').getAttribute('aria-label')).toBe('Plan');
  });

  it('does not mislabel the trigger when the value matches no option', () => {
    render(<Select label="Plan" value="does-not-exist" onChange={() => {}} options={OPTIONS} />);
    // No bogus "Plan: Free" from the old `options[0]` fallback — just the field name.
    expect(screen.getByRole('combobox').getAttribute('aria-label')).toBe('Plan');
  });

  it('includes the selected option label on the trigger when matched', () => {
    render(<Select label="Plan" value="pro" onChange={() => {}} options={OPTIONS} />);
    expect(screen.getByRole('combobox').getAttribute('aria-label')).toBe('Plan: Pro');
  });
});

describe('Select highlighted row ring', () => {
  it('draws a 2px inset ring on the highlighted option', () => {
    render(<Select label="Plan" value="free" onChange={() => {}} options={OPTIONS} />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
    const cls = screen.getAllByRole('option')[0].className;
    expect(cls).toContain('data-[highlighted]:ring-2');
    expect(cls).toContain('data-[highlighted]:ring-inset');
    expect(cls.split(/\s+/)).not.toContain('hds-focus');
    expect(cls).toContain('data-[highlighted]:ring-ring');
  });
});

describe('Select label (a11y)', () => {
  it('renders a real <label> wired to the trigger, so clicking it focuses the trigger', () => {
    render(<Select label="Plan" value="pro" onChange={() => {}} options={OPTIONS} />);
    const label = screen.getByText('Plan');
    expect(label.tagName).toBe('LABEL');
    const trigger = screen.getByRole('combobox');
    expect(trigger.id).not.toBe('');
    expect(label.getAttribute('for')).toBe(trigger.id);
    // The label is a labelable association, not just markup.
    expect((label as HTMLLabelElement).control).toBe(trigger);
  });

  it('uses the consumer-provided id for both label and trigger', () => {
    render(<Select id="plan-id" label="Plan" value="pro" onChange={() => {}} options={OPTIONS} />);
    expect(screen.getByRole('combobox').id).toBe('plan-id');
    expect(screen.getByText('Plan').getAttribute('for')).toBe('plan-id');
  });

  it('still gives the trigger an id and no label element when the label is hidden', () => {
    const { container } = render(
      <Select label="Plan" showLabel={false} value="free" onChange={() => {}} options={OPTIONS} />,
    );
    expect(container.querySelector('label')).toBeNull();
    const trigger = screen.getByRole('combobox');
    expect(trigger.id).not.toBe('');
    expect(trigger.getAttribute('aria-label')).toBe('Plan: Free');
  });
});
