/**
 * TreeList - a hierarchical, expandable list with correct tree ARIA semantics
 * for browsing nested navigation, file, or content structures.
 * @category Navigation
 * @tier pattern
 * @public
 */
// motion-ok: expand/collapse via CSS; chevron rotate on aria-expanded

import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface TreeNode {
  /** Stable identifier for the node, passed to `onSelect` when its label is clicked. */
  id: string;
  /** Rendered label content for the node's row. */
  label: React.ReactNode;
  /** Nested child nodes. A non-empty array renders a toggle and a nested group. */
  children?: TreeNode[];
}

/** @public */
export interface TreeListProps extends Omit<React.HTMLAttributes<HTMLUListElement>, 'onSelect'> {
  /** Root-level nodes to render. */
  items: TreeNode[];
  /** Node ids expanded on mount. */
  defaultExpandedIds?: string[];
  /** Called with a node's id when its label row is clicked. */
  onSelect?: (id: string) => void;
}

interface TreeItemProps {
  node: TreeNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect?: (id: string) => void;
}

// ── Internal ───────────────────────────────────────────────────────────────────

/** @internal — recursive row + group renderer, not part of the public API. */
function TreeItem({ node, expandedIds, onToggle, onSelect }: TreeItemProps) {
  const hasChildren = !!node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <li role="treeitem" aria-selected={false} aria-expanded={hasChildren ? isExpanded : undefined}>
      <div className="flex items-center gap-2">
        {hasChildren ? (
          <button
            type="button"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            data-state={isExpanded ? 'open' : 'closed'}
            onClick={() => onToggle(node.id)}
            className={cn(
              'hds-focus shrink-0 rounded-sm p-1 text-muted-foreground transition-transform hover:bg-accent',
              'data-[state=open]:rotate-90',
            )}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        ) : (
          <span aria-hidden="true" className="size-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect?.(node.id)}
          className="hds-focus flex-1 rounded-sm px-2 py-1 text-left text-foreground hover:bg-accent"
        >
          {node.label}
        </button>
      </div>
      {hasChildren && isExpanded && (
        <ul role="group" className="pl-4">
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Renders a hierarchical `role="tree"` list; nodes with children get an expand/collapse toggle. */
export const TreeList = React.forwardRef<HTMLUListElement, TreeListProps>(function TreeList(
  { items, defaultExpandedIds, onSelect, className, ...props },
  ref,
) {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => new Set(defaultExpandedIds ?? []),
  );

  const toggle = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <ul ref={ref} role="tree" className={cn('flex flex-col gap-1', className)} {...props}>
      {items.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          expandedIds={expandedIds}
          onToggle={toggle}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
});
