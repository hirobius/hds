import React from 'react';
import { Page, Stack, Badge, Callout, TileGrid, EmptyState } from '@hirobius/design-system';
import { StatusTile, type StatusTileTone } from '@hirobius/design-system';
import hds from '@hirobius/design-system/tokens';

const TONE: Record<string, StatusTileTone> = { done: 'success', blocked: 'danger' };
const LANE_GAP = hds.space.px12;

export function Goals({ goals }: { goals: { id: string; goal: string; status: string }[] }) {
  if (goals.length === 0) return <EmptyState title="No goals yet" />;
  return (
    <Page>
      <Stack>
        <Callout>Goals, {LANE_GAP} apart</Callout>
        <TileGrid minTileWidth="260px">
          {goals.map((g) => (
            <StatusTile
              key={g.id}
              tone={TONE[g.status] ?? 'neutral'}
              title={g.goal}
              trailing={<Badge>{g.status}</Badge>}
            />
          ))}
        </TileGrid>
      </Stack>
    </Page>
  );
}

export const Count = () => React.createElement('span', null, 'n');
