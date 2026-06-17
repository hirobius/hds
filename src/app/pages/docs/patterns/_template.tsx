/**
 * Pattern doc template (8t-1, refactored 9d-9)
 *
 * Canonical layout for tier:pattern documentation pages. Patterns are
 * curated compositions of HDS primitives — they expose only the props
 * that get forwarded to the root primitive, so the doc surface is
 * deliberately lighter than a full primitive page:
 *
 *   1. one-line description (intro)
 *   2. when-to-use bullets (3-5)
 *   3. text-based composition diagram ("X = A + B + C")
 *   4. 2-3 code examples covering primary use cases
 *   5. links back to the primitive docs that compose the pattern
 *
 * 9d-9 chrome: every pattern doc page is wrapped by DocShell at the
 * route layer (routes.tsx). This template adds the standardised in-content
 * chrome — DocPageHeader at the top, HeadingAnchor for H2/H3 TOC
 * pickup, CodeBlock (collapsed-by-default) for source samples, and
 * ApiReference at the bottom (patterns surface their own componentSpec).
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import systemManifestData from 'virtual:hds-manifest';
import { HdsSystemDocLayout } from '../../hds/HdsSystemDocLayout';
import { Stack } from '../../../components/stack';
import { Text } from '../../../components/text';
import { DocPageHeader, type DocPageHeaderSpec } from '../../../components/doc-page-header';
import { HeadingAnchor } from '../../../components/heading-anchor';
import { CodeBlock } from '../../../components/code-block';
import { ApiReference } from '../../../components/api-reference';

export interface PatternPrimitiveLink {
  label: string;
  href: string;
}

export interface PatternCodeExample {
  title: string;
  description?: string;
  source: string;
  preview?: ReactNode;
}

export interface PatternDocPageProps {
  /** Pattern name (e.g. "HdsField"). Renders as the page title. */
  title: string;
  /** One-line description. Renders below the page header. */
  intro: string;
  /** Theme flag — retained for backward compatibility; the new header is theme-passive. */
  isDark: boolean;
  /** When-to-use bullets, 3-5 items. */
  whenToUse: string[];
  /** Composition diagram, e.g. "HdsField = HdsLabel + Input + HdsHelperText". */
  composition: string;
  /** Code examples covering primary use cases. */
  examples: PatternCodeExample[];
  /** Links to primitive docs the pattern composes. */
  primitives: PatternPrimitiveLink[];
}

type ManifestComponentSpec = {
  description?: string;
  filePath?: string;
  figmaUrl?: string | null;
  figmaLink?: string | null;
  tier?: string;
  stability?: 'stable' | 'beta';
  slots?: unknown[];
  propConstraints?: Record<string, unknown>;
};

type SystemManifest = {
  componentSpecs?: Record<string, ManifestComponentSpec>;
};

const MANIFEST = systemManifestData as SystemManifest;

function projectHeaderSpec(title: string, intro: string): DocPageHeaderSpec {
  const manifestSpec = MANIFEST.componentSpecs?.[title];
  if (manifestSpec) {
    return {
      name: title,
      description: manifestSpec.description ?? intro,
      filePath: manifestSpec.filePath,
      figmaUrl: manifestSpec.figmaUrl ?? null,
      figmaLink: manifestSpec.figmaLink ?? null,
      tier: manifestSpec.tier ?? 'pattern',
      stability: manifestSpec.stability,
      slots: manifestSpec.slots,
      propConstraints: manifestSpec.propConstraints,
    };
  }
  return {
    name: title,
    description: intro,
    tier: 'pattern',
  };
}

export function PatternDocPage({
  title,
  intro,
  whenToUse,
  composition,
  examples,
  primitives,
}: PatternDocPageProps) {
  const headerSpec = projectHeaderSpec(title, intro);

  return (
    <HdsSystemDocLayout
      contentSlot={(
        <Stack gap="spacious" style={{ minWidth: 0 }}>
          <DocPageHeader spec={headerSpec} />

          <section>
            <Stack gap="tight">
              <HeadingAnchor level={2}>When to use</HeadingAnchor>
              <ul style={{ margin: 0, paddingInlineStart: '1.25em' }}>
                {whenToUse.map((bullet) => (
                  <li key={bullet}>
                    <Text variant="body" as="span">{bullet}</Text>
                  </li>
                ))}
              </ul>
            </Stack>
          </section>

          <section>
            <Stack gap="tight">
              <HeadingAnchor level={2}>Composition</HeadingAnchor>
              <CodeBlock code={composition} language="text" />
            </Stack>
          </section>

          <section>
            <Stack gap="normal">
              <HeadingAnchor level={2}>Examples</HeadingAnchor>
              {examples.map((example) => (
                <Stack key={example.title} gap="tight">
                  <HeadingAnchor level={3}>{example.title}</HeadingAnchor>
                  {example.description ? (
                    <Text variant="body">{example.description}</Text>
                  ) : null}
                  {example.preview ? (
                    <div
                      style={{
                        padding: 'var(--semantic-space-component-padding)',
                        background: 'var(--semantic-color-surface-page)',
                        border: '1px solid var(--semantic-color-border-default)', // outline-ok: doc preview container — scopes live component render from surrounding doc chrome
                        borderRadius: 'var(--primitive-radius-2)', /* tier-ok: doc preview container — 2px radius has no semantic alias */
                      }}
                    >
                      {example.preview}
                    </div>
                  ) : null}
                  <CodeBlock
                    code={example.source}
                    language="tsx"
                    collapsible
                    defaultExpanded={false}
                  />
                </Stack>
              ))}
            </Stack>
          </section>

          <section>
            <Stack gap="tight">
              <HeadingAnchor level={2}>Primitives used</HeadingAnchor>
              <ul style={{ margin: 0, paddingInlineStart: '1.25em' }}>
                {primitives.map((primitive) => (
                  <li key={primitive.href}>
                    <Link
                      to={primitive.href}
                      className="hds-focus"
                      style={{ color: 'var(--semantic-color-content-accent)' }}
                    >
                      {primitive.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Stack>
          </section>

          {/* 9d-9: API reference mounts at the bottom of every pattern doc.
              Templates skip this block (Adrian-ratified 2026-05-01). */}
          <ApiReference componentName={title} />
        </Stack>
      )}
    />
  );
}
