import { useRef, useState } from 'react';
import {
  Alert,
  AlertDialog,
  Badge,
  Breadcrumb,
  Button,
  Cluster,
  Grid,
  Page,
  Stack,
  Stat,
  Table,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from '@hirobius/design-system';
import type { TableColumn, TableRow } from '@hirobius/design-system';
import { CLIENT, PROJECTS, STATS, type Project } from './data';

const COLUMNS: TableColumn[] = [
  { key: 'project', label: 'Project' },
  { key: 'status', label: 'Status' },
  { key: 'due', label: 'Due' },
  { key: 'actions', label: 'Actions', align: 'right' },
];

export default function App() {
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [pending, setPending] = useState<Project | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);

  const rows: TableRow[] = projects.map((p) => ({
    key: p.id,
    cells: [
      { slot: 'label', content: p.name },
      { slot: 'value', content: p.status },
      { slot: 'value', content: p.due },
      {
        slot: 'action',
        content: (
          <Cluster gap="tight" justify="end">
            <Button variant="tertiary" size="sm" aria-label={`View ${p.name}`}>
              View
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              aria-label={`Archive ${p.name}`}
              onClick={(e) => {
                returnFocus.current = e.currentTarget;
                setPending(p);
              }}
            >
              Archive
            </Button>
          </Cluster>
        ),
      },
    ],
  }));

  const saveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setNote('');
    setSaved(true);
  };

  const confirmArchive = () => {
    if (pending) setProjects((list) => list.filter((p) => p.id !== pending.id));
    setPending(null);
  };

  return (
    <Page>
      <Stack direction="column" gap="spacious">
        <Breadcrumb
          items={[{ label: 'Clients', href: '#clients' }, { label: CLIENT.name }]}
        />

        <Cluster gap="tight" align="center">
          <Text variant="heading1" as="h1">
            {CLIENT.name}
          </Text>
          <Badge tone="success">{CLIENT.status}</Badge>
        </Cluster>

        <Grid columns={12} gap="tight">
          {STATS.map((s) => (
            <Grid.Item key={s.label} colSpan={4}>
              <Stat label={s.label} value={s.value} />
            </Grid.Item>
          ))}
        </Grid>

        <Tabs defaultValue="projects">
          <TabsList aria-label="Client sections">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="projects">
            <Table columns={COLUMNS} rows={rows} caption="Projects" />
          </TabsContent>
          <TabsContent value="notes" />
          <TabsContent value="activity" />
        </Tabs>

        <form onSubmit={saveNote}>
          <Stack direction="column" gap="tight" align="start">
            <Textarea
              label="Notes"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setSaved(false);
              }}
            />
            <Button type="submit" variant="primary">
              Save note
            </Button>
            {saved && <Alert tone="success">Note saved.</Alert>}
          </Stack>
        </form>
      </Stack>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialog.Content
          onCloseAutoFocus={(e) => {
            const el = returnFocus.current;
            if (el && el.isConnected) {
              e.preventDefault();
              el.focus();
            }
          }}
        >
          <AlertDialog.Header>
            <AlertDialog.Title>Archive project?</AlertDialog.Title>
            <AlertDialog.Description>
              {pending ? `${pending.name} will be removed from this client's project list.` : ''}
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button tone="danger" onClick={confirmArchive}>
                Archive
              </Button>
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </Page>
  );
}
