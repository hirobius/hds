import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { DataTableSection } from './data-table-section';
import type { TableColumn } from './table';

afterEach(cleanup);

const columns: TableColumn[] = [
  { key: 'name', label: 'Project' },
  { key: 'status', label: 'Status' },
];

const rows = [
  { key: 'a', cells: ['Site rebuild', 'Active'], actions: <button>Edit a</button> },
  { key: 'b', cells: ['Brand refresh', 'Paused'], actions: <button>Edit b</button> },
];

describe('DataTableSection', () => {
  it('renders the heading as a labelled region with the toolbar slot', () => {
    render(
      <DataTableSection
        title="Projects"
        toolbar={<button>Add project</button>}
        columns={columns}
        rows={rows}
      />,
    );
    const region = screen.getByRole('region', { name: 'Projects' });
    expect(within(region).getByRole('button', { name: 'Add project' })).not.toBeNull();
    expect(within(region).getByText('Site rebuild')).not.toBeNull();
  });

  it('puts the consumer-supplied row actions in a trailing column', () => {
    render(<DataTableSection title="Projects" columns={columns} rows={rows} />);
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Project', 'Status', 'Actions']);
    expect(screen.getByRole('button', { name: 'Edit a' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Edit b' })).not.toBeNull();
  });

  it('omits the actions column when no row has actions', () => {
    render(
      <DataTableSection
        title="Projects"
        columns={columns}
        rows={rows.map(({ key, cells }) => ({ key, cells }))}
      />,
    );
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  });

  it('renders the empty state, not the table, with zero rows', () => {
    const { container } = render(
      <DataTableSection
        title="Projects"
        columns={columns}
        rows={[]}
        emptyTitle="No projects yet"
        emptyDescription="Create one to get started."
      />,
    );
    expect(screen.getByText('No projects yet')).not.toBeNull();
    expect(screen.getByText('Create one to get started.')).not.toBeNull();
    expect(container.querySelector('[role="table"]')).toBeNull();
  });

  it('scrolls horizontally on narrow widths without a consumer minWidth', () => {
    const { container } = render(
      <DataTableSection title="Projects" columns={columns} rows={rows} />,
    );
    const table = container.querySelector('[role="table"]') as HTMLElement;
    // The table carries a derived minimum width, so it overflows instead of squeezing...
    expect(table.style.minWidth).not.toBe('');
    // ...and an ancestor scrolls that overflow horizontally.
    let node: HTMLElement | null = table.parentElement;
    let scroller: HTMLElement | null = null;
    while (node && node !== container) {
      if (node.style.overflowX === 'auto') scroller = node;
      node = node.parentElement;
    }
    expect(scroller).not.toBeNull();
    expect(scroller!.getAttribute('tabindex')).toBe('0');
  });

  it('aligns each cell with its column', () => {
    render(
      <DataTableSection
        title="Projects"
        columns={[
          { key: 'name', label: 'Project' },
          { key: 'value', label: 'Value', align: 'right' },
        ]}
        rows={[{ key: 'a', cells: ['Site rebuild', '$8,400'] }]}
      />,
    );
    const cells = screen.getAllByRole('cell');
    expect(cells[0].className).not.toContain('text-right');
    expect(cells[1].className).toContain('text-right');
  });
});
