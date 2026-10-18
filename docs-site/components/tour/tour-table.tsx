'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Combobox,
  EmptyState,
  Input,
  Pagination,
  SegmentedControl,
  Skeleton,
  Spinner,
  Stack,
  Table,
  Tag,
  Button,
  type TableSortDirection,
} from '@hirobius/design-system';
import { DataTableSection } from '@hirobius/design-system/patterns';
import { Search } from '@hirobius/design-system/icons';
import type { TourComponent, TourData } from '../../lib/tour-data';

const PAGE_SIZE = 6;
type SortKey = 'name' | 'category' | 'props';

/** Filter, sort and page the registry; Skeleton and Spinner show the loading state, EmptyState the no-result one. */
export function TourTable({ data }: { data: TourData }) {
  const [tier, setTier] = useState('all');
  const [category, setCategory] = useState<string>('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; direction: TableSortDirection }>({
    key: 'name',
    direction: 'ascending',
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const categories = useMemo(
    () => [...new Set(data.components.map((c) => c.category))].sort(),
    [data.components],
  );
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data.components.filter(
      (c) =>
        (tier === 'all' || c.tier === tier) &&
        (!category || c.category === category) &&
        (!q || c.name.toLowerCase().includes(q)),
    );
    const dir = sort.direction === 'descending' ? -1 : 1;
    return [...list].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return (
        (typeof av === 'number' ? av - (bv as number) : String(av).localeCompare(String(bv))) * dir
      );
    });
  }, [data.components, tier, category, query, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const refresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 600);
  };
  const reset = () => {
    setTier('all');
    setCategory('');
    setQuery('');
    setPage(1);
  };
  const header = (key: SortKey, label: string, align?: 'right') => ({
    key,
    label,
    align,
    sortable: true,
    sortDirection: sort.key === key ? sort.direction : ('none' as TableSortDirection),
    onSort: () => {
      setSort((s) => ({
        key,
        direction: s.key === key && s.direction === 'ascending' ? 'descending' : 'ascending',
      }));
      setPage(1);
    },
  });
  const tierOptions = [
    { value: 'all', label: 'All' },
    ...[...new Set(data.components.map((c) => c.tier))].sort().map((t) => ({ value: t, label: t })),
  ];

  return (
    <Stack gap="normal">
      <Stack direction="row" gap="normal" wrap="wrap" align="end">
        <Input
          label="Search components"
          placeholder="Button, Table…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          leadingVisual={<Search size={16} aria-hidden="true" />}
        />
        <SegmentedControl
          label="Tier"
          value={tier}
          onChange={(v) => {
            setTier(v);
            setPage(1);
          }}
          options={tierOptions}
        />
        <Combobox
          aria-label="Category"
          options={categories.map((c) => ({ value: c, label: c }))}
          value={category || null}
          onChange={(v) => {
            setCategory(v as string);
            setPage(1);
          }}
          placeholder="Any category"
        />
        <Button variant="secondary" onClick={refresh}>
          Refresh
        </Button>
      </Stack>
      <Stack direction="row" gap="tight" wrap="wrap">
        {category && (
          <Tag active onClick={() => setCategory('')}>
            {category}
          </Tag>
        )}
        {tier !== 'all' && (
          <Tag active onClick={() => setTier('all')}>
            {tier}
          </Tag>
        )}
      </Stack>
      {loading ? (
        <Stack gap="tight" role="status" aria-label="Loading components">
          <Spinner label="Loading components" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="rectangular" height={96} />
        </Stack>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No components match"
          description="Clear the filters to see the whole registry."
          action={
            <Button variant="secondary" onClick={reset}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <Table
            caption="Components"
            description={`${rows.length} of ${data.components.length} shown`}
            emphasizeFirstColumn
            columns={[
              header('name', 'Component'),
              header('category', 'Category'),
              { key: 'tier', label: 'Tier', width: 'max-content' },
              header('props', 'Props', 'right'),
            ]}
            rows={visible.map((c: TourComponent) => ({
              key: c.name,
              cells: [
                { slot: 'label', content: c.name },
                { slot: 'description', content: c.category },
                {
                  slot: 'badge',
                  content: <Badge tone={c.tier === 'pattern' ? 'info' : 'neutral'}>{c.tier}</Badge>,
                },
                { slot: 'value', content: String(c.props), align: 'right' },
              ],
            }))}
          />
          <Pagination count={pages} page={current} onPageChange={setPage} />
        </>
      )}
      <DataTableSection
        title="Newest releases"
        level={3}
        columns={[
          { key: 'v', label: 'Version' },
          { key: 'n', label: 'Changes', align: 'right' },
        ]}
        rows={data.releases.map((r) => ({
          key: r.version,
          cells: [r.version, String(r.changes.length)],
        }))}
      />
    </Stack>
  );
}
