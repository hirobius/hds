/**
 * Template doc template (8t-2, refactored 9d-9)
 *
 * Canonical layout for tier:template documentation pages. Templates are
 * full-surface page recipes (e.g. info / case-study / error). They have
 * minimal props (typically just `isDark`), so the doc surface focuses on
 * the rendered output and where the live route lives:
 *
 *   1. one-line intro
 *   2. "Use this template for…" bullets (3-5)
 *   3. inline preview surface (full template render)
 *   4. short source excerpt (the call site shape, not the template body)
 *   5. live route link
 *   6. composed primitives / patterns (links)
 *
 * 9d-9 chrome: every template doc page is wrapped by DocShell at the
 * route layer (routes.tsx). This template adds the standardised in-content
 * chrome — DocPageHeader at the top, HeadingAnchor for H2/H3 TOC
 * pickup, CodeBlock (collapsed-by-default) for the call-site sample.
 *
 * Templates DO NOT render ApiReference (Adrian-ratified 2026-05-01):
 * templates compose primitives — the reference belongs on the primitive
 * doc page, not the template page.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import systemManifestData from 'virtual:hds-manifest';
import { HdsSystemDocLayout } from '../../hds/HdsSystemDocLayout';
import { Stack } from '../../../components/stack';
import { DocPageHeader, type DocPageHeaderSpec } from '../../../components/doc-page-header';
import { HeadingAnchor } from '../../../components/heading-anchor';
import { CodeBlock } from '../../../components/code-block';

export interface TemplateLink {
  label: string;
  href: string;
}

export interface TemplateDocPageProps {
  /** Template name (e.g. "InfoPage"). Renders as the page title. */
  title: string;
  /** One-line intro. Renders below the page header. */
  intro: string;
  /** Theme flag — retained for backward compatibility; the new header is theme-passive. */
  isDark: boolean;
  /** "Use this template for…" bullets, 3-5 items. */
  useFor: string[];
  /** Inline preview surface — full template rendered at gallery scale. */
  preview: ReactNode;
  /** Short source excerpt showing the call site shape. */
  source: string;
  /** Live route the template powers. */
  liveRoute: TemplateLink;
  /** Primitives / patterns the template composes. */
  composes: TemplateLink[];
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
      tier: manifestSpec.tier ?? 'template',
      stability: manifestSpec.stability,
      slots: manifestSpec.slots,
      propConstraints: manifestSpec.propConstraints,
    };
  }
  return {
    name: title,
    description: intro,
    tier: 'template',
  };
}

const PREVIEW_FRAME_STYLE = {
  padding: 'var(--semantic-space-component-padding)',
  background: 'var(--semantic-color-surface-page)',
  border: '1px solid var(--semantic-color-border-default)', // outline-ok: doc preview frame — scopes full template render from surrounding doc chrome
  borderRadius: 'var(--primitive-radius-2)', /* tier-ok: doc preview frame — 2px radius has no semantic alias */
  overflow: 'hidden' as const,
};

export function TemplateDocPage({
  title,
  intro,
  useFor,
  preview,
  source,
  liveRoute,
  composes,
}: TemplateDocPageProps) {
  const headerSpec = projectHeaderSpec(title, intro);

  return (
    <HdsSystemDocLayout
      contentSlot={(
        <Stack gap="spacious" style={{ minWidth: 0 }}>
          <DocPageHeader spec={headerSpec} />

          <section>
            <Stack gap="tight">
              <HeadingAnchor level={2}>Use this template for</HeadingAnchor>
              <ul style={{ margin: 0, paddingInlineStart: '1.25em' }}>
                {useFor.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </Stack>
          </section>

          <section>
            <Stack gap="tight">
              <HeadingAnchor level={2}>Preview</HeadingAnchor>
              <div style={PREVIEW_FRAME_STYLE}>{preview}</div>
            </Stack>
          </section>

          <section>
            <Stack gap="tight">
              <HeadingAnchor level={2}>Call site</HeadingAnchor>
              <CodeBlock
                code={source}
                language="tsx"
                collapsible
                defaultExpanded={false}
              />
            </Stack>
          </section>

          <section>
            <Stack gap="tight">
              <HeadingAnchor level={2}>Live route</HeadingAnchor>
              <Link
                to={liveRoute.href}
                className="hds-focus"
                style={{ color: 'var(--semantic-color-content-accent)' }}
              >
                {liveRoute.label}
              </Link>
            </Stack>
          </section>

          <section>
            <Stack gap="tight">
              <HeadingAnchor level={2}>Composed from</HeadingAnchor>
              <ul style={{ margin: 0, paddingInlineStart: '1.25em' }}>
                {composes.map((entry) => (
                  <li key={entry.href}>
                    <Link
                      to={entry.href}
                      className="hds-focus"
                      style={{ color: 'var(--semantic-color-content-accent)' }}
                    >
                      {entry.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Stack>
          </section>
        </Stack>
      )}
    />
  );
}
