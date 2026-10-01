/**
 * Kept components must not render the components #389 deprecates (hds#392).
 * A deprecated component warns at render (src/lib/deprecation.ts), so if
 * Pagination or InlineCode still drew IconButton inside, every consumer of
 * theirs would see a warning about a component they never used. The mocks
 * below make the deprecated component throw on render; a kept component that
 * still uses it fails here.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Pagination } from '../src/app/components/pagination';
import { InlineCode } from '../src/app/components/inline-code';

vi.mock('../src/app/components/icon-button', () => ({
  IconButton: () => {
    throw new Error('IconButton rendered inside a kept component');
  },
}));

afterEach(cleanup);

describe('kept components render without IconButton', () => {
  it('Pagination', () => {
    render(<Pagination page={2} count={5} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Next page' })).not.toBeNull();
  });

  it('InlineCode (copyable)', () => {
    render(<InlineCode copyable>var(--x)</InlineCode>);
    expect(screen.getByRole('button', { name: 'Copy' })).not.toBeNull();
  });
});
