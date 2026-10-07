import { Page, Stack, Badge, TileGrid, EmptyState } from '@hirobius/design-system';

export function Lanes({ lanes }: { lanes: { id: string; tasks: string[] }[] }) {
  if (lanes.length === 0) return <EmptyState title="No lanes" />;
  return (
    <Page>
      <Stack>
        {lanes.map((lane) => (
          <TileGrid key={lane.id} minTileWidth="280px">
            {lane.tasks.map((task) => (
              <Badge key={task}>{task}</Badge>
            ))}
          </TileGrid>
        ))}
        <TileGrid minTileWidth="220px">
          <Badge>Systems</Badge>
        </TileGrid>
      </Stack>
    </Page>
  );
}
