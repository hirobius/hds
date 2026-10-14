import { Badge, Disclosure, Stack, StatusListItem } from '@hirobius/design-system';
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
        <PageHeader
          title="Standing"
          status={<Badge tone="neutral">{fixture.updatedLabel}</Badge>}
        />
        {BANDS.filter(([key]) => fixture.bands[key].length > 0).map(([key, label]) => (
          <Disclosure key={key} label={`${label} (${fixture.bands[key].length})`} defaultOpen>
            <Stack direction="column" gap="tight">
              {fixture.bands[key].map((row) => (
                <StatusListItem
                  key={row.ref}
                  title={row.title}
                  notes={[row.why, row.ageLabel]}
                  tone={key === 'fire' ? 'danger' : 'neutral'}
                  trailing={<Badge tone="neutral">{row.ref}</Badge>}
                />
              ))}
            </Stack>
          </Disclosure>
        ))}
      </Stack>
    </Page>
  );
}
