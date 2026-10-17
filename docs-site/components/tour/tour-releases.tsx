'use client';

import {
  Blockquote,
  Board,
  BoardColumn,
  Callout,
  Card,
  Disclosure,
  InlineCode,
  MetadataList,
  Stack,
  StatusListItem,
  Text,
  Timeline,
  TimelineItem,
} from '@hirobius/design-system';
import { AssetImg, CodeBlock, Reveal } from '@hirobius/design-system/patterns';
import { CircleCheck } from '@hirobius/design-system/icons';
import type { TourData } from '../../lib/tour-data';

const FIGMA_NOTE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240"><rect width="640" height="240" fill="#808080" fill-opacity="0.16"/><rect x="24" y="24" width="160" height="192" fill="#808080" fill-opacity="0.32"/><rect x="208" y="24" width="408" height="88" fill="#808080" fill-opacity="0.32"/></svg>',
  );

/** The latest releases from CHANGELOG.md; each upgrade ask is a StatusListItem, each release a Timeline entry. */
export function TourReleases({ data }: { data: TourData }) {
  const [latest, ...older] = data.releases;
  const asks = data.releases.flatMap((r) => r.asks.map((ask) => ({ version: r.version, ask })));
  return (
    <Stack gap="normal">
      <Timeline aria-label="Releases">
        {data.releases.map((r, i) => (
          <TimelineItem
            key={r.version}
            date={r.date || '2026-01-01T12:00:00Z'}
            title={`Version ${r.version}`}
            tone={r.asks.length ? 'info' : 'success'}
            icon={i === 0 ? CircleCheck : undefined}
            defaultOpen={i === 0}
          >
            {r.changes[0] ?? r.asks[0] ?? 'No notes.'}
          </TimelineItem>
        ))}
      </Timeline>
      {latest && (
        <MetadataList
          variant="divided"
          items={[
            { term: 'Version', description: <InlineCode>{latest.version}</InlineCode> },
            { term: 'Bump', description: latest.bump || 'unknown' },
            { term: 'Upgrade asks', description: String(latest.asks.length) },
          ]}
        />
      )}
      {latest?.changes[0] && (
        <Blockquote attribution={`CHANGELOG ${latest.version}`}>{latest.changes[0]}</Blockquote>
      )}
      <Callout tone="info">
        Run <InlineCode copyable>npx @hirobius/design-system@latest upgrade</InlineCode> to apply
        the steps below.
      </Callout>
      <Stack gap="tight">
        {asks.length === 0 ? (
          <StatusListItem
            title="Nothing asked of you"
            notes={['The last four releases are all clear.']}
            tone="success"
          />
        ) : (
          asks
            .slice(0, 4)
            .map(({ version, ask }) => (
              <StatusListItem
                key={`${version}-${ask}`}
                title={ask}
                notes={[`Release ${version}`]}
                tone="warning"
              />
            ))
        )}
      </Stack>
      <Disclosure label="Older releases">
        <Stack gap="tight">
          {older.map((r) => (
            <Text key={r.version} variant="ui">
              {r.version}: {r.changes.length} changes
            </Text>
          ))}
        </Stack>
      </Disclosure>
      <CodeBlock
        filename="package.json"
        language="json"
        code={`{\n  "dependencies": {\n    "@hirobius/design-system": "^${data.version}"\n  }\n}`}
      />
      <Board aria-label="Upgrade steps by release">
        {data.releases.slice(0, 3).map((r) => (
          <BoardColumn key={r.version} title={r.version} count={r.changes.length}>
            {r.changes.slice(0, 2).map((c) => (
              <Card key={c} padding="item" className="border-0">
                <Card.Row>
                  <Card.RowTitle>{c.length > 60 ? `${c.slice(0, 57)}…` : c}</Card.RowTitle>
                  <Card.RowNote>{r.bump}</Card.RowNote>
                </Card.Row>
              </Card>
            ))}
          </BoardColumn>
        ))}
      </Board>
      <Reveal animation="fade-up">
        <AssetImg
          src={FIGMA_NOTE}
          alt="Layout of the console, as a wireframe"
          naturalWidth={640}
          naturalHeight={240}
        />
      </Reveal>
    </Stack>
  );
}
