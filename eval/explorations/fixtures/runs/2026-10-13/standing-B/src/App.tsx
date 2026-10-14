import { Badge, Card, InlineLink, Stack, StatusListItem } from '@hirobius/design-system';
import { Page, PageHeader } from '@hirobius/design-system/patterns';
import fixture from './fixture.json';

const BANDS = [
  ['fire', 'On fire'],
  ['waiting', 'Waiting on you'],
  ['running', 'Running now'],
  ['parked', 'Parked'],
  ['backlog', 'Backlog'],
  ['shipped', 'Shipped this week'],
] as const;

export default function App() {
  return (
    <Page>
      <Stack direction="column" gap="spacious">
        <PageHeader title="Standing" status={<Badge tone="info">{fixture.updatedLabel}</Badge>} />
        {BANDS.filter(([key]) => fixture.bands[key].length > 0).map(([key, label]) => (
          <Card key={key} variant={key === 'waiting' ? 'accent' : 'default'}>
            <Card.Header>
              <Card.Title>{`${label} (${fixture.bands[key].length})`}</Card.Title>
            </Card.Header>
            <Card.Body>
              <Stack direction="column" gap="tight">
                {fixture.bands[key].map((row) => (
                  <StatusListItem
                    key={row.ref}
                    title={row.title}
                    notes={[row.why, row.ageLabel]}
                    trailing={<InlineLink href={row.url}>{row.ref}</InlineLink>}
                  />
                ))}
              </Stack>
            </Card.Body>
          </Card>
        ))}
      </Stack>
    </Page>
  );
}
