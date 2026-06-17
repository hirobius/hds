/**
 * DisplayPage - /hds/components/display
 *
 * Components: Icon, TextLockup, Table, InlineCode, CodeBlock, Token, Stat, Field, StatusListItem, AssetImg, EmptyState, StatusTile, PhaseHeader, AgentTag
 * Category validated against: Ant Design (Data Display), Chakra UI (Data Display),
 * Radix UI (Card) - non-interactive components that present information
 * are grouped under "Display" or "Data Display".
 */

import { type ReactNode } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { CategoryComponentDocs } from '../../../components/CategoryComponentDocs';
import { Badge } from '../../../components/badge';
import { DemoBlock } from '../../../components/demo-block';
import { Stack } from '../../../components/stack';
import { Stat } from '../../../components/stat';
import { Field } from '../../../components/field';
import { StatusListItem } from '../../../components/status-list-item';
import { AgentTag } from '../../../components/agent-tag';
import { EmptyState } from '../../../components/empty-state';
import { PhaseHeader } from '../../../components/phase-header';
import { StatusTile } from '../../../components/status-tile';
import { TextLockup } from '../../../components/text-lockup';
import { InlineCode } from '../../../components/inline-code';
import { CodeBlock } from '../../../components/code-block';
import { Table } from '../../../components/table';
import { AssetImg } from '../../../components/asset-img';
import { Token } from '../../../components/token';
import { Card } from '../../../components/card';
import { ApprovalCard } from '../../../components/approval-card';
import { StackedCardRail } from '../../../components/stacked-card-rail';
import { IconGallery } from './IconGallery';
import { ComponentDocPageShell } from './ComponentDocPageShell';

// color-ok: SVG data URI literal — CSS vars cannot be used inside data:image/svg+xml; these are demo placeholder fills only
const SAMPLE_ASSET_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" aria-hidden="true" focusable="false"><rect width="800" height="600" fill="#f4f4f5"/><rect x="120" y="100" width="560" height="400" fill="#6366f1" opacity="0.12"/><rect x="180" y="160" width="440" height="280" fill="#6366f1" opacity="0.24"/></svg>`)}`; // color-ok

export default function DisplayPage() {
  const { isDark } = useTheme();

  const configs = {
    Icon: {
      matrix: (
        <DemoBlock heading="Registry">
          <IconGallery />
        </DemoBlock>
      ),
    },
    TextLockup: {
      matrix: (
        <DemoBlock heading="Sizes">
          <Stack gap="normal" align="start">
            <TextLockup
              size="section"
              title="Section heading"
              description="Supporting copy for a section lockup."
            />
            <TextLockup size="detail" eyebrow="Detail" title="Detail heading" />
          </Stack>
        </DemoBlock>
      ),
    },
    Table: {
      matrix: (
        <DemoBlock heading="Variants">
          <Table
            columns={[
              { key: 'name', label: 'Component', width: '40%' },
              { key: 'tier', label: 'Tier', width: '30%' },
              { key: 'status', label: 'Status', width: '30%' },
            ]}
            rows={[
              {
                key: 'button',
                cells: [
                  { slot: 'label', content: 'Button' },
                  { slot: 'value', content: 'primitive' },
                  { slot: 'description', content: 'stable' },
                ],
              },
              {
                key: 'badge',
                cells: [
                  { slot: 'label', content: 'Badge' },
                  { slot: 'value', content: 'primitive' },
                  { slot: 'description', content: 'stable' },
                ],
              },
            ]}
          />
        </DemoBlock>
      ),
    },
    InlineCode: {
      matrix: (
        <DemoBlock heading="Variants">
          <Stack gap="tight" align="start">
            <InlineCode>semantic.color.content.primary</InlineCode>
            <InlineCode compact>hds.borderRadius.action</InlineCode>
            <InlineCode copyable>pnpm manifest:generate</InlineCode>
          </Stack>
        </DemoBlock>
      ),
    },
    CodeBlock: {
      matrix: (
        <DemoBlock heading="Variants">
          <CodeBlock
            variant="block"
            filename="tokens.ts"
            language="typescript"
            code={`import hds from '../design-system/tokens';\n\nconst heading = {\n  ...hds.typeStyles.heading1,\n  color: 'var(--semantic-color-content-primary)',\n};`}
          />
        </DemoBlock>
      ),
    },
    Stat: {
      matrix: (
        <DemoBlock heading="Tones">
          <Stack gap="tight" align="start">
            <Stat label="Open tasks" value="14" />
            <Stat label="Done" value="42" tone="success" />
            <Stat label="At risk" value="3" tone="warning" />
            <Stat label="Blockers" value="2" tone="danger" />
            <Stat label="Retainer" value="$1,500" sub="agreed-verbal" />
          </Stack>
        </DemoBlock>
      ),
    },
    Field: {
      matrix: (
        <DemoBlock heading="Variants">
          <Stack gap="tight" align="start">
            <Field label="Source" value="docs/ai/orchestration.json" />
            <Field label="Validation cmd" value="pnpm typecheck" mono />
            <Field label="Outcome" value="success" tone="success" />
            <Field label="Inputs">
              <span className="font-mono text-xs">{'src/app/components/*'}</span>
            </Field>
          </Stack>
        </DemoBlock>
      ),
    },
    StatusListItem: {
      matrix: (
        <DemoBlock heading="Tones">
          <Stack gap="tight" align="start">
            <StatusListItem tone="neutral" title="Draft retainer scope" notes={['Owner: Adrian']} />
            <StatusListItem tone="info" title="Evaluating EZLynx API" />
            <StatusListItem tone="warning" title="Lead intake automation" notes={['In progress']} />
            <StatusListItem tone="success" title="Brand audit delivered" />
            <StatusListItem
              tone="danger"
              title="EZLynx login pending"
              notes={['Blocked: credentials missing']}
              trailing={<Badge tone="danger">Blocked</Badge>}
            />
          </Stack>
        </DemoBlock>
      ),
    },
    AssetImg: {
      matrix: (
        <DemoBlock heading="Variants">
          <AssetImg
            src={SAMPLE_ASSET_SRC}
            alt="Sample asset"
            naturalWidth={800}
            naturalHeight={600}
            style={{ width: 240 }}
          />
        </DemoBlock>
      ),
    },
    EmptyState: {
      matrix: (
        <DemoBlock heading="Variants">
          <Stack gap="tight" align="start">
            <EmptyState title="No tasks scoped yet" />
            <EmptyState
              title="No automations scaffolded"
              description="Add a workflow to get started."
            />
          </Stack>
        </DemoBlock>
      ),
    },
    StatusTile: {
      matrix: (
        <DemoBlock heading="Variants">
          <Stack gap="tight" align="start">
            <StatusTile title="Brand audit delivered" notes={['Owner: Adrian']} />
            <StatusTile
              title="EZLynx login pending"
              notes={['Blocked: credentials missing']}
              trailing={<Badge tone="danger">Blocked</Badge>}
            />
          </Stack>
        </DemoBlock>
      ),
    },
    PhaseHeader: {
      matrix: (
        <DemoBlock heading="Tones">
          <Stack gap="tight" align="start">
            <PhaseHeader name="Phase 1 — Foundation" done={3} total={5} />
            <PhaseHeader
              name="Phase 2 — Hardening"
              done={8}
              total={8}
              tone="success"
              trailing={<Badge tone="success">Done</Badge>}
            />
            <PhaseHeader name="Phase 3 — Launch" done={2} total={6} tone="warning" budget={1500} />
          </Stack>
        </DemoBlock>
      ),
    },
    AgentTag: {
      matrix: (
        <DemoBlock heading="Tiers">
          <Stack gap="tight" align="start">
            <AgentTag assignee="hermes3" modelTier="open-local" costCeiling={0} />
            <AgentTag
              assignee="sonnet-4-6"
              modelTier="closed-frontier"
              costSpent={0.45}
              costCeiling={2.0}
            />
          </Stack>
        </DemoBlock>
      ),
    },
    Token: {
      matrix: (
        <DemoBlock heading="Variants">
          <Stack gap="tight" align="start">
            <Token variant="node" pathDisplayMode="compressed" pathDisplayDepth={1}>
              semantic.color.content.primary
            </Token>
            <Token variant="node" pathDisplayMode="compressed" pathDisplayDepth={1}>
              semantic.color.surface.raised
            </Token>
          </Stack>
        </DemoBlock>
      ),
    },
    Card: {
      matrix: (
        <DemoBlock heading="Variants">
          <Stack gap="tight" align="start">
            <Card bordered>
              <Card.Header>
                <Card.Title>Default card</Card.Title>
                <Card.Description>Neutral bordered surface with slot anatomy.</Card.Description>
              </Card.Header>
            </Card>
            <Card tone="accent">
              <Card.Header>
                <Card.Title>Accent card</Card.Title>
              </Card.Header>
            </Card>
          </Stack>
        </DemoBlock>
      ),
    },
    ApprovalCard: {
      matrix: (
        <DemoBlock heading="Variants">
          <ApprovalCard
            unit={{
              id: 'demo-1',
              name: 'Add token audit gate',
              sprint: 2,
              priority: 1,
              cluster: 'hardening',
              source: 'proposed-units.jsonl',
              description:
                'Add a pre-commit gate that validates all semantic token paths resolve correctly.',
              approval: 'proposed',
            }}
          />
        </DemoBlock>
      ),
    },
    StackedCardRail: {
      matrix: (
        <DemoBlock heading="Variants">
          <StackedCardRail
            cards={[
              { id: 'cs-1', title: 'Hirobius Design System', category: 'Design Systems' },
              { id: 'cs-2', title: 'Token Architecture', category: 'Tokens' },
              { id: 'cs-3', title: 'Component Governance', category: 'Process' },
            ]}
          />
        </DemoBlock>
      ),
    },
  } satisfies Record<string, { matrix?: ReactNode; children?: ReactNode }>;

  return (
    <ComponentDocPageShell
      title="Display"
      isDark={isDark}
      intro="Components that present information without triggering actions."
    >
      <CategoryComponentDocs
        category="Display"
        isDark={isDark}
        preferredOrder={[
          'Icon',
          'TextLockup',
          'Table',
          'InlineCode',
          'CodeBlock',
          'Token',
          'Stat',
          'Field',
          'StatusListItem',
          'AssetImg',
          'EmptyState',
          'StatusTile',
          'PhaseHeader',
          'AgentTag',
          'Token',
          'Card',
          'ApprovalCard',
          'StackedCardRail',
        ]}
        configs={configs}
        hideDetails
        hideVariantDeck
        hideHero
      />
    </ComponentDocPageShell>
  );
}
