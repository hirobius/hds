import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import hds from '../design-system/tokens';
import { PageHeader } from './page-header';

afterEach(cleanup);

describe('PageHeader', () => {
  it('renders breadcrumb, title, status and actions in their slots', () => {
    render(
      <PageHeader
        breadcrumb={<nav aria-label="Trail">Clients / Acme</nav>}
        title="Acme Co"
        status={<span>Active</span>}
        actions={<button type="button">Edit</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Acme Co' })).not.toBeNull();
    expect(screen.getByRole('navigation', { name: 'Trail' })).not.toBeNull();
    expect(screen.getByText('Active')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Edit' })).not.toBeNull();
  });

  it('renders a one-line description under the title', () => {
    const { container } = render(
      <PageHeader title="Pitch" description="Businesses with a site built and ready to show." />,
    );
    const description = container.querySelector('[data-slot="description"]');
    expect(description?.textContent).toBe('Businesses with a site built and ready to show.');
    const heading = screen.getByRole('heading', { name: 'Pitch' });
    // After the title in reading order, and not part of the heading's name.
    expect(heading.compareDocumentPosition(description!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('omits the empty slots', () => {
    const { container } = render(<PageHeader title="Only a title" />);
    expect(container.querySelector('[data-slot="breadcrumb"]')).toBeNull();
    expect(container.querySelector('[data-slot="status"]')).toBeNull();
    expect(container.querySelector('[data-slot="actions"]')).toBeNull();
    expect(container.querySelector('[data-slot="description"]')).toBeNull();
  });

  it('uses the heading2 font size at every level; level only changes the element', () => {
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      const { unmount } = render(<PageHeader title={`Level ${level}`} level={level} />);
      const heading = screen.getByRole('heading', { name: `Level ${level}` });
      expect(heading.tagName).toBe(`H${level}`);
      expect(heading.style.fontSize).toBe(hds.typeStyles.heading2.fontSize);
      unmount();
    }
  });

  it('defaults the title to an h1', () => {
    render(<PageHeader title="Default" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Default' })).not.toBeNull();
  });

  it('puts the actions after the title in DOM order', () => {
    const { container } = render(
      <PageHeader title="Acme" actions={<button type="button">Edit</button>} />,
    );
    const heading = screen.getByRole('heading', { name: 'Acme' });
    const actions = container.querySelector('[data-slot="actions"]') as HTMLElement;
    expect(
      heading.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders the metadata row before the heading without changing its level', () => {
    const { container } = render(
      <PageHeader
        title="Acme"
        level={2}
        metadata={
          <>
            <span>Source: Referral</span>
            <span>Stage: Pitch</span>
          </>
        }
      />,
    );
    const heading = screen.getByRole('heading', { level: 2, name: 'Acme' });
    const metadata = container.querySelector('[data-slot="metadata"]') as HTMLElement;
    expect(metadata.textContent).toBe('Source: ReferralStage: Pitch');
    expect(
      metadata.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(heading.textContent).toBe('Acme');
  });

  it('omits the metadata slot when empty', () => {
    const { container } = render(<PageHeader title="Acme" />);
    expect(container.querySelector('[data-slot="metadata"]')).toBeNull();
  });
  it('places the description below the title row by default, after the actions (hds#1150)', () => {
    const { container } = render(
      <PageHeader
        title="Acme"
        description="Seed round"
        actions={<button type="button">Edit</button>}
      />,
    );
    const description = container.querySelector('[data-slot="description"]') as HTMLElement;
    const actions = container.querySelector('[data-slot="actions"]') as HTMLElement;
    expect(
      actions.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container.querySelector('[data-slot="title-group"]')?.contains(description)).toBe(false);
  });

  it('descriptionPlacement="title" puts the description under the title, before the actions (hds#1150)', () => {
    const { container } = render(
      <PageHeader
        title="Acme"
        description="Seed round"
        descriptionPlacement="title"
        actions={<button type="button">Edit</button>}
      />,
    );
    const description = container.querySelector('[data-slot="description"]') as HTMLElement;
    const actions = container.querySelector('[data-slot="actions"]') as HTMLElement;
    const group = container.querySelector('[data-slot="title-group"]') as HTMLElement;
    expect(group.contains(description)).toBe(true);
    expect(group.contains(screen.getByRole('heading', { name: 'Acme' }))).toBe(true);
    expect(
      description.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders the title menu trigger right after the heading, and none without titleMenu (hds#1150)', () => {
    const { container, rerender } = render(<PageHeader title="Acme" />);
    expect(container.querySelector('[data-slot="title-menu"]')).toBeNull();
    rerender(
      <PageHeader
        title="Acme"
        titleMenu={<span>item</span>}
        titleMenuLabel="Acme options"
        status={<span>Live</span>}
      />,
    );
    const heading = screen.getByRole('heading', { name: 'Acme' });
    const slot = container.querySelector('[data-slot="title-menu"]') as HTMLElement;
    const status = container.querySelector('[data-slot="status"]') as HTMLElement;
    expect(heading.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(slot.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
