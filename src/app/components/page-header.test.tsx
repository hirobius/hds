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

  it('omits the empty slots', () => {
    const { container } = render(<PageHeader title="Only a title" />);
    expect(container.querySelector('[data-slot="breadcrumb"]')).toBeNull();
    expect(container.querySelector('[data-slot="status"]')).toBeNull();
    expect(container.querySelector('[data-slot="actions"]')).toBeNull();
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
});
