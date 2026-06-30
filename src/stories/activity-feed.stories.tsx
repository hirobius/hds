/**
 * ActivityFeed stories — chronological event log demos.
 * @see src/app/components/activity-feed.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import {
  Upload as UploadSimple,
  ShieldCheck,
  CircleX as XCircle,
  Rocket,
  Lock,
} from 'lucide-react';
import { ActivityFeed, defaultActivityEvents } from '../app/components/activity-feed';
import type { ActivityEvent } from '../app/components/activity-feed';
import { Icon } from '../app/components/icon';

const meta = {
  title: 'Primitives/activity-feed',
  component: ActivityFeed,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Chronological system event log. Renders activity events with whitespace-only separation, status-coloured icons, and optional action buttons.',
      },
    },
  },
} satisfies Meta<typeof ActivityFeed>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    events: defaultActivityEvents,
  },
};

const successEvents: ActivityEvent[] = [
  {
    id: 'svc-deploy',
    title: 'Service Deployed',
    description:
      'API gateway v3.1.2 successfully promoted to production. Zero-downtime rollout completed across all three availability zones.',
    timestamp: '2026-04-21 · 23:05',
    category: 'CI/CD',
    icon: <Icon icon={Rocket} size="medium" />,
    status: 'success',
    action: { label: 'View Release' },
  },
  {
    id: 'file-upload',
    title: 'File Uploaded',
    description:
      'firmware-v2.4.1.bin was uploaded to the staging environment. File size 4.2 MB. Integrity check passed.',
    timestamp: '2026-04-21 · 22:40',
    category: 'Storage',
    icon: <Icon icon={UploadSimple} size="medium" />,
    status: 'success',
  },
];

export const AllSuccess: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Feed containing only success-status events.',
      },
    },
  },
  args: {
    events: successEvents,
  },
};

const errorWarningEvents: ActivityEvent[] = [
  {
    id: 'deploy-fail',
    title: 'Deployment Failed',
    description:
      'Release candidate rc-1.9.0 failed to deploy to production. Build step "lint:tokens" exited with code 1. Rollback triggered automatically.',
    timestamp: '2026-04-22 · 06:30',
    category: 'CI/CD',
    icon: <Icon icon={XCircle} size="medium" />,
    status: 'error',
    action: { label: 'View Logs' },
  },
  {
    id: 'access-revoked',
    title: 'Access Revoked',
    description:
      'SSH access for contractor account "contractor-j.reed" was revoked following project completion. Token invalidated.',
    timestamp: '2026-04-22 · 05:50',
    category: 'Security',
    icon: <Icon icon={Lock} size="medium" />,
    status: 'warning',
  },
];

export const ErrorsAndWarnings: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Feed highlighting error and warning status events.',
      },
    },
  },
  args: {
    events: errorWarningEvents,
  },
};

const singleEvent: ActivityEvent[] = [
  {
    id: 'policy-update',
    title: 'Policy Updated',
    description:
      'Access control policy "eng-prod-write" was modified. Three permission groups were added; two removed.',
    timestamp: '2026-04-22 · 07:52',
    category: 'Security',
    icon: <Icon icon={ShieldCheck} size="medium" />,
    status: 'info',
    action: { label: 'View Details' },
  },
];

export const SingleEvent: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Feed with a single info event and an action button.',
      },
    },
  },
  args: {
    events: singleEvent,
  },
};
