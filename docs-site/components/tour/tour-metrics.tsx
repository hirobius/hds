'use client';

import {
  Card,
  Field,
  Progress,
  Stack,
  Stat,
  StatusListItem,
  Timestamp,
  Badge,
  Button,
  Grid,
  MetaLine,
} from '@hirobius/design-system';
import { MetricTile, MetricTiles, StatusTile } from '@hirobius/design-system/patterns';
import type { TourData } from '../../lib/tour-data';

/** Counts come from the registry, the token file and the changelog, never typed in. */
export function TourMetrics({ data }: { data: TourData }) {
  const tokens = data.tokenGroups.reduce((n, g) => n + g.count, 0);
  const documented = data.components.filter((c) => c.href !== '/docs/components').length;
  const share = Math.round((documented / data.components.length) * 100);
  const latest = data.releases[0];
  return (
    <Stack gap="normal">
      <MetricTiles>
        <MetricTile
          label="Components"
          value={String(data.components.length)}
          sub="In the registry"
        />
        <MetricTile label="Tokens" value={String(tokens)} sub="Across four tiers" tone="info" />
        <MetricTile
          label="Latest release"
          value={data.version}
          sub={`${latest?.asks.length ?? 0} upgrade asks`}
          tone={latest?.asks.length ? 'warning' : 'success'}
        />
      </MetricTiles>
      <MetaLine items={[`v${data.version}`, `${data.components.length} components`]} />
      <Grid columns={2} gap="normal">
        <StatusTile
          title="Docs coverage"
          notes={[`${documented} of ${data.components.length} have their own page`]}
          trailing={<Badge tone={share === 100 ? 'success' : 'warning'}>{share}%</Badge>}
        />
        <StatusListItem
          title="State file"
          notes={[
            <>
              Updated <Timestamp date={data.updated} format="date" suppressHydrationWarning />
            </>,
          ]}
          tone="success"
        />
      </Grid>
      <Grid columns={2} gap="normal">
        <Card padding="none">
          <Card.Header>
            <Card.Title>Token tiers</Card.Title>
            <Card.Description>Leaf tokens in hirobius.tokens.json.</Card.Description>
          </Card.Header>
          <Card.Body>
            <Stack gap="tight">
              {data.tokenGroups.map((g) => (
                <Field key={g.group} label={g.group} value={String(g.count)} mono />
              ))}
            </Stack>
          </Card.Body>
          <Card.Footer>
            <Button variant="secondary" size="sm">
              Browse tokens
            </Button>
          </Card.Footer>
        </Card>
        <Card padding="none">
          <Card.Header>
            <Card.Title>Health</Card.Title>
            <Card.Description>Derived from the same data as the tiles.</Card.Description>
          </Card.Header>
          <Card.Body>
            <Stack gap="normal">
              <Card.Metric label="Pages per component" value={`${share}%`} sub="Own docs page" />
              <Card.Progress label="Documented" value={documented} max={data.components.length} />
              <Stat label="Public components" value={String(data.components.length)} />
              <Progress
                label="Release notes parsed"
                value={Math.min(100, data.releases.length * 25)}
              />
              <Card.Row trailing={<Badge tone="info">{data.version}</Badge>}>
                <Card.RowTitle>Current version</Card.RowTitle>
                <Card.RowNote>From package.json</Card.RowNote>
              </Card.Row>
            </Stack>
          </Card.Body>
        </Card>
      </Grid>
    </Stack>
  );
}
