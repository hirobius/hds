import { Button, Card, Table } from '@hirobius/design-system';

export function App() {
  return (
    <Card>
      <Table
        columns={[{ key: 'name', label: 'Name' }]}
        rows={[{ cells: [{ slot: 'label', content: 'Alpha' }] }]}
      />
      <button type="button">Save</button>
    </Card>
  );
}
