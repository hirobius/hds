/**
 * Tests for HdsSelect — label + selected-value rendering, ref forwarding.
 * Plain-DOM assertions (no jest-dom). Radix Select's open/option interaction
 * relies on pointer-capture APIs jsdom lacks, so these cover the render contract.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { HdsSelect } from './select';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

const OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
];

describe('HdsSelect', () => {
  it('renders the field label and the selected option label on the trigger', () => {
    render(<HdsSelect label="Plan" value="pro" onChange={() => {}} options={OPTIONS} />);
    expect(screen.getByText('Plan')).not.toBeNull();
    expect(screen.getByText('Pro')).not.toBeNull();
  });

  it('omits the visible label when showLabel is false', () => {
    render(
      <HdsSelect label="Plan" showLabel={false} value="free" onChange={() => {}} options={OPTIONS} />,
    );
    expect(screen.queryByText('Plan')).toBeNull();
    expect(screen.getByText('Free')).not.toBeNull();
  });

  it('forwards its ref to the trigger button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<HdsSelect ref={ref} label="Plan" value="pro" onChange={() => {}} options={OPTIONS} />);
    expect(ref.current?.tagName).toBe('BUTTON');
  });
});
