/**
 * NavigationPage - /hds/components/navigation
 *
 * Components: NavGroup, NavItem, DocLinkCard, InlineLink, Tabs, TabsList, TabsTrigger, TabsContent
 * Category validated against: Material Design (Navigation bar, Navigation drawer),
 * Ant Design (Navigation group), Chakra UI (Breadcrumb, Link, Stepper) - components
 * whose primary purpose is spatial orientation and page-level routing are universally
 * grouped under "Navigation", separate from action triggers (buttons) and data
 * entry controls (inputs).
 */

import { type ReactNode } from 'react';
import { Layers } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { CategoryComponentDocs } from '../../../components/CategoryComponentDocs';
import { NavGroup } from '../../../components/nav-group';
import { NavItem } from '../../../components/nav-item';
import { DocLinkCard } from '../../../components/doc-link-card';
import { InlineLink } from '../../../components/inline-link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/tabs';
import { DemoBlock } from '../../../components/demo-block';
import { Stack } from '../../../components/stack';
import { ComponentDocPageShell } from './ComponentDocPageShell';

export default function NavigationPage() {
  const { isDark } = useTheme();

  const configs = {
    NavGroup: {
      matrix: (
        <DemoBlock heading="Variants">
          <NavGroup
            label="Design System"
            items={[
              { path: '/tokens', label: 'Tokens' },
              { path: '/components/actions', label: 'Components' },
              { path: '/components/doc-utilities', label: 'Patterns' },
            ]}
          />
        </DemoBlock>
      ),
    },
    NavItem: {
      matrix: (
        <DemoBlock heading="States">
          <Stack gap="tight" align="start">
            <NavItem label="Tokens" href="/tokens" />
            <NavItem label="Components" href="/components/actions" active />
          </Stack>
        </DemoBlock>
      ),
    },
    Tabs: {
      matrix: (
        <DemoBlock heading="Variants">
          <Tabs defaultValue="design">
            <TabsList>
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
            </TabsList>
            <TabsContent value="design">Design guidelines and visual specs.</TabsContent>
            <TabsContent value="code">Implementation details and props.</TabsContent>
            <TabsContent value="usage">When and how to use this component.</TabsContent>
          </Tabs>
        </DemoBlock>
      ),
    },
    DocLinkCard: {
      matrix: (
        <DemoBlock heading="Variants">
          <Stack gap="tight" align="start">
            <DocLinkCard
              title="Design Tokens"
              description="Color, space, and typography tokens."
              href="/tokens"
              icon={Layers}
            />
            <DocLinkCard title="Components" href="/components/actions" icon={Layers} accent />
          </Stack>
        </DemoBlock>
      ),
    },
    InlineLink: {
      matrix: (
        <DemoBlock heading="Variants">
          <Stack gap="tight" align="start">
            <InlineLink href="/tokens">View tokens</InlineLink>
            <InlineLink href="https://example.com" externalIcon>
              External link
            </InlineLink>
          </Stack>
        </DemoBlock>
      ),
    },
    TabsList: {
      matrix: (
        <DemoBlock heading="Container">
          <Tabs defaultValue="design">
            <TabsList>
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
            </TabsList>
          </Tabs>
        </DemoBlock>
      ),
    },
    TabsTrigger: {
      matrix: (
        <DemoBlock heading="States">
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="default">Default</TabsTrigger>
              <TabsTrigger value="another">Another</TabsTrigger>
            </TabsList>
          </Tabs>
        </DemoBlock>
      ),
    },
    TabsContent: {
      matrix: (
        <DemoBlock heading="Panel">
          <Tabs defaultValue="first">
            <TabsList>
              <TabsTrigger value="first">First</TabsTrigger>
              <TabsTrigger value="second">Second</TabsTrigger>
            </TabsList>
            <TabsContent value="first">First panel — revealed when trigger is active.</TabsContent>
            <TabsContent value="second">Second panel — shown on selection.</TabsContent>
          </Tabs>
        </DemoBlock>
      ),
    },
  } satisfies Record<string, { matrix?: ReactNode; children?: ReactNode }>;

  return (
    <ComponentDocPageShell
      title="Navigation"
      isDark={isDark}
      intro="Components that provide spatial orientation and page routing."
    >
      <CategoryComponentDocs
        category="Navigation"
        isDark={isDark}
        preferredOrder={[
          'NavGroup',
          'NavItem',
          'Tabs',
          'TabsList',
          'TabsTrigger',
          'TabsContent',
          'DocLinkCard',
          'InlineLink',
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
  path: '/components/navigation',
  title: 'Navigation',
  section: 'Components',
  order: 5,
} satisfies import('../../../data/nav-model').HdsPageMeta;
