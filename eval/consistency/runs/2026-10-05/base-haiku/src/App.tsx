import { useState } from 'react';
import {
  Breadcrumb,
  Badge,
  Stat,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  Dialog,
  Textarea,
  Button,
  Stack,
  Text,
} from '@hirobius/design-system';

const projectData = [
  { id: 1, name: 'Brand refresh', status: 'In progress', due: '2026-10-14' },
  { id: 2, name: 'Marketing site', status: 'In review', due: '2026-10-28' },
  { id: 3, name: 'Client portal', status: 'Planned', due: '2026-11-18' },
  { id: 4, name: 'Annual report', status: 'In progress', due: '2026-12-02' },
  { id: 5, name: 'Packaging', status: 'On hold', due: '2027-01-20' },
];

function getStatusTone(status: string): 'success' | 'warning' | 'info' | 'inProgress' | 'neutral' {
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
}

export function App() {
  const [projects, setProjects] = useState(projectData);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotesConfirmation, setShowNotesConfirmation] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleArchiveClick = (projectId: number) => {
    setSelectedProjectId(projectId);
    setArchiveDialogOpen(true);
  };

  const handleArchiveConfirm = () => {
    if (selectedProjectId !== null) {
      setProjects(projects.filter(p => p.id !== selectedProjectId));
      setArchiveDialogOpen(false);
      setSelectedProjectId(null);
    }
  };

  const handleSaveNote = () => {
    setNotes('');
    setShowNotesConfirmation(true);
    setTimeout(() => setShowNotesConfirmation(false), 3000);
  };

  const tableColumns = [
    { key: 'project', label: 'Project' },
    { key: 'status', label: 'Status' },
    { key: 'due', label: 'Due' },
    { key: 'actions', label: '' },
  ];

  const tableRows = projects.map(project => ({
    key: project.id.toString(),
    cells: [
      { slot: 'custom' as const, content: project.name },
      {
        slot: 'custom' as const,
        content: (
          <Badge tone={getStatusTone(project.status)}>
            {project.status}
          </Badge>
        ),
      },
      { slot: 'custom' as const, content: project.due },
      {
        slot: 'custom' as const,
        content: (
          <Stack direction="row" gap="gap" align="center">
            <Button variant="tertiary" size="sm">
              View
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              tone="danger"
              onClick={() => handleArchiveClick(project.id)}
            >
              Archive
            </Button>
          </Stack>
        ),
      },
    ],
  }));

  return (
    <Stack direction="column" gap="stack">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Clients', href: '/' },
          { label: 'Northwind Studio' },
        ]}
        label="Page navigation"
      />

      {/* Title and Status */}
      <Stack direction="row" gap="gap" align="center">
        <Text variant="heading1">Northwind Studio</Text>
        <Badge tone="success">Active</Badge>
      </Stack>

      {/* Stat Tiles */}
      <Stack direction="row" gap="spacious" wrap="wrap">
        <Stat label="Open projects" value="5" />
        <Stat label="Outstanding invoices" value="2" />
        <Stat label="Lifetime value" value="$48,200" />
      </Stack>

      {/* Tabs */}
      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Projects Panel */}
        <TabsContent value="projects">
          <Stack direction="column" gap="stack">
            <Table columns={tableColumns} rows={tableRows} />
          </Stack>
        </TabsContent>

        {/* Notes Panel */}
        <TabsContent value="notes">
          <Stack direction="column" gap="stack">
            <Text variant="body">Notes content placeholder</Text>
          </Stack>
        </TabsContent>

        {/* Activity Panel */}
        <TabsContent value="activity">
          <Stack direction="column" gap="stack">
            <Text variant="body">Activity content placeholder</Text>
          </Stack>
        </TabsContent>
      </Tabs>

      {/* Notes Form */}
      <Stack direction="column" gap="normal">
        <Text variant="heading2">Notes</Text>
        <Textarea
          label="Notes"
          placeholder="Add a note..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          resize="vertical"
        />
        <Stack direction="row" gap="gap" align="center">
          <Button onClick={handleSaveNote}>Save note</Button>
          {showNotesConfirmation && (
            <Badge tone="success">Note saved successfully</Badge>
          )}
        </Stack>
      </Stack>

      {/* Archive Dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Archive project?</Dialog.Title>
          </Dialog.Header>
          <Dialog.Description>
            {selectedProject && `Are you sure you want to archive "${selectedProject.name}"?`}
          </Dialog.Description>
          <Dialog.Footer>
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button tone="danger" onClick={handleArchiveConfirm}>
              Archive
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </Stack>
  );
}
