import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertDialog,
  Badge,
  Breadcrumb,
  Button,
  EmptyState,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ToastProvider,
  useToast,
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
  key: string;
  name: string;
  status: ProjectStatus;
  due: string;
}

const STATUS_TONE: Record<ProjectStatus, 'inProgress' | 'info' | 'neutral' | 'warning'> = {
  'In progress': 'inProgress',
  'In review': 'info',
  Planned: 'neutral',
  'On hold': 'warning',
};

const INITIAL_PROJECTS: Project[] = [
  { key: 'brand-refresh', name: 'Brand refresh', status: 'In progress', due: '2026-10-14' },
  { key: 'marketing-site', name: 'Marketing site', status: 'In review', due: '2026-10-28' },
  { key: 'client-portal', name: 'Client portal', status: 'Planned', due: '2026-11-18' },
  { key: 'annual-report', name: 'Annual report', status: 'In progress', due: '2026-12-02' },
  { key: 'packaging', name: 'Packaging', status: 'On hold', due: '2027-01-20' },
];

function ClientScreen() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [notes, setNotes] = useState('');

  const archiveProject = (key: string) => {
    setProjects((current) => current.filter((project) => project.key !== key));
  };

  const saveNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (notes.trim() === '') return;
    setNotes('');
    toast({ title: 'Note saved', tone: 'success' });
  };

  const tableRows = projects.map((project) => ({
    key: project.key,
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
        <AlertDialog>
          <AlertDialog.Trigger asChild>
            <Button
              variant="tertiary"
              size="sm"
              tone="danger"
              aria-label={`Archive ${project.name}`}
            >
              Archive
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Archive project?</AlertDialog.Title>
              <AlertDialog.Description>
                {`${project.name} will be removed from this client's project list.`}
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel asChild>
                <Button variant="secondary">Cancel</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button variant="primary" tone="danger" onClick={() => archiveProject(project.key)}>
                  Archive
                </Button>
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog>
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
              columns={[
                { key: 'project', label: 'Project' },
                { key: 'status', label: 'Status' },
                { key: 'due', label: 'Due' },
              ]}
              rows={tableRows}
              emptyTitle="No open projects"
            />
          </TabsContent>
          <TabsContent value="notes">
            <EmptyState title="No notes yet" description="Add a note below." />
          </TabsContent>
          <TabsContent value="activity">
            <EmptyState title="No activity yet" />
          </TabsContent>
        </Tabs>

        <Form onSubmit={saveNote}>
          <Textarea
            label="Notes"
            value={notes}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
          />
          <FormActions
            primary={
              <Button type="submit" variant="primary" disabled={notes.trim() === ''}>
                Save note
              </Button>
            }
          />
        </Form>
      </Stack>
    </Page>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ClientScreen />
    </ToastProvider>
  );
}
