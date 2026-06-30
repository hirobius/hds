/**
 * InputsPage - /hds/components/inputs
 *
 * Components: Input, HdsSlider, HdsRadio, SegmentedControl, HdsSelect, Tag
 * Category validated against: Material Design (Text fields, Sliders, Switches, Select),
 * Ant Design (Data Entry), Chakra UI (Forms), Radix UI (Form) - all major DSes
 * classify text-primary fields, sliders, radios, and selects together under "Inputs",
 * "Controls", or "Data Entry".
 */

import { type ReactNode } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { CategoryComponentDocs } from '../../../components/CategoryComponentDocs';
import { Input } from '../../../components/input';
import { HdsRadio, HdsToggle, HdsSlider, HdsSelect } from '../../../components/controls';
import { SegmentedControl } from '../../../components/segmented-control';
import { Tag } from '../../../components/tag';
import { StepperField } from '../../../components/stepper-field';
import { DemoBlock } from '../../../components/demo-block';
import { Stack } from '../../../components/stack';
import { ComponentDocPageShell } from './ComponentDocPageShell';

export default function InputsPage() {
  const { isDark } = useTheme();

  const configs = {
    Input: {
      matrix: (
        <Stack gap="tight">
          <DemoBlock heading="Sizes">
            <Stack gap="tight" align="start">
              <Input size="sm" label="Search tokens" placeholder="Search tokens..." />
              <Input size="md" label="Search tokens" placeholder="Search tokens..." />
              <Input size="lg" label="Search tokens" placeholder="Search tokens..." />
            </Stack>
          </DemoBlock>
          <DemoBlock heading="States">
            <Stack gap="tight" align="start">
              <Input label="Filled" value="Token governance" readOnly />
              <Input
                label="Error"
                value="Token governance"
                errorMessage="Search index unavailable."
                readOnly
              />
            </Stack>
          </DemoBlock>
          <DemoBlock heading="Disabled">
            <Stack gap="tight" align="start">
              <Input label="Search tokens" placeholder="Search tokens..." disabled />
            </Stack>
          </DemoBlock>
        </Stack>
      ),
    },
    HdsRadio: {
      matrix: (
        <DemoBlock heading="Variants">
          <Stack gap="tight" align="start">
            <HdsRadio label="Grid view" checked={false} onChange={() => undefined} />
            <HdsRadio label="Grid view" checked={true} onChange={() => undefined} />
          </Stack>
        </DemoBlock>
      ),
    },
    HdsToggle: {
      matrix: (
        <DemoBlock heading="Variants">
          <Stack gap="tight" align="start">
            <HdsToggle label="Cursor awareness" checked={false} onChange={() => undefined} />
            <HdsToggle label="Cursor awareness" checked={true} onChange={() => undefined} />
          </Stack>
        </DemoBlock>
      ),
    },
    SegmentedControl: {
      matrix: (
        <DemoBlock heading="Sizes">
          <Stack gap="tight" align="start">
            <SegmentedControl
              label="Force mode"
              value="attract"
              onChange={() => undefined}
              options={[
                { value: 'attract', label: 'Attract' },
                { value: 'repel', label: 'Repel' },
                { value: 'flow', label: 'Flow' },
              ]}
              size="md"
            />
            <SegmentedControl
              label="Force mode"
              value="attract"
              onChange={() => undefined}
              options={[
                { value: 'attract', label: 'Attract' },
                { value: 'repel', label: 'Repel' },
                { value: 'flow', label: 'Flow' },
              ]}
              size="sm"
            />
          </Stack>
        </DemoBlock>
      ),
    },
    HdsSlider: {
      matrix: (
        <DemoBlock heading="Values">
          <Stack gap="tight" align="start">
            <HdsSlider label="Opacity" min={0} max={100} value={75} onChange={() => undefined} />
            <HdsSlider label="Blur" min={0} max={20} value={4} onChange={() => undefined} />
          </Stack>
        </DemoBlock>
      ),
    },
    HdsSelect: {
      matrix: (
        <DemoBlock heading="Variants">
          <HdsSelect
            label="Model"
            options={[
              { value: 'sonnet', label: 'Sonnet' },
              { value: 'opus', label: 'Opus' },
              { value: 'haiku', label: 'Haiku' },
            ]}
            value="sonnet"
            onChange={() => undefined}
          />
        </DemoBlock>
      ),
    },
    Tag: {
      matrix: (
        <DemoBlock heading="States">
          <Stack gap="tight" direction="row" align="center">
            <Tag>Design</Tag>
            <Tag active>Active</Tag>
            <Tag>Tokens</Tag>
          </Stack>
        </DemoBlock>
      ),
    },
    StepperField: {
      matrix: (
        <DemoBlock heading="Variants">
          <StepperField
            label="Count"
            value={3}
            min={0}
            max={10}
            step={1}
            onChange={() => undefined}
          />
        </DemoBlock>
      ),
    },
  } satisfies Record<string, { matrix?: ReactNode; children?: ReactNode }>;

  return (
    <ComponentDocPageShell
      title="Inputs"
      isDark={isDark}
      intro="Data entry and selection controls for forms and inputs."
    >
      <CategoryComponentDocs
        category="Inputs"
        isDark={isDark}
        preferredOrder={[
          'Input',
          'HdsSlider',
          'HdsRadio',
          'HdsToggle',
          'SegmentedControl',
          'StepperField',
          'HdsSelect',
          'Tag',
        ]}
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
  path: '/components/inputs',
  title: 'Inputs',
  section: 'Components',
  order: 2,
} satisfies import('../../../data/nav-model').HdsPageMeta;
