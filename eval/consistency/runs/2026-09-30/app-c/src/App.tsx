import { useRef, useState, type FormEvent } from 'react';
import {
  Alert,
  AlertDialog,
  Breadcrumb,
  Button,
  Grid,
  Stack,
  Stat,
  StatusDot,
  Table,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
  type TableColumn,
  type TableRow,
} from '@hirobius/design-system';
import { Page } from '@hirobius/design-system/patterns';

type Tone = 'neutral' | 'info' | 'warning' | 'inProgress';

type Project = { id: string; name: string; status: string; tone: Tone; due: string };

const INITIAL_PROJECTS: Project[] = [
  { id: 'brand-refresh', name: 'Brand refresh', status: 'In progress', tone: 'inProgress', due: '2026-10-14' },
  { id: 'marketing-site', name: 'Marketing site', status: 'In review', tone: 'info', due: '2026-10-28' },
  { id: 'client-portal', name: 'Client portal', status: 'Planned', tone: 'neutral', due: '2026-11-18' },
  { id: 'annual-report', name: 'Annual report', status: 'In progress', tone: 'inProgress', due: '2026-12-02' },
  { id: 'packaging', name: 'Packaging', status: 'On hold', tone: 'warning', due: '2027-01-20' },
];

const COLUMNS: TableColumn[] = [
  { key: 'project', label: 'Project' },
  { key: 'status', label: 'Status' },
  { key: 'due', label: 'Due' },
  { key: 'actions', label: 'Actions', align: 'right' },
];

export default function App() {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [pending, setPending] = useState<Project | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const requestArchive = (project: Project, trigger: HTMLElement) => {
    opener.current = trigger;
    setPending(project);
  };

  const confirmArchive = () => {
    if (pending) setProjects((rows) => rows.filter((row) => row.id !== pending.id));
    setPending(null);
  };

  const restoreFocus = (event: Event) => {
    event.preventDefault();
    const trigger = opener.current;
    const target =
      trigger && trigger.isConnected
        ? trigger
        : panel.current?.querySelector<HTMLElement>('button');
    target?.focus();
  };

  const saveNote = (event: FormEvent) => {
    event.preventDefault();
    setNote('');
    setSaved(true);
  };

  const rows: TableRow[] = projects.map((project) => ({
    key: project.id,
    cells: [
      { slot: 'label', content: project.name },
      {
        slot: 'custom',
        content: (
          <Stack direction="row" gap="tight" align="center">
            <StatusDot tone={project.tone} />
            <Text variant="ui" as="span">
              {project.status}
            </Text>
          </Stack>
        ),
      },
      { slot: 'value', content: project.due },
      {
        slot: 'action',
        align: 'right',
        content: (
          <Stack direction="row" gap="tight" align="center" justify="end">
            <Button variant="tertiary" size="sm" aria-label={`View ${project.name}`}>
              View
            </Button>
            <Button
              variant="secondary"
              size="sm"
              aria-label={`Archive ${project.name}`}
              onClick={(event) => requestArchive(project, event.currentTarget)}
            >
              Archive
            </Button>
          </Stack>
        ),
      },
    ],
  }));

  return (
    <Page>
      <Stack direction="column" gap="spacious">
        <Breadcrumb
          items={[{ label: 'Clients', href: '#clients' }, { label: 'Northwind Studio' }]}
        />

        <Stack direction="row" gap="normal" align="center" wrap="wrap">
          <Text variant="heading1" as="h1">
            Northwind Studio
          </Text>
          <Stack direction="row" gap="tight" align="center">
            <StatusDot tone="success" />
            <Text variant="ui" as="span">
              Active
            </Text>
          </Stack>
        </Stack>

        <Grid layout="auto-fit" gap="normal">
          <Stat label="Open projects" value="5" />
          <Stat label="Outstanding invoices" value="2" />
          <Stat label="Lifetime value" value="$48,200" />
        </Grid>

        <Tabs defaultValue="projects">
          <TabsList aria-label="Client sections">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="projects">
            <div ref={panel}>
              <Table caption="Projects" columns={COLUMNS} rows={rows} />
            </div>
          </TabsContent>
          <TabsContent value="notes" />
          <TabsContent value="activity" />
        </Tabs>

        <form onSubmit={saveNote} aria-label="Add note">
          <Stack direction="column" gap="tight" align="start">
            <Textarea
              label="Notes"
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setSaved(false);
              }}
            />
            <Button type="submit">Save note</Button>
            {saved ? (
              <Alert tone="success">Note saved.</Alert>
            ) : null}
          </Stack>
        </form>
      </Stack>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialog.Content onCloseAutoFocus={restoreFocus}>
          <AlertDialog.Header>
            <AlertDialog.Title>Archive project?</AlertDialog.Title>
            <AlertDialog.Description>
              {pending ? `${pending.name} will be removed from this client's projects.` : ''}
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
