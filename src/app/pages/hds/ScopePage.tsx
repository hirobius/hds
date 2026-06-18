import { ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Stack } from '../../components/stack';
import { Text } from '../../components/text';
import { InlineCode } from '../../components/inline-code';
import { Button } from '../../components/button';
import hds from '../../design-system/tokens';
import { DocPageHeader, DocSection } from './HdsDocPrimitives';

const scopePageStyles = {
  scopeList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: hds.semantic.space.component.gap,
  } satisfies React.CSSProperties,
} as const;

export default function ScopePage() {
  const { isDark } = useTheme();

  return (
    <div className="hds-page-enter">
      <article>
        <DocPageHeader
          group="Foundations"
          title="Scope"
          isDark={isDark}
          intro="HDS is a three-tier design token system and React component library for the portfolio and future client projects. It is not an enterprise design system, full-featured UI kit, or data-driven application framework."
        />

        <DocSection title="In Scope" isDark={isDark}>
          <Stack gap="px24">
            <ul style={scopePageStyles.scopeList}>
              <li
                style={{
                  display: 'flex',
                  gap: hds.semantic.space.subgrid.gap,
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: 'var(--semantic-color-accent-primary)', minWidth: '1.25em' }}>
                  •
                </span>
                <Text
                  variant="body"
                  as="span"
                  style={{ color: 'var(--semantic-color-content-primary)' }}
                >
                  <strong>Design tokens</strong> — Primitive, semantic, and component layers flowing
                  from <InlineCode>hirobius.tokens.json</InlineCode>
                </Text>
              </li>
              <li
                style={{
                  display: 'flex',
                  gap: hds.semantic.space.subgrid.gap,
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: 'var(--semantic-color-accent-primary)', minWidth: '1.25em' }}>
                  •
                </span>
                <Text
                  variant="body"
                  as="span"
                  style={{ color: 'var(--semantic-color-content-primary)' }}
                >
                  <strong>React components</strong> — Reusable primitives (Button, Input, Surface)
                  and patterns (forms, layouts) used across portfolio and client work
                </Text>
              </li>
              <li
                style={{
                  display: 'flex',
                  gap: hds.semantic.space.subgrid.gap,
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: 'var(--semantic-color-accent-primary)', minWidth: '1.25em' }}>
                  •
                </span>
                <Text
                  variant="body"
                  as="span"
                  style={{ color: 'var(--semantic-color-content-primary)' }}
                >
                  <strong>Figma plugin + bridge</strong> — Sync design decisions bidirectionally;
                  template injection for rapid prototyping
                </Text>
              </li>
              <li
                style={{
                  display: 'flex',
                  gap: hds.semantic.space.subgrid.gap,
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: 'var(--semantic-color-accent-primary)', minWidth: '1.25em' }}>
                  •
                </span>
                <Text
                  variant="body"
                  as="span"
                  style={{ color: 'var(--semantic-color-content-primary)' }}
                >
                  <strong>Generative pipeline</strong> — AI-driven schema generation, manifest
                  maintenance, and autonomous doc updates
                </Text>
              </li>
            </ul>
          </Stack>
        </DocSection>

        <DocSection title="Out of Scope" isDark={isDark}>
          <Stack gap="px24">
            <ul style={scopePageStyles.scopeList}>
              <li
                style={{
                  display: 'flex',
                  gap: hds.semantic.space.subgrid.gap,
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{ color: 'var(--semantic-color-content-tertiary)', minWidth: '1.25em' }}
                >
                  ×
                </span>
                <Text
                  variant="body"
                  as="span"
                  style={{ color: 'var(--semantic-color-content-secondary)' }}
                >
                  <strong>Business logic</strong> — Workflows, state machines, API integration, form
                  submission, authentication
                </Text>
              </li>
              <li
                style={{
                  display: 'flex',
                  gap: hds.semantic.space.subgrid.gap,
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{ color: 'var(--semantic-color-content-tertiary)', minWidth: '1.25em' }}
                >
                  ×
                </span>
                <Text
                  variant="body"
                  as="span"
                  style={{ color: 'var(--semantic-color-content-secondary)' }}
                >
                  <strong>Data fetching and backend infrastructure</strong> — Server logic, caching,
                  persistence, analytics
                </Text>
              </li>
              <li
                style={{
                  display: 'flex',
                  gap: hds.semantic.space.subgrid.gap,
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{ color: 'var(--semantic-color-content-tertiary)', minWidth: '1.25em' }}
                >
                  ×
                </span>
                <Text
                  variant="body"
                  as="span"
                  style={{ color: 'var(--semantic-color-content-secondary)' }}
                >
                  <strong>Client-specific product UI</strong> — Concrete features should live in
                  client projects, not HDS
                </Text>
              </li>
              <li
                style={{
                  display: 'flex',
                  gap: hds.semantic.space.subgrid.gap,
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{ color: 'var(--semantic-color-content-tertiary)', minWidth: '1.25em' }}
                >
                  ×
                </span>
                <Text
                  variant="body"
                  as="span"
                  style={{ color: 'var(--semantic-color-content-secondary)' }}
                >
                  <strong>Custom illustrations, photography, or brand-specific assets</strong> — HDS
                  provides the system; your project owns the content
                </Text>
              </li>
            </ul>
          </Stack>
        </DocSection>

        <DocSection title="System Contract" isDark={isDark}>
          <Stack gap="px24">
            <Text
              variant="body"
              as="p"
              style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
            >
              HDS maintains a public API contract defined by{' '}
              <InlineCode>public/hds-manifest.json</InlineCode> and{' '}
              <InlineCode>manifest/schema.json</InlineCode>. External consumers (future CLI tools,
              client SDKs, Figma plugins) depend on these interfaces.
            </Text>
            <Text
              variant="body"
              as="p"
              style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
            >
              Breaking changes to the manifest schema require a major version bump and must be
              communicated explicitly. Minor additions are safe.
            </Text>
            <div style={{ marginTop: hds.semantic.space.component.gap }}>
              <Button
                variant="primary"
                size="md"
                onClick={() => (window.location.href = '/system-contract')}
                style={{
                  display: 'inline-flex',
                  gap: hds.semantic.space.subgrid.gap,
                  alignItems: 'center',
                }}
              >
                Read the System Contract
                <ArrowRight size={16} />
              </Button>
            </div>
          </Stack>
        </DocSection>
      </article>
    </div>
  );
}
