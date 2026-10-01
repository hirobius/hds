/**
 * Kept components must not render the components #389 prunes (hds#392). The
 * screen patterns drew Cluster, and Pagination and InlineCode drew IconButton;
 * hds#392 moved them onto Stack and Button so both could go, and 0.20.0
 * removed them (hds#394 wave 4b). A kept component that still imported either
 * would now fail the type check and the build, so these renders stay as the
 * smoke test that each kept component still draws without them.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Pagination } from '../src/app/components/pagination';
import { InlineCode } from '../src/app/components/inline-code';
import { PageHeader } from '../src/app/components/page-header';
import { FormActions } from '../src/app/components/form-actions';
import { DataTableSection } from '../src/app/components/data-table-section';
import { DestructiveSection } from '../src/app/components/destructive-section';

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
