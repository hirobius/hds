/**
 * Tests for Table — sortable column aria-sort states + keyboard activation.
 * Plain-DOM assertions (no jest-dom matchers), matching the sibling suites in
 * this directory (menu.test.tsx, skeleton.test.tsx, ...).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Table, type TableColumn, type TableRow } from './table';

afterEach(cleanup);

const rows: TableRow[] = [
  {
    key: 'a',
    cells: [
      { slot: 'label', content: 'Alpha' },
      { slot: 'value', content: '1' },
    ],
  },
  {
    key: 'b',
    cells: [
      { slot: 'label', content: 'Beta' },
      { slot: 'value', content: '2' },
    ],
  },
];

function columnsWith(overrides: Partial<TableColumn>): TableColumn[] {
  return [
    { key: 'name', label: 'Name', ...overrides },
    { key: 'value', label: 'Value' },
  ];
}

describe('Table — sortable columns', () => {
  it('renders a non-sortable header cell with no aria-sort and no button (pixel parity)', () => {
    render(<Table columns={columnsWith({})} rows={rows} />);
    const header = screen.getByText('Name').closest('[role], div');
    expect(screen.queryByRole('button', { name: 'Name' })).toBeNull();
    // The header cell itself must not carry aria-sort when not sortable.
    const headerCell = screen.getByText('Name').parentElement;
    expect(headerCell?.getAttribute('aria-sort')).toBeNull();
    void header;
  });

  it('sets aria-sort="none" on a sortable column with no active direction', () => {
    render(<Table columns={columnsWith({ sortable: true })} rows={rows} />);
    const button = screen.getByRole('button', { name: 'Name' });
    const headerCell = button.closest('[aria-sort]');
    expect(headerCell?.getAttribute('aria-sort')).toBe('none');
  });

  it('sets aria-sort="ascending" when sortDirection is ascending', () => {
    render(
      <Table columns={columnsWith({ sortable: true, sortDirection: 'ascending' })} rows={rows} />,
    );
    const button = screen.getByRole('button', { name: 'Name' });
    const headerCell = button.closest('[aria-sort]');
    expect(headerCell?.getAttribute('aria-sort')).toBe('ascending');
  });

  it('sets aria-sort="descending" when sortDirection is descending', () => {
    render(
      <Table columns={columnsWith({ sortable: true, sortDirection: 'descending' })} rows={rows} />,
    );
    const button = screen.getByRole('button', { name: 'Name' });
    const headerCell = button.closest('[aria-sort]');
    expect(headerCell?.getAttribute('aria-sort')).toBe('descending');
  });

  it('fires onSort when the sort button is clicked', () => {
    const onSort = vi.fn();
    render(<Table columns={columnsWith({ sortable: true, onSort })} rows={rows} />);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it('fires onSort on Enter key', () => {
    const onSort = vi.fn();
    render(<Table columns={columnsWith({ sortable: true, onSort })} rows={rows} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Name' }), { key: 'Enter' });
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it('fires onSort on Space key', () => {
    const onSort = vi.fn();
    render(<Table columns={columnsWith({ sortable: true, onSort })} rows={rows} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Name' }), { key: ' ' });
    expect(onSort).toHaveBeenCalledTimes(1);
  });
});
