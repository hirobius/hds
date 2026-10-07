import { useState } from 'react';
import {
  Stack,
  Breadcrumb,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  AlertDialog,
  Textarea,
  ToastProvider,
  useToast,
} from '@hirobius/design-system';
import {
  Page,
  PageHeader,
  MetricTiles,
  MetricTile,
  Form,
  FormActions,
  DataTableSection,
} from '@hirobius/design-system/patterns';

export function App() {
  const [projects, setProjects] = useState([
    { id: '1', name: 'Brand refresh', status: 'In progress', due: '2026-10-14' },
    { id: '2', name: 'Marketing site', status: 'In review', due: '2026-10-28' },
    { id: '3', name: 'Client portal', status: 'Planned', due: '2026-11-18' },
    { id: '4', name: 'Annual report', status: 'In progress', due: '2026-12-02' },
    { id: '5', name: 'Packaging', status: 'On hold', due: '2027-01-20' },
  ]);

  const [notes, setNotes] = useState('');
  const [archiveProjectId, setArchiveProjectId] = useState(null);
  const { toast } = useToast();

  const handleSaveNote = (e) => {
    e.preventDefault();
    toast({
      title: 'Note saved',
      tone: 'success',
    });
    setNotes('');
  };

  const handleArchiveConfirm = () => {
    if (archiveProjectId) {
      setProjects(projects.filter(p => p.id !== archiveProjectId));
      setArchiveProjectId(null);
      toast({
        title: 'Project archived',
        tone: 'success',
      });
    }
  };

  const archiveProject = projects.find(p => p.id === archiveProjectId);

  const getStatusTone = (status) => {
    switch (status) {
      case 'In progress':
        return 'inProgress';
      case 'In review':
        return 'info';
      case 'Planned':
        return 'neutral';
      case 'On hold':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const projectTableRows = projects.map(project => ({
    key: project.id,
    cells: [
      project.name,
      <Badge key="status" tone={getStatusTone(project.status)}>
        {project.status}
      </Badge>,
      project.due,
    ],
    actions: (
      <Stack direction="row" gap="tight">
        <Button
          variant="tertiary"
          size="sm"
          aria-label={`View ${project.name}`}
        >
          View
        </Button>
        <AlertDialog>
          <AlertDialog.Trigger asChild>
            <Button
              variant="tertiary"
              size="sm"
              tone="danger"
              aria-label={`Archive ${project.name}`}
              onClick={() => setArchiveProjectId(project.id)}
            >
              Archive
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Archive project?</AlertDialog.Title>
              <AlertDialog.Description>
                Archive "{archiveProject?.name}"? This action cannot be undone.
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel asChild>
                <Button variant="secondary" onClick={() => setArchiveProjectId(null)}>
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button tone="danger" onClick={handleArchiveConfirm}>
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
    <ToastProvider>
      <Page>
        <Stack gap="spacious">
          <PageHeader
            breadcrumb={
              <Breadcrumb
                items={[
                  { label: 'Clients', href: '#' },
                  { label: 'Northwind Studio' },
                ]}
              />
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
                rows={projectTableRows}
              />
            </TabsContent>

            <TabsContent value="notes">
              <Form onSubmit={handleSaveNote}>
                <Textarea
                  label="Notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add notes about this client..."
                />
                <FormActions
                  primary={<Button type="submit">Save note</Button>}
                />
              </Form>
            </TabsContent>

            <TabsContent value="activity">
              {/* Activity tab content is empty as per spec */}
            </TabsContent>
          </Tabs>
        </Stack>
      </Page>
    </ToastProvider>
  );
}
