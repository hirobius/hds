/**
 * Kept components must not render the components #389 deprecates (hds#392).
 * A deprecated component warns at render (src/lib/deprecation.ts), so if
 * Pagination or InlineCode still drew IconButton inside, or a screen pattern
 * still drew Cluster, every consumer of theirs would see a warning about a
 * component they never used. The mocks below make the deprecated components
 * throw on render; a kept component that still uses one fails here.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Pagination } from '../src/app/components/pagination';
import { InlineCode } from '../src/app/components/inline-code';
import { PageHeader } from '../src/app/components/page-header';
import { FormActions } from '../src/app/components/form-actions';
import { DataTableSection } from '../src/app/components/data-table-section';
import { DestructiveSection } from '../src/app/components/destructive-section';

vi.mock('../src/app/components/icon-button', () => ({
  IconButton: () => {
    throw new Error('IconButton rendered inside a kept component');
  },
}));

vi.mock('../src/app/components/cluster', () => ({
  Cluster: () => {
    throw new Error('Cluster rendered inside a kept component');
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

describe('screen patterns render without Cluster', () => {
  it('PageHeader', () => {
    render(
      <PageHeader title="Acme Co" status={<span>Active</span>} actions={<button>Edit</button>} />,
    );
    expect(screen.getByRole('heading', { name: 'Acme Co' })).not.toBeNull();
  });

  it('FormActions', () => {
    render(
      <FormActions
        primary={<button type="submit">Save</button>}
        destructive={<button type="button">Delete</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeNull();
  });

  it('DataTableSection', () => {
    render(
      <DataTableSection
        title="Projects"
        toolbar={<button>Add project</button>}
        columns={[{ key: 'name', label: 'Project' }]}
        rows={[{ key: 'a', cells: ['Site rebuild'], actions: <button>Edit a</button> }]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Edit a' })).not.toBeNull();
  });

  it('DestructiveSection', () => {
    render(
      <DestructiveSection
        title="Archive client"
        description="Hides the client from every list."
        confirmLabel="Yes, archive"
        confirmBody="Archived clients stop receiving updates."
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Yes, archive' })).not.toBeNull();
  });
});
