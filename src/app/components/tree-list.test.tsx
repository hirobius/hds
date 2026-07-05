import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TreeList, type TreeNode } from './tree-list';

afterEach(cleanup);

const items: TreeNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'button', label: 'button.tsx' },
      { id: 'input', label: 'input.tsx' },
    ],
  },
  { id: 'readme', label: 'README.md' },
];

describe('TreeList', () => {
  it('renders top-level items with treeitem role', () => {
    render(<TreeList items={items} />);
    expect(screen.getAllByRole('treeitem').length).toBe(2);
  });

  it('marks a parent with aria-expanded and hides its children until toggled', () => {
    render(<TreeList items={items} />);
    const parent = screen.getByRole('treeitem', { name: /src/ });
    expect(parent.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.queryByText('button.tsx')).toBeNull();
  });

  it('reveals the nested group and children when the toggle is clicked', () => {
    render(<TreeList items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    expect(screen.getByRole('group')).not.toBeNull();
    expect(screen.getByText('button.tsx')).not.toBeNull();
    expect(screen.getByText('input.tsx')).not.toBeNull();
  });

  it('calls onSelect with the node id when a leaf label is clicked', () => {
    const onSelect = vi.fn();
    render(<TreeList items={items} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('README.md'));
    expect(onSelect).toHaveBeenCalledWith('readme');
  });
});
