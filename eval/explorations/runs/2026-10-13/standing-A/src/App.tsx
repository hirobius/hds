import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Disclosure,
  InlineLink,
  Skeleton,
  Stack,
  StatusListItem,
  Text,
} from '@hirobius/design-system';
import { Page, PageHeader } from '@hirobius/design-system/patterns';
import fixture from './fixture.json';

type Row = (typeof fixture.bands.fire)[number];
type Bands = typeof fixture.bands;
type SourceError = {
  source: string;
  summary?: string;
  detail?: string;
  variable?: string;
  fix?: string;
};
type Data = { bands: Bands; sourceErrors: SourceError[] };

const BANDS = [
  ['fire', 'On fire'],
  ['waiting', 'Waiting on you'],
  ['running', 'Running now'],
  ['parked', 'Parked'],
  ['backlog', 'Backlog'],
  ['shipped', 'Shipped this week'],
] as const;

function errorLine(e: SourceError): string {
  return e.variable ? `${e.variable}: ${e.fix}` : `${e.summary}. ${e.detail}`;
}

function RowItem({ row, urgent }: { row: Row; urgent: boolean }) {
  return (
    <StatusListItem
      title={row.repo ? `${row.title} (${row.repo})` : row.title}
      notes={[row.why, row.ageLabel]}
      tone={urgent ? 'danger' : 'neutral'}
      trailing={
        row.url ? (
          <InlineLink href={row.url}>{row.ref}</InlineLink>
        ) : (
          <Badge tone="neutral">{row.ref}</Badge>
        )
      }
    />
  );
}

function BandView({ id, label, rows }: { id: string; label: string; rows: Row[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, fixture.showFirst);
  return (
    <Disclosure label={`${label} (${rows.length})`} defaultOpen>
      <Stack direction="column" gap="tight">
        {shown.map((row) => (
          <RowItem key={`${row.ref}-${row.title}`} row={row} urgent={id === 'fire'} />
        ))}
        {rows.length > shown.length ? (
          <Button variant="tertiary" onClick={() => setAll(true)}>
            {`Show all ${rows.length} in ${label}`}
          </Button>
        ) : null}
      </Stack>
    </Disclosure>
  );
}

function Standing({ data }: { data: Data }) {
  const tokenErrors = data.sourceErrors.filter((e) => e.variable);
  const otherErrors = data.sourceErrors.filter((e) => !e.variable);
  const empty = BANDS.every(([key]) => data.bands[key].length === 0);
  return (
    <Stack direction="column" gap="spacious">
      {tokenErrors.map((e) => (
        <Alert key={e.variable} tone="warning" title="A token needs attention">
          {errorLine(e)}
        </Alert>
      ))}
      {otherErrors.map((e) => (
        <Alert key={e.source} tone="info">
          {errorLine(e)}
        </Alert>
      ))}
      {BANDS.map(([key, label]) => {
        const rows = data.bands[key];
        if (rows.length === 0) {
          return key === 'fire' ? null : (
            <Text key={key} variant="body">{`${label}: nothing to show.`}</Text>
          );
        }
        return <BandView key={key} id={key} label={label} rows={rows} />;
      })}
      {empty ? <Text variant="body">All clear.</Text> : null}
    </Stack>
  );
}

function Loading() {
  return (
    <Stack direction="column" gap="spacious">
      {BANDS.filter(([key]) => key !== 'fire').map(([key, label]) => (
        <Stack key={key} direction="column" gap="tight">
          <Text variant="title">{label}</Text>
          <Skeleton height="4rem" />
        </Stack>
      ))}
    </Stack>
  );
}

const STATES = [
  ['empty', 'State: empty'],
  ['loading', 'State: loading'],
  ['error', 'State: error'],
  ['longContent', 'State: long content'],
  ['tokenFailure', 'State: token failure'],
] as const;

export default function App() {
  return (
    <Page>
      <Stack direction="column" gap="spacious">
        <PageHeader
          title="Standing"
          status={<Badge tone="neutral">{fixture.updatedLabel}</Badge>}
        />
        <Standing data={fixture as unknown as Data} />
        <section aria-labelledby="states-h">
          <Stack direction="column" gap="spacious">
            <Text variant="title" as="h2" id="states-h">
              States
            </Text>
            {STATES.map(([key, label]) => (
              <section key={key} aria-label={label}>
                <Stack direction="column" gap="normal">
                  <Text variant="title" as="h3">
                    {label}
                  </Text>
                  {key === 'loading' ? (
                    <Loading />
                  ) : (
                    <Standing data={fixture.states[key] as unknown as Data} />
                  )}
                </Stack>
              </section>
            ))}
          </Stack>
        </section>
      </Stack>
    </Page>
  );
}
