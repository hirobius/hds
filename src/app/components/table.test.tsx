/**
 * Tests for Table — header/cell rendering, caption region a11y, and the
 * scrollable-region fallback label. Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Table, type TableColumn, type TableRow } from './table';

afterEach(cleanup);

const columns: TableColumn[] = [
  { key: 'token', label: 'Token' },
  { key: 'value', label: 'Value', align: 'right' },
];

const rows: TableRow[] = [
  { key: 'a', cells: [{ slot: 'token', content: 'space.4' }, { slot: 'value', content: '16px' }] },
  { key: 'b', cells: [{ slot: 'token', content: 'space.6' }, { slot: 'value', content: '24px' }] },
];

describe('Table', () => {
  it('renders column headers and cell content', () => {
    render(<Table columns={columns} rows={rows} />);
    expect(screen.getByText('Token')).toBeDefined();
    expect(screen.getByText('Value')).toBeDefined();
    expect(screen.getByText('space.4')).toBeDefined();
    expect(screen.getByText('24px')).toBeDefined();
  });

  it('labels the scroll region with the caption', () => {
    render(<Table columns={columns} rows={rows} caption="Spacing scale" />);
    const region = screen.getByRole('region', { name: 'Spacing scale' });
    expect(region.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('falls back to a generic scroll-region label without a caption', () => {
    render(<Table columns={columns} rows={rows} />);
    expect(screen.getByRole('region', { name: 'Scrollable table content' })).toBeDefined();
  });

  it('renders a description alongside the caption', () => {
    render(<Table columns={columns} rows={rows} caption="Scale" description="From the token set" />);
    expect(screen.getByText('From the token set')).toBeDefined();
  });
});
