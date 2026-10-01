/**
 * Pins the flex layout the four screen patterns draw (hds#392): PageHeader,
 * FormActions, DataTableSection and DestructiveSection. Their wrapping rows
 * moved from Cluster to Stack direction="row" wrap="wrap" so Cluster can be
 * deprecated (#389) without every PageHeader user seeing a warning. The swap
 * may change the `data-hds-component` attribute and nothing else: direction,
 * wrap, gap, alignment, distribution, element and metrics stay as they were.
 *
 * Each case lists every Cluster or Stack the pattern renders, in DOM order, so
 * a wrapper added or dropped by the swap fails here too.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PageHeader } from '../src/app/components/page-header';
import { FormActions } from '../src/app/components/form-actions';
import { DataTableSection } from '../src/app/components/data-table-section';
import { DestructiveSection } from '../src/app/components/destructive-section';

afterEach(cleanup);

/** The component the patterns' wrapping rows render: Stack since hds#392, Cluster before. */
const WRAPPING_ROW = 'Stack';

const GAP = {
  tight: 'var(--semantic-space-scale-sm)',
  normal: 'var(--semantic-space-scale-md)',
} as const;

interface Layout {
  component: string | null;
  tag: string;
  className: string;
  display: string;
  direction: string;
  wrap: string;
  gap: string;
  align: string;
  justify: string;
  metrics: string | null;
}

function layout(el: Element | null | undefined): Layout {
  if (!(el instanceof HTMLElement)) throw new Error('layout(): expected an element');
  const s = el.style;
  return {
    component: el.getAttribute('data-hds-component'),
    tag: el.tagName.toLowerCase(),
    className: el.className,
    display: s.display,
    // Cluster leaves flex-direction unset, and its initial value is row.
    direction: s.flexDirection || 'row',
    wrap: s.flexWrap,
    gap: s.gap,
    align: s.alignItems,
    justify: s.justifyContent,
    metrics: el.getAttribute('data-hds-metrics'),
  };
}

function wrappingRow(gap: keyof typeof GAP, align: string, justify: string): Layout {
  return {
    component: WRAPPING_ROW,
    tag: 'div',
    className: '',
    display: 'flex',
    direction: 'row',
    wrap: 'wrap',
    gap: GAP[gap],
    align,
    justify,
    metrics: `gap:${gap}`,
  };
}

const COLUMN: Layout = {
  component: 'Stack',
  tag: 'div',
  className: '',
  display: 'flex',
  direction: 'column',
  wrap: '',
  gap: GAP.tight,
  align: '',
  justify: '',
  metrics: 'gap:tight',
};

/** Every Cluster or Stack under `root`, in DOM order. */
function flexWrappers(root: Element): Element[] {
  return Array.from(
    root.querySelectorAll('[data-hds-component="Cluster"], [data-hds-component="Stack"]'),
  );
}

describe('screen pattern layout', () => {
  it('PageHeader: a column holding a spaced row of the title group and the end-aligned actions', () => {
    const { container } = render(
      <PageHeader
        breadcrumb={<nav aria-label="Trail">Clients / Acme</nav>}
        title="Acme Co"
        status={<span>Active</span>}
        actions={<button type="button">Edit</button>}
      />,
    );
    const header = container.querySelector('[data-hds-component="PageHeader"]') as Element;
    const column = header.firstElementChild;
    const titleGroup = screen.getByRole('heading', { name: 'Acme Co' }).parentElement;
    const mainRow = titleGroup?.parentElement;
    const actionsRow = container.querySelector('[data-slot="actions"]')?.firstElementChild;

    expect(flexWrappers(header)).toEqual([column, mainRow, titleGroup, actionsRow]);
    expect([column, mainRow, titleGroup, actionsRow].map(layout)).toEqual([
      COLUMN,
      wrappingRow('normal', 'flex-start', 'space-between'),
      wrappingRow('tight', 'center', 'flex-start'),
      wrappingRow('tight', 'center', 'flex-end'),
    ]);
  });

  it('FormActions: one end-aligned row, or a spaced row when a destructive action is present', () => {
    const plain = render(
      <FormActions
        primary={<button type="submit">Save</button>}
        secondary={<button type="button">Cancel</button>}
      />,
    );
    let root = plain.container.querySelector('[data-hds-component="FormActions"]') as Element;
    let row = root.firstElementChild;
    let group = plain.container.querySelector('[data-slot="group"]')?.firstElementChild;
    expect(flexWrappers(root)).toEqual([row, group]);
    expect([row, group].map(layout)).toEqual([
      wrappingRow('tight', 'center', 'flex-end'),
      wrappingRow('tight', 'center', 'flex-end'),
    ]);
    plain.unmount();

    const withDestructive = render(
      <FormActions
        primary={<button type="submit">Save</button>}
        secondary={<button type="button">Cancel</button>}
        destructive={<button type="button">Delete</button>}
      />,
    );
    root = withDestructive.container.querySelector('[data-hds-component="FormActions"]') as Element;
    row = root.firstElementChild;
    group = withDestructive.container.querySelector('[data-slot="group"]')?.firstElementChild;
    expect(flexWrappers(root)).toEqual([row, group]);
    expect([row, group].map(layout)).toEqual([
      wrappingRow('tight', 'center', 'space-between'),
      wrappingRow('tight', 'center', 'flex-end'),
    ]);
  });

  it('DataTableSection: a column with a spaced heading row, an end-aligned toolbar and end-aligned row actions', () => {
    const { container } = render(
      <DataTableSection
        title="Projects"
        toolbar={<button type="button">Add project</button>}
        columns={[{ key: 'name', label: 'Project' }]}
        rows={[
          { key: 'a', cells: ['Site rebuild'], actions: <button type="button">Edit a</button> },
        ]}
      />,
    );
    const section = container.querySelector('[data-hds-component="DataTableSection"]') as Element;
    const column = section.firstElementChild;
    const headingRow = screen.getByRole('heading', { name: 'Projects' }).parentElement;
    const toolbarRow = container.querySelector('[data-slot="toolbar"]')?.firstElementChild;
    const rowActions = screen.getByRole('button', { name: 'Edit a' }).parentElement;

    expect(flexWrappers(section)).toEqual([column, headingRow, toolbarRow, rowActions]);
    expect([column, headingRow, toolbarRow, rowActions].map(layout)).toEqual([
      COLUMN,
      wrappingRow('normal', 'center', 'space-between'),
      wrappingRow('tight', 'center', 'flex-end'),
      wrappingRow('tight', 'center', 'flex-end'),
    ]);
  });

  it('DestructiveSection: one spaced row of the copy and the danger action', () => {
    const { container } = render(
      <DestructiveSection
        title="Archive client"
        description="Hides the client from every list."
        confirmLabel="Yes, archive"
        confirmBody="Archived clients stop receiving updates."
        onConfirm={() => {}}
      />,
    );
    const section = container.querySelector('[data-hds-component="DestructiveSection"]') as Element;
    const row = container.querySelector('[data-slot="copy"]')?.parentElement;

    expect(flexWrappers(section)).toEqual([row]);
    expect(layout(row)).toEqual(wrappingRow('normal', 'center', 'space-between'));
  });
});
