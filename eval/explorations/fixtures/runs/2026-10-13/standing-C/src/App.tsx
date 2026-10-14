import { Badge, InlineLink, Stack, StatusListItem, Text } from '@hirobius/design-system';
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

// A fade from the page surface into the card surface behind each band heading: built from tokens,
// but DESIGN.md has no gradients, so it is a bend (listed in bend-log.json).
const FADE =
  'linear-gradient(var(--semantic-color-surface-page), var(--semantic-color-surface-card))';

export default function App() {
  return (
    <Page>
      <Stack direction="column" gap="spacious">
        <PageHeader
          title="Standing"
          status={<Badge tone="neutral">{fixture.updatedLabel}</Badge>}
        />
        {BANDS.filter(([key]) => fixture.bands[key].length > 0).map(([key, label]) => (
          <section key={key} aria-label={label}>
            <div style={{ background: FADE }}>
              <Text variant="title" style={{ color: '#7c3aed' }}>
                {`${label} (${fixture.bands[key].length})`}
              </Text>
            </div>
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
          </section>
        ))}
      </Stack>
    </Page>
  );
}
