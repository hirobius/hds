'use client';

import { useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  List,
  MetadataList,
  Sidebar,
  Stack,
  Surface,
  Text,
  Timestamp,
  useToast,
} from '@hirobius/design-system';
import { Mail } from '@hirobius/design-system/icons';

const DROPS = [
  {
    id: 'd1',
    from: 'Priya Shah',
    subject: 'Site photos from Meridian House',
    preview: 'Twelve shots of the east elevation after the scaffold came down.',
    project: 'Meridian House',
    received: '2026-11-04T09:12:00Z',
    status: { value: 'new', label: 'New' },
  },
  {
    id: 'd2',
    from: 'Tom Okafor',
    subject: 'Revised fee proposal',
    preview: 'Updated stage 4 fees with the structural engineer quote attached.',
    project: 'Canal pavilion',
    received: '2026-11-03T16:40:00Z',
    status: { value: 'filed', label: 'Filed' },
  },
  {
    id: 'd3',
    from: 'Lena Fischer',
    subject: 'Sample boards: oak and terrazzo',
    preview: 'Three finishes for the reception desk. Courier arrives Thursday.',
    project: 'Materials library',
    received: '2026-11-02T11:05:00Z',
    status: { value: 'filed', label: 'Filed' },
  },
];

/** Drops inbox: a list of incoming files and messages, and the open one in a detail pane. */
export function StressInbox() {
  const { toast } = useToast();
  const [openId, setOpenId] = useState(DROPS[0].id);
  const open = DROPS.find((d) => d.id === openId) ?? DROPS[0];

  return (
    // GAP:split-view: Sidebar stacks list over detail on phones, with no back action.
    <Sidebar sideWidth="22rem" gap="spacious">
      <List defaultStatus="filed">
        <List.Group title="Drops" count={DROPS.length}>
          {DROPS.map((d) => (
            // GAP:list-selected: the open row is not marked selected.
            <List.Item
              key={d.id}
              title={d.subject}
              description={d.from}
              meta={d.project}
              status={d.status}
              leading={<List.Tile icon={Mail} />}
              trailing="chevron"
              onSelect={() => setOpenId(d.id)}
            />
          ))}
        </List.Group>
      </List>
      <Surface padding="component">
        <Stack gap="normal">
          <Stack direction="row" gap="tight" align="center">
            <Avatar
              alt={open.from}
              initials={open.from
                .split(' ')
                .map((w) => w[0])
                .join('')}
            />
            <Stack gap="hairline">
              <Text variant="ui">{open.from}</Text>
              <Text variant="caption" tone="secondary">
                <Timestamp date={open.received} format="date" suppressHydrationWarning />
              </Text>
            </Stack>
            <Badge tone={open.status.value === 'new' ? 'info' : 'neutral'}>
              {open.status.label}
            </Badge>
          </Stack>
          <Text variant="title" as="h2">
            {open.subject}
          </Text>
          <Text variant="body">{open.preview}</Text>
          <MetadataList
            variant="divided"
            items={[
              { term: 'Project', description: open.project },
              { term: 'From', description: open.from },
            ]}
          />
          <Stack direction="row" gap="tight" wrap="wrap">
            <Button
              variant="primary"
              onClick={() => toast({ title: `Filed to ${open.project}`, tone: 'success' })}
            >
              File to project
            </Button>
            <Button variant="secondary" onClick={() => toast({ title: 'Reply drafted' })}>
              Reply
            </Button>
          </Stack>
        </Stack>
      </Surface>
    </Sidebar>
  );
}
