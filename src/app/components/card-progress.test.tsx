import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Card } from './card';

afterEach(cleanup);

describe('Card.Progress a11y', () => {
  it('names the progressbar from a string label', () => {
    render(<Card.Progress value={5} max={12} label="5 / 12 tasks" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe('5 / 12 tasks');
  });

  it('falls back to a generic accessible name when the label is not a string', () => {
    render(<Card.Progress value={5} max={12} label={<b>5 done</b>} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe('Progress');
  });

  it('names the progressbar when there is no label', () => {
    render(<Card.Progress value={50} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe('Progress');
  });
});
