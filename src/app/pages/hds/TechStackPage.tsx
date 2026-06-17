import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { InlineLink } from '../../components/inline-link';
import { InlineCode } from '../../components/inline-code';
import { Table } from '../../components/table';
import hds from '../../design-system/tokens';
import { DocPageHeader, DocSection, useIsMobile } from './HdsDocPrimitives';

const STACK_ROWS: Array<{ layer: string; tool: string; href?: string; why: React.ReactNode }> = [
  {
    layer: 'Build',
    tool: 'Vite',
    href: 'https://vite.dev/',
    why: 'Fast HMR, native ESM, and a low-friction build loop.',
  },
  {
    layer: 'Framework',
    tool: 'React 18.3.1 + TypeScript',
    why: 'The component model maps cleanly to the design system, and strict typing keeps the contract honest.',
  },
  {
    layer: 'Styling',
    tool: 'Token CSS + utility layer',
    why: (
      <>
        A small hand-authored utility layer covers layout primitives like{' '}
        <InlineCode>flex</InlineCode>, <InlineCode>grid</InlineCode>,
        and <InlineCode>gap</InlineCode>. Tokens own the color, type,
        spacing, radius, and motion decisions.
      </>
    ),
  },
  {
    layer: 'Animation',
    tool: 'Motion',
    href: 'https://motion.dev/',
    why: (
      <>
        Motion handles the page and component transitions, and reduced-motion
        support stays built in.
      </>
    ),
  },
  {
    layer: 'Icons',
    tool: 'Lucide React',
    href: 'https://lucide.dev/',
    why: 'Consistent icon family routed through Icon so sizing and color stay token-governed.',
  },
  {
    layer: 'Package manager',
    tool: 'pnpm',
    why: 'Strict dependency resolution keeps installs honest and lightweight.',
  },
  {
    layer: 'AI Infrastructure',
    tool: 'Claude Code',
    why: 'AI context is versioned with the repo, so it travels with git instead of living in a one-off prompt.',
  },
  {
    layer: 'Deploy',
    tool: 'Vercel',
    href: 'https://vercel.com/',
    why: 'Auto-deploys on push to main and gives preview URLs for every branch.',
  },
  {
    layer: 'Dev environment',
    tool: 'GitHub Codespaces',
    href: 'https://github.com/features/codespaces',
    why: (
      <>
        One-click dev environment that keeps the repo, tooling, and AI context
        in sync.
      </>
    ),
  },
];

const OMISSIONS: Array<{ item: string; href?: string; reason: React.ReactNode }> = [
  {
    item: 'CSS-in-JS (styled-components, Emotion)',
    href: 'https://styled-components.com/',
    reason: (
      <>
        Runtime style injection adds complexity and defeats the token layer.{' '}
        <InlineCode>CSS custom properties</InlineCode> are faster and
        framework-agnostic.
      </>
    ),
  },
  {
    item: 'Component library (MUI, Chakra, shadcn)',
    href: 'https://mui.com/',
    reason: 'Building the DS is the work. Importing one would hide the systems thinking this portfolio exists to demonstrate.',
  },
  {
    item: 'Redux / Zustand',
    href: 'https://redux.js.org/',
    reason: 'No global state problem to solve. React context is sufficient for theme and font switching.',
  },
  {
    item: 'Storybook',
    href: 'https://storybook.js.org/',
    reason: 'The HDS doc site is the living documentation. Maintaining two documentation surfaces creates drift.',
  },
  {
    item: 'Syntax highlighting library',
    reason: (
      <>
        <InlineCode>CodeBlock</InlineCode> uses plain{' '}
        <InlineCode>{'<pre><code>'}</InlineCode>. Zero bundle cost. The DS is
        the focus, not the code viewer.
      </>
    ),
  },
];

function LayerCell({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-secondary"
      style={hds.typeStyles.ui}
    >
      {children}
    </span>
  );
}

function ToolCell({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-primary" style={{ ...hds.typeStyles.ui }}>
      {children}
    </span>
  );
}

function WhyCell({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-secondary" style={{ ...hds.typeStyles.body }}>
      {children}
    </span>
  );
}

export default function TechStackPage() {
  const { isDark } = useTheme();
  const isMobile = useIsMobile();

  return (
    <>
      <DocPageHeader
        group="About"
        title="Tech Stack"
        intro="This is the short honest stack behind the system. It stays small on purpose so the portfolio is easier to explain, maintain, and ship."
        isDark={isDark}
      />

      <DocSection title="Stack" isDark={isDark}>
        <div
          style={{
            overflowX: isMobile ? 'auto' : 'visible',
            WebkitOverflowScrolling: 'touch' as const,
          }}
        >
          <div style={{ minWidth: isMobile ? 480 : undefined }}>
            <Table
              caption="Current implementation stack"
              columns={[
                { key: 'layer', label: 'Layer', width: '16%' },
                { key: 'tool', label: 'Package / tool', width: '20%' },
                { key: 'why', label: 'System rationale', width: '64%' },
              ]}
              rows={STACK_ROWS.map((row) => ({
                key: row.layer,
                cells: [
                  { slot: 'label', content: <LayerCell>{row.layer}</LayerCell> },
                  { slot: 'value', content: <ToolCell>{row.href ? <InlineLink href={row.href}>{row.tool}</InlineLink> : row.tool}</ToolCell> },
                  { slot: 'description', content: <WhyCell>{row.why}</WhyCell> },
                ],
              }))}
            />
          </div>
        </div>
        <p className="text-secondary" style={{ ...hds.typeStyles.body, marginTop: hds.semantic.space.layout.gap, marginBottom: hds.semantic.space.section.stack, maxWidth: 560 }}>
          What is not in the stack matters too. These are deliberate no-decisions: each one adds weight or drift without helping the story the system needs to tell.
        </p>

        <Table
          caption="Deliberate omissions"
          columns={[
            { key: 'item', label: 'Not used', width: '28%' },
            { key: 'reason', label: 'Reason', width: '72%' },
          ]}
          rows={OMISSIONS.map((row) => ({
            key: row.item,
            cells: [
              { slot: 'label', content: <ToolCell>{row.href ? <InlineLink href={row.href}>{row.item}</InlineLink> : row.item}</ToolCell> },
              { slot: 'description', content: <WhyCell>{row.reason}</WhyCell> },
            ],
          }))}
        />
      </DocSection>
    </>
  );
}
