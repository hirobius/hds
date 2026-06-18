/* eslint-disable no-restricted-syntax */
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/button';
import { CodeBlock } from '../../components/code-block';
import { Grid } from '../../components/grid';
import { Icon } from '../../components/icon';
import { SegmentedControl } from '../../components/segmented-control';
import { Stack } from '../../components/stack';
import {
  LegacyTokenDetail,
  HdsLegacyTokenGovernancePanel,
} from '../../components/lab/legacy-token-detail';
import {
  allTokens,
  resolveTokenLiteralValue,
  type FlatToken,
} from '../../components/lab/tokenUtils';
import hds from '../../design-system/tokens';
import { LegacyTokenExplorerPanel } from './LegacyTokenExplorerPanel';
import { TokenCascadeDiagram as InteractiveCascadeDiagram } from './TokenCascadeDiagram';
import { DocPageHeader } from './HdsDocPrimitives';
import { HdsSystemDocLayout } from './HdsSystemDocLayout';
import { useToc } from './HdsTocContext';

const columnContentFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18 },
} as const;

function TokenExplorerSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const { register, unregister } = useToc();

  useEffect(() => {
    register({ id, title });
    return () => unregister(id);
  }, [id, title, register, unregister]);

  return (
    <section
      id={id}
      style={{
        minWidth: 0,
        scrollMarginTop: hds.semantic.space.section.stack,
      }}
    >
      {children}
    </section>
  );
}

// ── Token export format builders ────────────────────────────────────────────

type ExportFormat = 'json' | 'css' | 'swift' | 'android';

function buildJsonExport(): string {
  const out: Record<string, Record<string, { value: string; type: string }>> = {};
  for (const token of allTokens) {
    const tier = token.tier;
    if (!out[tier]) out[tier] = {};
    const resolved = resolveTokenLiteralValue(token.path) ?? token.cssVar;
    out[tier][token.path] = { value: resolved, type: token.type };
  }
  return JSON.stringify(out, null, 2);
}

function buildCssExport(): string {
  const lines: string[] = [
    '/**',
    ' * Hirobius Design System — exported custom properties',
    ' * Generated from hirobius.tokens.json',
    ' */',
    ':root {',
  ];
  for (const token of allTokens) {
    const resolved = resolveTokenLiteralValue(token.path);
    if (resolved) lines.push(`  ${token.cssVar}: ${resolved};`);
  }
  lines.push('}');
  return lines.join('\n');
}

function buildSwiftExport(): string {
  const lines: string[] = [
    '// Hirobius Design System — Swift token stubs',
    '// Generated from hirobius.tokens.json',
    '// Replace stub values with resolved literals from hds-tokens.css',
    '',
    'import SwiftUI',
    '',
    'enum HDS {',
    '  enum Token {',
  ];
  for (const token of allTokens) {
    const safeName = token.path.replace(/[.\-]/g, '_');
    const resolved = resolveTokenLiteralValue(token.path) ?? '""';
    lines.push(`    static let ${safeName} = "${resolved}"`);
  }
  lines.push('  }', '}');
  return lines.join('\n');
}

function buildAndroidExport(): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!-- Hirobius Design System — Android token stubs -->',
    '<!-- Generated from hirobius.tokens.json -->',
    '<!-- Replace stub values with resolved literals from hds-tokens.css -->',
    '<resources>',
  ];
  for (const token of allTokens) {
    const safeName = token.path.replace(/[.\-]/g, '_');
    const resolved = resolveTokenLiteralValue(token.path) ?? '';
    if (token.type === 'color') {
      lines.push(`  <color name="${safeName}">${resolved}</color>`);
    } else {
      lines.push(`  <string name="${safeName}">${resolved}</string>`);
    }
  }
  lines.push('</resources>');
  return lines.join('\n');
}

const EXPORT_TABS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'json', label: 'JSON' },
  { value: 'css', label: 'CSS' },
  { value: 'swift', label: 'Swift' },
  { value: 'android', label: 'Android XML' },
];

const EXPORT_LANG: Record<ExportFormat, string> = {
  json: 'json',
  css: 'css',
  swift: 'swift',
  android: 'xml',
};

function TokenExportSection() {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [code, setCode] = useState<string>('');

  useEffect(() => {
    // Defer heavy string building off the render path
    const id = requestAnimationFrame(() => {
      switch (format) {
        case 'json':
          setCode(buildJsonExport());
          break;
        case 'css':
          setCode(buildCssExport());
          break;
        case 'swift':
          setCode(buildSwiftExport());
          break;
        case 'android':
          setCode(buildAndroidExport());
          break;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [format]);

  return (
    <div style={{ display: 'grid', gap: hds.semantic.space.component.padding }}>
      <div
        style={{
          borderBottom: `${hds.borderWidth.default} solid var(--semantic-color-border-subdued)`,
          paddingBottom: hds.semantic.space.component.padding,
        }}
      >
        <h2
          style={{
            ...hds.typeStyles.heading3,
            margin: 0,
            color: 'var(--semantic-color-content-primary)',
          }}
        >
          Export
        </h2>
        <p
          style={{
            ...hds.typeStyles.body,
            margin: `${hds.semantic.space.component.gap} 0 0 0`,
            color: 'var(--semantic-color-content-secondary)',
          }}
        >
          Copy tokens in your preferred format. JSON and CSS are fully resolved; Swift and Android
          XML are stubs using the same resolved values.
        </p>
      </div>
      <div
        style={{
          width: `min(100%, calc(${hds.size[96]} * 4))`,
          maxWidth: '100%',
        }}
      >
        <SegmentedControl
          ariaLabel="Token export format"
          fullWidth
          variant="secondary"
          segmentPaddingX={hds.semantic.space.layout.gap}
          options={EXPORT_TABS}
          value={format}
          onChange={(v) => setFormat(v as ExportFormat)}
          size="compact"
          railPadding={hds.semantic.space.subgrid.gap}
        />
      </div>
      <CodeBlock
        code={code || '…'}
        language={EXPORT_LANG[format]}
        filename={`hds-tokens.${EXPORT_LANG[format]}`}
      />
    </div>
  );
}

export default function TokensPage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const fromScrollY: number | undefined = (location.state as { fromScrollY?: number } | null)
    ?.fromScrollY;
  const tokenExplorerFromPath = new URLSearchParams(location.search).get('from');
  const hasExternalTokenSource =
    !!tokenExplorerFromPath && !tokenExplorerFromPath.startsWith('/tokens');
  const tokenPath = new URLSearchParams(location.search).get('token');
  const backLabel = tokenExplorerFromPath
    ? (tokenExplorerFromPath.split('/').filter(Boolean).pop() ?? '')
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : '';
  const selectedToken = tokenPath
    ? (allTokens.find((token) => token.path === tokenPath) ?? null)
    : (allTokens[0] ?? null);

  function handleSelectToken(token: FlatToken) {
    const next = new URLSearchParams(location.search);
    next.set('token', token.path);
    navigate(
      {
        pathname: location.pathname,
        search: `?${next.toString()}`,
      },
      { replace: true, preventScrollReset: true },
    );
  }

  return (
    <HdsSystemDocLayout
      contentMaxWidth="content"
      contentSlot={
        <div
          style={{
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 'calc(100dvh - (var(--semantic-space-layout-inset) * 2))', // audit-ok: content rail minimum height is derived from viewport inset math
          }}
        >
          <DocPageHeader
            group="HDS"
            title="Token Explorer"
            isDark={isDark}
            intro={
              <p style={{ ...hds.typeStyles.body, margin: 0 }}>
                Tokens are the shared language of HDS. Pick one to trace how a value moves from
                source to compiled output.
              </p>
            }
          />

          <Stack gap="normal" style={{ flex: 1, minWidth: 0 }}>
            {hasExternalTokenSource ? (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    navigate(tokenExplorerFromPath, { state: { restoreScrollY: fromScrollY } })
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: hds.semantic.space.subgrid.gap,
                  }}
                >
                  <Icon icon={ArrowLeft} size={12} color="currentColor" />
                  Back to {backLabel}
                </Button>
              </div>
            ) : null}

            <TokenExplorerSection id="cascade" title="Three-Tier Cascade">
              <div
                style={{ display: 'grid', gap: hds.semantic.space.component.padding, minWidth: 0 }}
              >
                <div
                  style={{
                    borderBottom: `${hds.borderWidth.default} solid var(--semantic-color-border-subdued)`,
                    paddingBottom: hds.semantic.space.component.padding,
                  }}
                >
                  <h2
                    style={{
                      ...hds.typeStyles.heading3,
                      margin: 0,
                      color: 'var(--semantic-color-content-primary)',
                    }}
                  >
                    Three-Tier Cascade
                  </h2>
                  <p
                    style={{
                      ...hds.typeStyles.body,
                      margin: `${hds.semantic.space.component.padding} 0 0 0`,
                      color: 'var(--semantic-color-content-secondary)',
                    }}
                  >
                    Every component value resolves up to a primitive through a semantic alias. Hover
                    any node to highlight the full cascade chain that feeds it — from primitive
                    source through semantic alias to component consumer.
                  </p>
                </div>
                <div style={{ overflow: 'auto' }}>
                  <InteractiveCascadeDiagram isDark={isDark} />
                </div>
              </div>
            </TokenExplorerSection>

            <Grid columns={12} gap="normal" style={{ minWidth: 0 }}>
              <Grid.Item colSpan={4}>
                <TokenExplorerSection id="library" title="Library">
                  <LegacyTokenExplorerPanel isDark={isDark} />
                </TokenExplorerSection>
              </Grid.Item>

              <Grid.Item colSpan={4}>
                <TokenExplorerSection id="anatomy" title="Anatomy">
                  <div
                    style={{
                      display: 'grid',
                      gap: hds.semantic.space.component.padding,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        borderBottom: `${hds.borderWidth.default} solid var(--semantic-color-border-subdued)`,
                        paddingBottom: hds.semantic.space.component.padding,
                      }}
                    >
                      <h2
                        style={{
                          ...hds.typeStyles.heading3,
                          margin: 0,
                          color: 'var(--semantic-color-content-primary)',
                        }}
                      >
                        Anatomy
                      </h2>
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={selectedToken?.path ?? 'no-token'}
                        initial={columnContentFade.initial}
                        animate={columnContentFade.animate}
                        exit={columnContentFade.exit}
                        transition={columnContentFade.transition}
                      >
                        <LegacyTokenDetail
                          token={selectedToken}
                          isDark={isDark}
                          onSelectToken={handleSelectToken}
                          showHeading={false}
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </TokenExplorerSection>
              </Grid.Item>

              <Grid.Item colSpan={4}>
                <TokenExplorerSection id="details" title="Details">
                  <div
                    style={{
                      display: 'grid',
                      gap: hds.semantic.space.component.padding,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        borderBottom: `${hds.borderWidth.default} solid var(--semantic-color-border-subdued)`,
                        paddingBottom: hds.semantic.space.component.padding,
                      }}
                    >
                      <h2
                        style={{
                          ...hds.typeStyles.heading3,
                          margin: 0,
                          color: 'var(--semantic-color-content-primary)',
                        }}
                      >
                        Details
                      </h2>
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={`details-${selectedToken?.path ?? 'no-token'}`}
                        initial={columnContentFade.initial}
                        animate={columnContentFade.animate}
                        exit={columnContentFade.exit}
                        transition={columnContentFade.transition}
                      >
                        <HdsLegacyTokenGovernancePanel
                          token={selectedToken}
                          isDark={isDark}
                          showHeading={false}
                          onSelectToken={handleSelectToken}
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </TokenExplorerSection>
              </Grid.Item>
            </Grid>

            <TokenExplorerSection id="export" title="Export">
              <TokenExportSection />
            </TokenExplorerSection>
          </Stack>
        </div>
      }
    />
  );
}
