'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Card,
  Grid,
  Pagination,
  Progress,
  SegmentedControl,
  Stack,
  Table,
  Text,
  type TableSortDirection,
} from '@hirobius/design-system';

const METRICS = [
  { label: 'Open leads', value: '14', change: '+3 this week', tone: 'success' as const },
  {
    label: 'Billed this month',
    value: '£18,400',
    change: '+12% vs last month',
    tone: 'success' as const,
  },
  { label: 'Overdue invoices', value: '2', change: '£3,150 outstanding', tone: 'warning' as const },
  { label: 'Hours logged', value: '126', change: '-8% vs last month', tone: 'neutral' as const },
];

const WEEKS = [
  { week: 'Week 41', hours: 34 },
  { week: 'Week 42', hours: 28 },
  { week: 'Week 43', hours: 38 },
  { week: 'Week 44', hours: 26 },
];

type Status = 'active' | 'review' | 'paused';
const STATUS: Record<Status, { label: string; tone: 'success' | 'info' | 'neutral' }> = {
  active: { label: 'Active', tone: 'success' },
  review: { label: 'In review', tone: 'info' },
  paused: { label: 'Paused', tone: 'neutral' },
};
const PROJECTS: { name: string; client: string; status: Status; budget: number }[] = [
  { name: 'Meridian House', client: 'Arlo Partners', status: 'active', budget: 42000 },
  { name: 'Materials library', client: 'In house', status: 'review', budget: 9000 },
  { name: 'Studio landing', client: 'In house', status: 'active', budget: 6500 },
  { name: 'Harbour retrofit', client: 'Kestrel Homes', status: 'paused', budget: 28000 },
  { name: 'Canal pavilion', client: 'City of Leeds', status: 'review', budget: 61000 },
  { name: 'Orchard terrace', client: 'Fenwick & Co', status: 'active', budget: 17500 },
  { name: 'Wharf offices', client: 'Northbank', status: 'active', budget: 33000 },
];
const PAGE_SIZE = 5;
const money = (n: number) => `£${n.toLocaleString('en-GB')}`;

/** Studio dashboard: four metrics, weekly hours, and a sortable, filterable project table. */
export function StressDashboard() {
  const [filter, setFilter] = useState('all');
  const [dir, setDir] = useState<TableSortDirection>('descending');
  const [page, setPage] = useState(1);
  const rows = useMemo(() => {
    const list = PROJECTS.filter((p) => filter === 'all' || p.status === filter);
    return list.sort((a, b) => (dir === 'ascending' ? a.budget - b.budget : b.budget - a.budget));
  }, [filter, dir]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);

  return (
    <Stack gap="spacious">
      {/* GAP:metric-tile: every metric component is deprecated, so each tile is a Card. */}
      {/* GAP:grid-mobile-columns: columns={4} stays 4-up at 390px, so auto-fit instead. */}
      <Grid layout="auto-fit" minItemWidth="12rem" gap="normal">
        {METRICS.map((m) => (
          <Card key={m.label} padding="item">
            <Stack gap="tight">
              <Text variant="caption" tone="secondary">
                {m.label}
              </Text>
              <Text variant="title" as="p">
                {m.value}
              </Text>
              {/* GAP:metric-delta: the change is a Badge with the words written out. */}
              <Badge tone={m.tone}>{m.change}</Badge>
            </Stack>
          </Card>
        ))}
      </Grid>
      <Card padding="item">
        <Stack gap="normal">
          <Text variant="title" as="h2">
            Hours by week
          </Text>
          {/* GAP:chart: no chart primitive; Progress bars stand in. */}
          {WEEKS.map((w) => (
            <Progress key={w.week} label={`${w.week}: ${w.hours} hours`} value={w.hours} max={40} />
          ))}
        </Stack>
      </Card>
      <Stack gap="normal">
        <SegmentedControl
          label="Status"
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'review', label: 'In review' },
            { value: 'paused', label: 'Paused' },
          ]}
        />
        <Table
          caption="Projects"
          description={`${rows.length} projects`}
          emphasizeFirstColumn
          columns={[
            { key: 'name', label: 'Project' },
            { key: 'client', label: 'Client' },
            { key: 'status', label: 'Status', width: 'max-content' },
            {
              key: 'budget',
              label: 'Budget',
              align: 'right',
              sortable: true,
              sortDirection: dir,
              onSort: () => setDir((d) => (d === 'ascending' ? 'descending' : 'ascending')),
            },
          ]}
          rows={rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((p) => ({
            key: p.name,
            cells: [
              { slot: 'label', content: p.name },
              { slot: 'description', content: p.client },
              {
                slot: 'badge',
                content: <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>,
              },
              { slot: 'value', content: money(p.budget), align: 'right' },
            ],
          }))}
        />
        <Pagination count={pages} page={current} onPageChange={setPage} />
      </Stack>
    </Stack>
  );
}
