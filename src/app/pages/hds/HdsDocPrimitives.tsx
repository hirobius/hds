/**
 * HdsDocPrimitives — shared doc-page building blocks.
 * @doc-ignore
 *
 * Previously embedded in HDSLayout.tsx. Extracted so page files can import
 * from a single, focused module without pulling in the entire shell.
 *
 * Import pattern (from a sibling hds/ page):
 *   import { DocPageHeader, DocSection, useIsMobile } from './HdsDocPrimitives';
 *
 * Import pattern (from hds/components/ sub-page):
 *   import { DocPageHeader, DocSection, HdsComponentDoc } from '../HdsDocPrimitives';
 *
 * Note: ComponentBlock is retained for backward compatibility but doc pages
 * should use HdsComponentDoc (via ComponentDocPage.tsx) for new work.
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Link as LinkSimple, Check, Figma as FigmaLogo, ArrowLeft } from 'lucide-react';
import systemManifestData from 'virtual:hds-manifest';
import type {
  ComponentApiManifest as BaseComponentApiManifest,
  SystemManifest as BaseSystemManifest,
  ManifestComponentSpec,
  ManifestApiComponent,
} from '../../data/manifest-types';
import { Icon } from '../../components/icon';
import { Token } from '../../components/token';
import { TextLockup } from '../../components/text-lockup';
import { Text } from '../../components/text';
import { PreviewFrame } from '../../components/preview-frame';
import { Stack } from '../../components/stack';
import { Table } from '../../components/table';
import { Button } from '../../components/button';
import { Surface } from '../../components/surface';
import { Disclosure } from '../../components/disclosure';
import {
  buildPropTableRows,
  PROP_TABLE_COLUMNS,
  type ComponentPropRow,
} from '../../components/propTableUtils';
export { HdsComponentDoc } from '../../components/ComponentDocPage';
export { TextLockup } from '../../components/text-lockup';
import { TokenDisplayProvider } from '../../context/TokenDisplayContext';
import hds from '../../design-system/tokens';
import componentApiManifest from '../../data/component-api.json';
import { useToc, slugify, TOC_TITLE_ATTR } from './HdsTocContext';

/* hds-bypass: primitive documentation */

// ── Exported types ─────────────────────────────────────────────────────────

type TokenRow = { token: string; note: string };
type PropRow = ComponentPropRow;
type ComponentStatus = 'new' | 'beta' | 'deprecated';

// HdsDocPrimitives (ComponentBlock) requires props as PropRow[] (not
// ManifestApiPropRow[]) because it passes them to buildPropTableRows.
type ComponentApiEntry = Omit<ManifestApiComponent, 'props'> & { props: PropRow[] };
type ComponentApiManifest = Omit<BaseComponentApiManifest, 'components'> & {
  generatedAt: string;
  source: string;
  components: Record<string, ComponentApiEntry>;
};

// ComponentBlock requires category and figmaUrl to be required on spec entries.
type ComponentSpecEntry = ManifestComponentSpec & {
  category: string;
  figmaUrl: string | null;
};
type SystemManifest = Omit<BaseSystemManifest, 'componentSpecs'> & {
  name: string;
  version: string;
  systemSpecs: {
    engine: string;
    icons: string;
    tokens: string;
    styling: string;
  };
  componentInventory: string[];
  componentSpecs: Record<string, ComponentSpecEntry>;
};

const componentApi = componentApiManifest as ComponentApiManifest;
const systemManifest = systemManifestData as SystemManifest;

const hdsDocPrimitivesStyles = {
  codeCopyBtnBase: {
    padding: `${hds.semantic.space.subgrid.hairline} ${hds.semantic.space.component.padding}`,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: `color ${hds.motion.productive.duration}s`,
  } satisfies React.CSSProperties,
} as const;

// ── Local constants ────────────────────────────────────────────────────────

const DOC_HEADER_MARGIN_BOTTOM = hds.semantic.space.component.gap;
const DOC_SECTION_MARGIN_BOTTOM = hds.semantic.space.section.inset;
const DOC_SECTION_TITLE_GAP = hds.semantic.space.layout.gap;

// ── Module-level style constants ───────────────────────────────────────────

const sectionCopyButtonStyle = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: hds.semantic.space.subgrid.gap,
  padding: 0,
  borderWidth: 0,
  background: 'transparent',
  cursor: 'pointer',
  userSelect: 'none' as const,
  color: 'var(--semantic-color-content-primary)',
  textAlign: 'left' as const,
};

function formatUnfinishedComponentLabel(name: string) {
  return `${name} \u{1F6A7}`;
}

// ── Internal: SectionLabel ─────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Surface
      padding="component"
      style={{
        marginTop: hds.semantic.space.layout.gap,
        marginBottom: hds.semantic.space.component.gap,
      }}
    >
      <Text
        as="span"
        variant="ui"
        style={{
          color: 'var(--semantic-color-content-primary)',
        }}
      >
        {label}
      </Text>
    </Surface>
  );
}

// ── Internal: CodeSnippet ───────────────────────────────────────────────────

function CodeSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Surface padding="component">
      <Stack gap="gap">
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            borderBottom: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
          }}
        >
          <button
            className="hds-focus"
            type="button"
            onClick={copy}
            style={{
              ...hdsDocPrimitivesStyles.codeCopyBtnBase,
              ...hds.typeStyles.technical,
              color: copied
                ? 'var(--semantic-color-content-accent)'
                : 'var(--semantic-color-content-primary)',
            }}
          >
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
        <pre
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          aria-label="Code sample"
          style={{
            margin: 0,
            ...hds.typeStyles.technical,
            lineHeight: 1.7,
            color: 'var(--semantic-color-content-primary)',
            overflowX: 'auto' as const,
            whiteSpace: 'pre' as const,
          }}
        >
          <code>{code}</code>
        </pre>
      </Stack>
    </Surface>
  );
}

// ── useIsMobile ────────────────────────────────────────────────────────────

/** Returns true when viewport < sm breakpoint (hds.breakpoints.sm). */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth < hds.breakpoints.sm,
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < hds.breakpoints.sm);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}
// ── ComponentBlock ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ComponentBlock({
  badge,
  description,
  isDark: _isDark,
  name,
  componentName,
  demo,
  tokens,
  props: propRows,
  code,
  figmaUrl,
  status: _status,
  interactive: _interactive,
  noBottomBorder,
  style,
  children,
}: {
  name: string;
  componentName?: string;
  badge?: string;
  description: string;
  isDark: boolean;
  demo?: React.ReactNode;
  tokens?: TokenRow[];
  props?: PropRow[];
  code?: string;
  figmaUrl?: string;
  status?: ComponentStatus;
  interactive?: boolean;
  noBottomBorder?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const resolvedComponentName = componentName ?? name;
  const manifestComponentSpec = systemManifest.componentSpecs[resolvedComponentName];
  // 10d-14: prefer the explicit figmaLink (URL or TODO marker) over the
  // legacy figmaUrl. TODO markers are surfaced as a "Figma — TODO" affordance
  // rather than rendered as a link.
  const figmaCandidates = [
    manifestComponentSpec?.figmaLink,
    manifestComponentSpec?.figmaUrl,
    figmaUrl,
  ];
  const resolvedFigmaUrl =
    figmaCandidates.find(
      (candidate) =>
        typeof candidate === 'string' && candidate.length > 0 && !candidate.startsWith('TODO:'),
    ) ?? null;
  const resolvedFigmaTodo = !resolvedFigmaUrl
    ? (figmaCandidates.find(
        (candidate) => typeof candidate === 'string' && candidate.startsWith('TODO:'),
      ) ?? null)
    : null;
  const resolvedStyle = style && typeof style === 'object' ? style : undefined;
  const generatedProps = componentApi.components[resolvedComponentName]?.props ?? [];
  const resolvedProps = propRows && propRows.length > 0 ? propRows : generatedProps;
  const resolvedCategory = manifestComponentSpec?.category;

  return (
    <Stack
      gap="px24"
      style={{
        paddingBottom: hds.semantic.space.layout.gap,
        marginBottom: hds.semantic.space.layout.gap,
        borderBottom: noBottomBorder
          ? 'none'
          : `${hds.borderWidth.default} solid var(--semantic-color-border-strong)`,
        ...(resolvedStyle ?? {}),
      }}
    >
      {/* ── Subtitle (badge) ── */}
      <Text variant="heading3" as="h3" style={{ color: 'var(--semantic-color-content-primary)' }}>
        {formatUnfinishedComponentLabel(resolvedComponentName)}
      </Text>

      {badge && (
        <Text variant="ui" as="p" style={{ color: 'var(--semantic-color-content-primary)' }}>
          {badge}
        </Text>
      )}

      {/* ── Description ── */}
      <Text
        variant="body"
        as="p"
        style={{ color: 'var(--semantic-color-content-primary)', maxWidth: 560 }}
      >
        {description}
      </Text>

      {resolvedCategory && (
        <Text variant="ui" as="p" style={{ color: 'var(--semantic-color-content-secondary)' }}>
          Category: {resolvedCategory}
        </Text>
      )}

      {/* ── Preview ── */}
      {demo && <PreviewFrame label="Demo">{demo}</PreviewFrame>}

      {/* ── Tokens ── */}
      {tokens && tokens.length > 0 && (
        <TokenDisplayProvider>
          <Table
            caption="Token references"
            columns={[
              { key: 'token', label: 'Token', width: '1fr' },
              { key: 'note', label: 'Note', width: '1.4fr' },
            ]}
            rows={tokens.map((row) => ({
              key: row.token,
              cells: [
                { slot: 'token', content: <Token variant="node">{row.token}</Token> },
                { slot: 'description', content: row.note },
              ],
            }))}
          />
        </TokenDisplayProvider>
      )}

      {/* ── Props ── */}

      {/* ── Code ── */}
      {resolvedProps.length > 0 && (
        <>
          <SectionLabel label="Properties" />
          <Table
            minWidth={640}
            columns={PROP_TABLE_COLUMNS}
            rows={buildPropTableRows(resolvedProps)}
          />
        </>
      )}

      {code && (
        <>
          <SectionLabel label="Code" />
          <CodeSnippet code={code} />
        </>
      )}

      {/* ── Figma ── */}
      <SectionLabel label="Figma" />
      {resolvedFigmaUrl ? (
        <a
          href={resolvedFigmaUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: hds.semantic.space.subgrid.gap,
            ...hds.typeStyles.body,
            color: 'var(--semantic-color-content-accent)',
            textDecoration: 'none',
          }}
        >
          <Icon icon={FigmaLogo} size={14} color="currentColor" />
          View in Figma
        </a>
      ) : resolvedFigmaTodo ? (
        <Text
          variant="body"
          as="span"
          title={resolvedFigmaTodo}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: hds.semantic.space.subgrid.gap,
            color: 'var(--semantic-color-content-secondary)',
          }}
        >
          <Icon icon={FigmaLogo} size={14} color="currentColor" />
          Figma — TODO
        </Text>
      ) : (
        <Text
          variant="body"
          as="span"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: hds.semantic.space.subgrid.gap,
            color: 'var(--semantic-color-content-primary)',
          }}
        >
          <Icon icon={FigmaLogo} size={14} color="currentColor" />
          Not yet linked
        </Text>
      )}

      {/* ── Custom overflow ── */}
      {children}
    </Stack>
  );
}

// ── DocPageHeader ──────────────────────────────────────────────────────────

export function DocPageHeader({
  group,
  title,
  badge,
  intro,
  isDark: _isDark,
  align = 'left',
  size = 'hero',
  hasTokens: _hasTokens,
}: {
  group: string;
  title: string;
  badge?: string;
  intro?: React.ReactNode;
  isDark: boolean;
  align?: 'left' | 'center';
  size?: 'hero' | 'heroXl';
  hasTokens?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const fromParam = new URLSearchParams(location.search).get('from');
  const isFromTokens = fromParam === '/tokens';

  return (
    <div
      style={{
        marginBottom: DOC_HEADER_MARGIN_BOTTOM,
        minWidth: 0,
      }}
    >
      <Stack gap="px24" style={{ minWidth: 0 }}>
        {isFromTokens ? (
          <div style={{ flexShrink: 0 }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/tokens')}
              iconLeft={<Icon icon={ArrowLeft} size={14} color="currentColor" />}
            >
              Back to Tokens
            </Button>
          </div>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <TextLockup eyebrow={group} title={title} description={intro} size={size} align={align} />
          {badge ? (
            <Text
              variant="caption"
              as="p"
              style={{ color: 'var(--semantic-color-content-primary)' }}
            >
              {badge}
            </Text>
          ) : null}
        </div>
      </Stack>
    </div>
  );
}

// ── DocSection ─────────────────────────────────────────────────────────────

export function DocSection({
  id: idProp,
  title,
  isDark: _isDark,
  children,
  noBorder,
  action,
  actionPlacement = 'side',
  scrollMarginTop,
}: {
  id?: string;
  title?: string;
  isDark: boolean;
  children: React.ReactNode;
  noBorder?: boolean;
  action?: React.ReactNode;
  actionPlacement?: 'top' | 'side';
  scrollMarginTop?: string;
}) {
  const id = idProp ?? (title ? slugify(title) : undefined);
  const { register, unregister } = useToc();
  const [copied, setCopied] = useState(false);

  useLayoutEffect(() => {
    if (!id || !title) return;
    register({ id, title });
    return () => unregister(id);
    // register/unregister are stable useCallback refs — id/title are static per section
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, title]);

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const linkIconStyle = {
    color: 'var(--semantic-color-content-accent)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    flexShrink: 0,
  };

  return (
    <section
      id={id}
      {...(id && title ? { [TOC_TITLE_ATTR]: title } : {})}
      style={{
        marginBottom: noBorder ? 0 : DOC_SECTION_MARGIN_BOTTOM,
        scrollMarginTop: scrollMarginTop ?? hds.semantic.space.layout.gap,
      }}
    >
      {title ? (
        <div
          className="hds-doc-section-header"
          // inline-ok: all layout props are conditional on actionPlacement prop
          style={{
            display: 'flex',
            flexDirection: actionPlacement === 'top' ? 'column' : 'row',
            alignItems: 'flex-start',
            justifyContent: actionPlacement === 'top' ? 'flex-start' : 'space-between',
            gap:
              actionPlacement === 'top'
                ? hds.semantic.space.component.gap
                : hds.semantic.space.layout.gap,
            marginBottom: DOC_SECTION_TITLE_GAP,
          }}
        >
          {action && actionPlacement === 'top' ? (
            <div style={{ flexShrink: 0 }}>{action}</div>
          ) : null}
          <Text
            as="h2"
            variant="heading2"
            style={{ color: 'var(--semantic-color-content-primary)' }}
          >
            <button
              type="button"
              onClick={copyLink}
              className="hds-focus"
              aria-label={`Copy link to ${title}`}
              style={sectionCopyButtonStyle}
            >
              <span className="text-primary" style={{ ...hds.typeStyles.heading2 }}>
                {title}
              </span>
              <span
                aria-hidden="true"
                data-copied={copied ? 'true' : undefined}
                className="hds-doc-section-copy-icon"
                style={linkIconStyle}
              >
                {copied ? (
                  <Icon icon={Check} size="small" color="var(--semantic-color-content-accent)" />
                ) : (
                  <Icon
                    icon={LinkSimple}
                    size="small"
                    color="var(--semantic-color-content-accent)"
                  />
                )}
              </span>
            </button>
          </Text>
          {action && actionPlacement === 'side' ? (
            <div style={{ flexShrink: 0 }}>{action}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

// ── DocTable ───────────────────────────────────────────────────────────────

// -- DocSubsection ---------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DocSubsection({
  id,
  title,
  level = 3,
  intro,
  children,
  marginTop,
  hideTitle = false,
}: {
  id?: string;
  title?: string;
  level?: 3 | 4;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  marginTop?: string | number;
  hideTitle?: boolean;
}) {
  const resolvedId = id ?? (title ? slugify(title) : undefined);
  const { register, unregister } = useToc();

  useLayoutEffect(() => {
    if (!resolvedId || !title) return;
    register({ id: resolvedId, title });
    return () => unregister(resolvedId);
  }, [resolvedId, title, register, unregister]);

  return (
    <section
      id={resolvedId}
      {...(resolvedId && title ? { [TOC_TITLE_ATTR]: title } : {})}
      aria-labelledby={title && !hideTitle ? resolvedId : undefined}
      aria-label={title && hideTitle ? title : undefined}
      style={{
        marginTop: marginTop ?? hds.semantic.space.section.stack,
        scrollMarginTop: hds.semantic.space.section.stack,
      }}
    >
      {title && !hideTitle ? (
        <Text
          as={level === 3 ? 'h3' : 'h4'}
          variant={level === 3 ? 'heading2' : 'heading3'}
          id={resolvedId}
          style={{
            color: 'var(--semantic-color-content-primary)',
            marginBottom: hds.semantic.space.component.padding,
          }}
        >
          {title}
        </Text>
      ) : null}
      {intro ? (
        <Text
          variant="body"
          as="p"
          style={{
            color: 'var(--semantic-color-content-secondary)',
            marginBottom: hds.semantic.space.component.padding,
          }}
        >
          {intro}
        </Text>
      ) : null}
      {children}
    </section>
  );
}

export function HdsFoundationSection({
  id,
  title,
  intro,
  marginTop,
  children,
}: {
  id?: string;
  title: string;
  intro?: React.ReactNode;
  marginTop?: string | number;
  children: React.ReactNode;
}) {
  const resolvedId = id ?? slugify(title);
  const { register, unregister } = useToc();

  useLayoutEffect(() => {
    register({ id: resolvedId, title });
    return () => unregister(resolvedId);
  }, [resolvedId, title, register, unregister]);

  return (
    <section
      id={resolvedId}
      {...{ [TOC_TITLE_ATTR]: title }}
      style={{
        marginTop: marginTop ?? hds.semantic.space.section.stack,
        scrollMarginTop: hds.semantic.space.section.stack,
      }}
    >
      <Stack gap="px24">
        <TextLockup title={title} description={intro} size="section" />
        <div>{children}</div>
      </Stack>
    </section>
  );
}

export function FoundationSwatchGrid({
  columns: _columns = 4,
  children,
}: {
  columns?: number;
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}

export function HdsFoundationTableStack({
  children,
  marginTop = hds.semantic.space.component.gap,
}: {
  children: React.ReactNode;
  marginTop?: string | number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: `calc(${hds.semantic.space.layout.gap} + ${hds.semantic.space.component.gap})`,
        marginTop,
      }}
    >
      {children}
    </div>
  );
}

// ── DocFinePrint ────────────────────────────────────────────────────────────────
//
// Tucks system-specific technical detail behind a collapsible disclosure.
// Use inside HdsFoundationSection or DocSection to keep main explanations
// short and interview-friendly. Technical tables, raw token references,
// and primitive deep-dives belong here.

export function DocFinePrint({
  label = 'Technical details',
  defaultOpen = false,
  children,
}: {
  /** Label shown on the disclosure trigger. */
  label?: string;
  /** Start expanded (useful when the page is already deep-reference). */
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginTop: hds.semantic.space.component.gap,
      }}
    >
      <Disclosure
        label={label}
        defaultOpen={defaultOpen}
        variant="panel"
        triggerStyle={{
          ...hds.typeStyles.caption,
          color: 'var(--semantic-color-content-secondary)',
        }}
        contentStyle={{
          paddingTop: hds.semantic.space.component.gap,
        }}
      >
        {children}
      </Disclosure>
    </div>
  );
}
