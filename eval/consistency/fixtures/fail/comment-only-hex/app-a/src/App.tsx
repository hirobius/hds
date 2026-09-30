// Previously #ff0000, 12px and <button>; now token-driven.
/* rgb(0, 0, 0) */
import { Button, Card, Table } from '@hirobius/design-system';

export function App() {
  return (
    <Card>
      <Table
        columns={[{ key: 'name', label: 'Name' }]}
        rows={[{ cells: [{ slot: 'label', content: 'Alpha' }] }]}
      />
      <Button>Save</Button>
    </Card>
  );
}
