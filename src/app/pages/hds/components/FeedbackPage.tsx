/**
 * FeedbackPage - /hds/components/feedback
 *
 * Components: Alert, Badge, Callout, ErrorPattern, NotFoundPattern
 * Category validated against: Material Design (Snackbar, Banner), Ant Design (Alert, Message),
 * Chakra UI (Alert, Toast) - components whose primary purpose is communicating system
 * or editorial status are consistently separated from passive display primitives.
 */

import { type ReactNode } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { CategoryComponentDocs } from '../../../components/CategoryComponentDocs';
import { Alert } from '../../../components/alert';
import { Badge } from '../../../components/badge';
import { Callout } from '../../../components/callout';
import { ErrorPattern } from '../../../components/error-pattern';
import { DemoBlock } from '../../../components/demo-block';
import { Stack } from '../../../components/stack';
import { ComponentDocPageShell } from './ComponentDocPageShell';

export default function FeedbackPage() {
  const { isDark } = useTheme();

  const configs = {
    Badge: {
      matrix: (
        <DemoBlock heading="Tones">
          <Stack gap="tight" align="start">
            <Badge tone="neutral">Neutral</Badge>
            <Badge tone="info">Info</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="danger">Danger</Badge>
          </Stack>
        </DemoBlock>
      ),
    },
    Alert: {
      matrix: (
        <DemoBlock heading="Variants">
          <Stack gap="tight" align="start">
            <Alert tone="info" title="Info">
              Background context or guidance.
            </Alert>
            <Alert tone="success" title="Success">
              Action completed successfully.
            </Alert>
            <Alert tone="warning" title="Warning">
              Proceed with caution.
            </Alert>
            <Alert tone="danger" title="Error">
              Something went wrong.
            </Alert>
          </Stack>
        </DemoBlock>
      ),
    },
    Callout: {
      matrix: (
        <DemoBlock heading="Tones">
          <Stack gap="tight" align="start">
            <Callout tone="accent">Pull-quotes and hypotheses.</Callout>
            <Callout tone="info">Background context.</Callout>
            <Callout tone="success">All-clear confirmations.</Callout>
            <Callout tone="warning">Caution, not blocking.</Callout>
            <Callout tone="danger">Blockers and failed states.</Callout>
          </Stack>
        </DemoBlock>
      ),
    },
    ErrorPattern: {
      matrix: (
        <DemoBlock heading="Variants">
          <ErrorPattern message="Something went wrong. Try again." />
        </DemoBlock>
      ),
    },
  } satisfies Record<string, { matrix?: ReactNode; children?: ReactNode }>;

  return (
    <ComponentDocPageShell
      title="Feedback"
      isDark={isDark}
      intro="Components that communicate system state or editorial context."
    >
      <CategoryComponentDocs
        category="Feedback"
        isDark={isDark}
        preferredOrder={['Badge', 'Alert', 'Callout', 'ErrorPattern']}
        configs={configs}
        hideDetails
        hideVariantDeck
        hideHero
      />
    </ComponentDocPageShell>
  );
}

// ADR-017 nav metadata — drives the generated nav-model.json (see scripts/generate-nav-model.mjs).
export const meta = {
  path: '/components/feedback',
  title: 'Feedback',
  section: 'Components',
  order: 4,
} satisfies import('../../../data/nav-model').HdsPageMeta;
