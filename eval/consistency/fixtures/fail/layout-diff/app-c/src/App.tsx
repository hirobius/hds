import { Button, Card, Table } from '@hirobius/design-system';

const rows = Array.from({ length: 24 }, (_, i) => ({
  key: `row-${i}`,
  cells: [{ slot: 'label' as const, content: `Project ${i + 1}` }],
}));

export function App() {
  return (
    <Card>
      <Table columns={[{ key: 'name', label: 'Name' }]} rows={rows} />
      {rows.map((row) => (
        <Button key={row.key}>Save</Button>
      ))}
    </Card>
  );
}
