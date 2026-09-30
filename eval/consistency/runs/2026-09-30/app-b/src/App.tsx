import { useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Dialog,
  Form,
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
import { CLIENT, PROJECTS, STATS, type Project } from './data';

export default function App() {
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [pending, setPending] = useState<Project | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const archived = useRef(false);
  const titleRef = useRef<HTMLElement>(null);

  const confirmArchive = () => {
    if (!pending) return;
    archived.current = true;
    setProjects((rows) => rows.filter((row) => row.id !== pending.id));
    setPending(null);
  };

  const saveNote = (event: React.FormEvent) => {
    event.preventDefault();
    if (!note.trim()) return;
    setNote('');
    setSaved(true);
  };

  const rows = projects.map((project) => ({
    key: project.id,
    cells: [
      { slot: 'label' as const, content: project.name },
      { slot: 'value' as const, content: project.status },
      { slot: 'value' as const, content: project.due },
      {
        slot: 'action' as const,
        align: 'right' as const,
        content: (
          <Stack direction="row" gap="tight" justify="end">
            <Button variant="tertiary" size="sm" aria-label={`View ${project.name}`}>
              View
            </Button>
            <Button
              variant="secondary"
              size="sm"
              aria-label={`Archive ${project.name}`}
              onClick={() => setPending(project)}
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
          items={[{ label: 'Clients', href: '#clients' }, { label: CLIENT }]}
        />

        <Stack direction="row" gap="normal" align="center" wrap="wrap">
          <Text variant="heading1" as="h1" ref={titleRef} tabIndex={-1}>
            {CLIENT}
          </Text>
          <Badge tone="success">Active</Badge>
        </Stack>

        <Grid gap="normal">
          {STATS.map((stat) => (
            <Grid.Item key={stat.label} colSpan={4}>
              <Stat label={stat.label} value={stat.value} />
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
            <Table
              caption="Projects"
              columns={[
                { key: 'project', label: 'Project' },
                { key: 'status', label: 'Status' },
                { key: 'due', label: 'Due' },
                { key: 'actions', label: 'Actions', align: 'right' },
              ]}
              rows={rows}
            />
          </TabsContent>
          <TabsContent value="notes" />
          <TabsContent value="activity" />
        </Tabs>

        <Form onSubmit={saveNote} aria-label="Add note">
          <Stack direction="column" gap="tight" align="start">
            <Textarea
              label="Notes"
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setSaved(false);
              }}
              rows={4}
            />
            <Button type="submit" variant="primary">
              Save note
            </Button>
            <div role="status" aria-live="polite">
              {saved ? <Alert tone="success">Note saved.</Alert> : null}
            </div>
          </Stack>
        </Form>
      </Stack>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            // The archived row no longer exists, so send focus to the page title
            // instead of dropping it on <body>. Cancel keeps the default: focus
            // returns to the row's Archive button.
            if (archived.current) {
              archived.current = false;
              event.preventDefault();
              titleRef.current?.focus();
            }
          }}
        >
          <Dialog.Header>
            <Dialog.Title>Archive project?</Dialog.Title>
            <Dialog.Description>
              {pending ? `${pending.name} will be removed from Northwind Studio's projects.` : ''}
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button variant="primary" tone="danger" onClick={confirmArchive}>
              Archive
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </Page>
  );
}
