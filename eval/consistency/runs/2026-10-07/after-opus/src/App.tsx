import { useState, type FormEvent } from 'react';
import {
  AlertDialog,
  Badge,
  Breadcrumb,
  Button,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ToastProvider,
  useToast,
  type BadgeProps,
} from '@hirobius/design-system';
import {
  DataTableSection,
  Form,
  FormActions,
  MetricTile,
  MetricTiles,
  Page,
  PageHeader,
} from '@hirobius/design-system/patterns';

type ProjectStatus = 'In progress' | 'In review' | 'Planned' | 'On hold';

interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  due: string;
}

const INITIAL_PROJECTS: Project[] = [
  { id: 'brand-refresh', name: 'Brand refresh', status: 'In progress', due: '2026-10-14' },
  { id: 'marketing-site', name: 'Marketing site', status: 'In review', due: '2026-10-28' },
  { id: 'client-portal', name: 'Client portal', status: 'Planned', due: '2026-11-18' },
  { id: 'annual-report', name: 'Annual report', status: 'In progress', due: '2026-12-02' },
  { id: 'packaging', name: 'Packaging', status: 'On hold', due: '2027-01-20' },
];

const STATUS_TONE: Record<ProjectStatus, NonNullable<BadgeProps['tone']>> = {
  'In progress': 'inProgress',
  'In review': 'info',
  Planned: 'neutral',
  'On hold': 'warning',
};

const COLUMNS = [
  { key: 'project', label: 'Project' },
  { key: 'status', label: 'Status' },
  { key: 'due', label: 'Due' },
];

function ArchiveAction({ project, onArchive }: { project: Project; onArchive: (id: string) => void }) {
  return (
    <AlertDialog>
      <AlertDialog.Trigger asChild>
        <Button variant="tertiary" size="sm" tone="danger" aria-label={`Archive ${project.name}`}>
          Archive
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Archive project?</AlertDialog.Title>
          <AlertDialog.Description>
            {`${project.name} will be archived and removed from this client's projects.`}
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel asChild>
            <Button variant="secondary">Cancel</Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action asChild>
            <Button tone="danger" onClick={() => onArchive(project.id)}>
              Archive
            </Button>
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
}

function NotesForm() {
  const { toast } = useToast();
  const [note, setNote] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNote('');
    toast({ title: 'Note saved', tone: 'success' });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Textarea
        label="Notes"
        name="notes"
        rows={4}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <FormActions primary={<Button type="submit">Save note</Button>} />
    </Form>
  );
}

function ClientDetail() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);

  const archiveProject = (id: string) => {
    const project = projects.find((p) => p.id === id);
    setProjects((current) => current.filter((p) => p.id !== id));
    if (project) toast({ title: `${project.name} archived`, tone: 'success' });
  };

  const rows = projects.map((project) => ({
    key: project.id,
    cells: [
      project.name,
      <Badge key="status" tone={STATUS_TONE[project.status]}>
        {project.status}
      </Badge>,
      project.due,
    ],
    actions: (
      <Stack direction="row" gap="tight">
        <Button variant="tertiary" size="sm" aria-label={`View ${project.name}`}>
          View
        </Button>
        <ArchiveAction project={project} onArchive={archiveProject} />
      </Stack>
    ),
  }));

  return (
    <Page>
      <Stack gap="spacious">
        <PageHeader
          breadcrumb={
            <Breadcrumb items={[{ label: 'Clients', href: '/clients' }, { label: 'Northwind Studio' }]} />
          }
          title="Northwind Studio"
          status={<Badge tone="success">Active</Badge>}
        />

        <MetricTiles>
          <MetricTile label="Open projects" value="5" />
          <MetricTile label="Outstanding invoices" value="2" />
          <MetricTile label="Lifetime value" value="$48,200" />
        </MetricTiles>

        <Tabs defaultValue="projects">
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="projects">
            <DataTableSection
              title="Projects"
              columns={COLUMNS}
              rows={rows}
              emptyTitle="No projects"
            />
          </TabsContent>
          <TabsContent value="notes" />
          <TabsContent value="activity" />
        </Tabs>

        <NotesForm />
      </Stack>
    </Page>
  );
}

export function App() {
  return (
    <ToastProvider>
      <ClientDetail />
    </ToastProvider>
  );
}

export default App;
