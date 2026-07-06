import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MetadataList } from './metadata-list';

afterEach(cleanup);

const items = [
  { term: 'Status', description: 'Active' },
  { term: 'Owner', description: 'Adrian' },
];

describe('MetadataList', () => {
  it('renders each term and description text', () => {
    render(<MetadataList items={items} />);
    expect(screen.getByText('Status')).not.toBeNull();
    expect(screen.getByText('Active')).not.toBeNull();
    expect(screen.getByText('Owner')).not.toBeNull();
    expect(screen.getByText('Adrian')).not.toBeNull();
  });

  it('defaults the orientation data attribute to vertical', () => {
    const { container } = render(<MetadataList items={items} />);
    expect(container.querySelector('dl')?.getAttribute('data-orientation')).toBe('vertical');
  });

  it('reflects an explicit horizontal orientation on the data attribute', () => {
    const { container } = render(<MetadataList items={items} orientation="horizontal" />);
    expect(container.querySelector('dl')?.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('renders one <dt>/<dd> pair per item', () => {
    const { container } = render(<MetadataList items={items} />);
    expect(container.querySelectorAll('dt')).toHaveLength(2);
    expect(container.querySelectorAll('dd')).toHaveLength(2);
  });

  it('marks the divided variant on the data attribute and stays a <dl>', () => {
    const { container } = render(<MetadataList items={items} variant="divided" />);
    const dl = container.querySelector('dl');
    expect(dl?.getAttribute('data-variant')).toBe('divided');
    expect(container.querySelectorAll('dt')).toHaveLength(2);
    expect(container.querySelectorAll('dd')).toHaveLength(2);
  });

  it('renders a footer band only in the divided variant', () => {
    const { rerender } = render(
      <MetadataList items={items} variant="divided" footer="42 tokens total" />,
    );
    expect(screen.getByText('42 tokens total')).not.toBeNull();

    // footer is ignored by the plain variant
    rerender(<MetadataList items={items} footer="42 tokens total" />);
    expect(screen.queryByText('42 tokens total')).toBeNull();
  });
});
