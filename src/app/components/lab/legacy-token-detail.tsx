/* eslint-disable no-restricted-syntax */
/**
 * LegacyTokenDetail - lab-facing token inspect
 * @category Lab
 * @tier experiment
 *
 * @deprecated 2026-05-01 (10d-11): superseded by the headless scan
 *   architecture per TASKS.md "Stale / Superseded" → "Live token
 *   inspector UI". Pruning deferred until /hds/tokens is retired or
 *   rewritten — see docs/archive/work/2026-05-01-token-explorer-prune-deferred.md.
 *   Also exports HdsLegacyTokenGovernancePanel from the same file.
 */
import { motion, AnimatePresence } from 'motion/react';
import { Fragment, useMemo } from 'react';
import { ArrowUp, Search } from 'lucide-react';
import { Icon } from '../icon';
import hds from '../../design-system/tokens';
import { CodeBlock } from '../code-block';
import { InlineLink } from '../inline-link';
import { Token } from '../token';

const legacyTokenDetailStyles = {
  provenanceArrow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
    height: hds.size[32],
    color: 'var(--semantic-color-content-secondary)',
  } satisfies React.CSSProperties,
  microProvenanceArrow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
    height: hds.size[16],
    color: 'var(--semantic-color-content-secondary)',
  } satisfies React.CSSProperties,
  traceRow: {
    display: 'grid',
    gap: hds.semantic.space.subgrid.hairline,
    justifyItems: 'start',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
  } satisfies React.CSSProperties,
  compositeDnaColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: hds.semantic.space.subgrid.gap,
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
  } satisfies React.CSSProperties,
  contrastRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: hds.semantic.space.component.gap,
    rowGap: hds.semantic.space.subgrid.gap,
  } satisfies React.CSSProperties,
} as const;
import { Badge } from '../badge';
import tokenAuditReport from '../../data/token-audit-report.json';
import {
  convertCssColorToHex,
  contrastRatio,
  buildWebAimContrastHref,
} from '../../utils/colorUtils';
import type { TokenAuditReport, UsageEntry } from '../../data/tokenAuditReportTypes';
import {
  FlatToken,
  formatCategoryLabel,
  formatTokenValue,
  resolveAlias,
  resolveTokenLiteralValue,
  allTokens,
} from './tokenUtils';

type ThemeMode = 'light' | 'dark';

const HIGH_IMPACT_LIMIT = 28;
const DETAILS_LABEL_GAP = hds.semantic.space.subgrid.gap;

const auditReport = tokenAuditReport as TokenAuditReport;

function normalizeTokenRef(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  return val.replace(/^\{|}$/g, '').trim();
}

function findUpstreamAliases(token: FlatToken): FlatToken[] {
  const { path } = token;
  return allTokens.filter((t) => {
    if (t.path === path) return false;
    return (
      normalizeTokenRef(t.lightAlias) === path ||
      normalizeTokenRef(t.darkAlias) === path ||
      normalizeTokenRef(t.rawValue) === path
    );
  });
}

function isHexColor(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function resolveHexForMode(ref: string, mode: ThemeMode) {
  const value = resolveTokenLiteralValue(ref, mode);
  if (isHexColor(value)) return value.toLowerCase();
  const colorValue = typeof value === 'string' ? value : null;
  if (colorValue && /^oklch\(/i.test(colorValue.trim())) {
    return convertCssColorToHex(colorValue);
  }
  return null;
}

function resolveOklchForMode(ref: string, mode: ThemeMode) {
  const value = resolveTokenLiteralValue(ref, mode);
  return typeof value === 'string' && /^oklch\(/i.test(value.trim()) ? value : null;
}

function isAliasRef(ref: unknown): ref is string {
  return typeof ref === 'string' && ref.startsWith('{');
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveRecursiveAliasChain(
  ref: unknown,
  mode: ThemeMode,
  seen = new Set<string>(),
): FlatToken[] {
  if (!isAliasRef(ref)) return [];
  const next = resolveAlias(ref);
  if (!next || seen.has(next.path)) return [];
  seen.add(next.path);
  const nextRef = mode === 'light' ? next.lightAlias : next.darkAlias;
  return [...resolveRecursiveAliasChain(nextRef, mode, seen), next];
}

function dedupeTokens(tokens: FlatToken[]) {
  const seen = new Set<string>();
  return tokens.filter((token) => {
    if (seen.has(token.path)) return false;
    seen.add(token.path);
    return true;
  });
}

function formatTraceRawValue(rawValue: unknown, mode: ThemeMode) {
  if (typeof rawValue === 'string') {
    const resolved = resolveTokenLiteralValue(rawValue, mode);
    if (resolved) return resolved;
    return rawValue;
  }

  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    const record = rawValue as { value?: unknown; unit?: unknown };
    if ('value' in record || 'unit' in record) {
      const valueText = formatTraceRawValue(record.value, mode);
      const unitText = typeof record.unit === 'string' ? record.unit : '';
      if (valueText && unitText) return `${valueText}${unitText}`;
      if (valueText) return valueText;
      if (unitText) return unitText;
    }
  }

  return formatTokenValue(rawValue);
}

function ProvenanceArrow() {
  return (
    <span aria-hidden="true" style={legacyTokenDetailStyles.provenanceArrow}>
      <Icon icon={ArrowUp} size={12} color="currentColor" weight="bold" />
    </span>
  );
}

function SourceValueNode({ value, title }: { value: unknown; title?: string }) {
  const label = typeof value === 'string' ? value : formatTokenValue(value);

  return (
    <Token variant="node" nowrap={false} isSourceNode isSelected={false} ariaLabel={title ?? label}>
      {label}
    </Token>
  );
}

type TokenTraceBranch = {
  rawValue: unknown;
  steps: FlatToken[];
};

function buildTraceBranches(token: FlatToken, mode: ThemeMode): TokenTraceBranch[] {
  const branches: TokenTraceBranch[] = [];

  const buildSteps = (ref: unknown) => dedupeTokens(resolveRecursiveAliasChain(ref, mode));

  const walkValue = (value: unknown) => {
    if (isPlainRecord(value)) {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        const steps = buildSteps(value);
        if (steps.length > 0) branches.push({ rawValue: value, steps });
        return;
      }

      for (const [, child] of entries) {
        walkValue(child);
      }
      return;
    }

    const steps = buildSteps(value);
    if (steps.length > 0) branches.push({ rawValue: value, steps });
  };

  if (isPlainRecord(token.rawValue)) {
    const entries = Object.entries(token.rawValue);
    if (entries.length === 0) {
      branches.push({ rawValue: token.rawValue, steps: [] });
    } else {
      for (const [, child] of entries) {
        walkValue(child);
      }
    }
    return branches.length > 0 ? branches : [{ rawValue: token.rawValue, steps: [] }];
  }

  const modeRef = mode === 'light' ? token.lightAlias : token.darkAlias;
  const steps = buildSteps(modeRef);
  return steps.length > 0
    ? [{ rawValue: token.rawValue, steps }]
    : [{ rawValue: token.rawValue, steps: [] }];
}

function isCompositeToken(token: FlatToken) {
  return Boolean(token.composite && Object.keys(token.composite).length > 0);
}

type CompositeDnaEntry = {
  key: string;
  label: string;
  aliasPath: string | null;
  sourceValue: string;
};

function normalizeAliasPath(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed.slice(1, -1).replace(/\//g, '.');
  }
  return trimmed;
}

function buildCompositeDnaEntries(token: FlatToken, mode: ThemeMode): CompositeDnaEntry[] {
  if (!token.composite) return [];

  return Object.entries(token.composite).map(([key, value]) => {
    const aliasPath =
      typeof value === 'string' ? (resolveAlias(value)?.path ?? normalizeAliasPath(value)) : null;
    const sourceValue = resolveTokenLiteralValue(value, mode) ?? formatTraceRawValue(value, mode);

    return {
      key,
      label: formatCategoryLabel(key),
      aliasPath,
      sourceValue,
    };
  });
}

function TokenTraceStack({
  branches,
  mode,
  onSelectToken,
  token,
}: {
  branches: TokenTraceBranch[];
  mode: ThemeMode;
  onSelectToken?: (token: FlatToken) => void;
  token: FlatToken;
}) {
  if (branches.length === 0) return null;

  return (
    <div style={{ display: 'grid', gap: hds.semantic.space.component.gap, minWidth: 0 }}>
      {branches.map((branch, index) => {
        const lineage = [...branch.steps].reverse();
        // steps[0] is the leaf (deepest) token in the resolved alias chain.
        // Use its rawValue so the source node reflects the mode-correct primitive,
        // not token.rawValue which is always the light-mode authored value.
        const leafStep = branch.steps[0];
        const rawLabel = leafStep
          ? formatTraceRawValue(leafStep.rawValue, mode)
          : formatTraceRawValue(branch.rawValue, mode);

        return (
          <div
            key={`trace-${index}-${branch.steps.map((step) => step.path).join('|')}`}
            style={{
              ...legacyTokenDetailStyles.traceRow,
              paddingTop: index === 0 ? 0 : hds.semantic.space.component.gap,
            }}
          >
            <Token
              variant="node"
              swatchVar={token.type === 'color' ? token.cssVar : undefined}
              onClick={onSelectToken ? () => onSelectToken(token) : undefined}
              isSelected={false}
              truncateFromStart
            >
              {token.path}
            </Token>
            {lineage.map((step) => (
              <Fragment key={step.path}>
                <ProvenanceArrow />
                <Token
                  variant="node"
                  swatchVar={step.type === 'color' ? step.cssVar : undefined}
                  onClick={onSelectToken ? () => onSelectToken(step) : undefined}
                  isSelected={false}
                  truncateFromStart
                >
                  {step.path}
                </Token>
              </Fragment>
            ))}
            <ProvenanceArrow />
            <SourceValueNode value={rawLabel} title="Resolved raw value" />
          </div>
        );
      })}
    </div>
  );
}

function MicroProvenanceArrow() {
  return (
    <span aria-hidden="true" style={legacyTokenDetailStyles.microProvenanceArrow}>
      <Icon icon={ArrowUp} size={10} color="currentColor" weight="bold" />
    </span>
  );
}

function SourceValueBadge({ value }: { value: string }) {
  return (
    <Token variant="node" isSourceNode isSelected={false} ariaLabel={value}>
      {value}
    </Token>
  );
}

function CompositeDnaCard({
  entry,
  onSelectToken,
}: {
  entry: CompositeDnaEntry;
  onSelectToken?: (token: FlatToken) => void;
}) {
  const aliasToken = entry.aliasPath
    ? (allTokens.find((token) => token.path === entry.aliasPath) ?? null)
    : null;
  return (
    <div style={{ display: 'grid', gap: hds.semantic.space.subgrid.gap, minWidth: 0 }}>
      <p
        style={{
          ...hds.typeStyles.technical,
          margin: 0,
          color: 'var(--semantic-color-content-secondary)',
        }}
      >
        {entry.label}
      </p>
      <div style={legacyTokenDetailStyles.compositeDnaColumn}>
        <Token
          variant="node"
          tokenPath={entry.aliasPath ?? undefined}
          onClick={aliasToken && onSelectToken ? () => onSelectToken(aliasToken) : undefined}
          isSelected={false}
          ariaLabel={entry.aliasPath ?? 'Literal'}
          truncateFromStart
        >
          {entry.aliasPath ?? 'Literal'}
        </Token>
        <MicroProvenanceArrow />
        <SourceValueBadge value={entry.sourceValue} />
      </div>
    </div>
  );
}

function CompositeDnaGrid({
  token,
  mode,
  onSelectToken,
}: {
  token: FlatToken;
  mode: ThemeMode;
  onSelectToken?: (token: FlatToken) => void;
}) {
  const entries = buildCompositeDnaEntries(token, mode);
  if (entries.length === 0) return null;

  return (
    <div style={{ display: 'grid', gap: hds.semantic.space.component.gap, minWidth: 0 }}>
      <Token
        variant="node"
        swatchVar={token.type === 'color' ? token.cssVar : undefined}
        isSelected={false}
        truncateFromStart
      >
        {token.path}
      </Token>
      <MicroProvenanceArrow />
      <div style={{ display: 'grid', gap: hds.semantic.space.component.padding, minWidth: 0 }}>
        {entries.map((entry) => (
          <CompositeDnaCard key={entry.key} entry={entry} onSelectToken={onSelectToken} />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ isDark }: { isDark: boolean }) {
  void isDark;
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        height: 220,
        gap: hds.semantic.space.sidebar.gap,
      }}
    >
      <Icon icon={Search} size={18} color="var(--semantic-color-content-secondary)" />
      <span className="text-secondary" style={{ ...hds.typeStyles.ui, margin: 0 }}>
        Select a token to trace its alias chain
      </span>
    </div>
  );
}

export function LegacyTokenDetail({
  token,
  isDark,
  onSelectToken,
  showHeading = true,
}: {
  token: FlatToken | null;
  isDark: boolean;
  onSelectToken?: (token: FlatToken) => void;
  showHeading?: boolean;
}) {
  if (!token) return <EmptyState isDark={isDark} />;
  return (
    <LegacyTokenDetailInner
      token={token}
      isDark={isDark}
      onSelectToken={onSelectToken}
      showHeading={showHeading}
    />
  );
}

function LegacyTokenDetailInner({
  token,
  isDark,
  onSelectToken,
  showHeading = true,
}: {
  token: FlatToken;
  isDark: boolean;
  onSelectToken?: (token: FlatToken) => void;
  showHeading?: boolean;
}) {
  const _tokenSwatchVar = token.type === 'color' ? token.cssVar : undefined;
  const mode: ThemeMode = isDark ? 'dark' : 'light';
  const traceBranches = useMemo(() => buildTraceBranches(token, mode), [token, mode]);
  const showCompositeGrid = isCompositeToken(token);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        data-inspector-ignore="token-detail"
        key={token.path}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        {showHeading ? (
          <h2
            style={{
              ...hds.typeStyles.heading3,
              margin: 0,
              marginBottom: hds.semantic.space.component.gap,
              color: 'var(--semantic-color-content-primary)',
            }}
          >
            Anatomy
          </h2>
        ) : null}
        {showCompositeGrid ? (
          <CompositeDnaGrid token={token} mode={mode} onSelectToken={onSelectToken} />
        ) : (
          <TokenTraceStack
            branches={traceBranches}
            mode={mode}
            onSelectToken={onSelectToken}
            token={token}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Copy rail ─────────────────────────────────────────────────────────────────

function CopyRailPanel({ token, mode }: { token: FlatToken; mode: ThemeMode }) {
  const rawHex = token.type === 'color' ? resolveHexForMode(token.path, mode) : null;
  const rawOklch = token.type === 'color' ? resolveOklchForMode(token.path, mode) : null;

  const items = [
    { id: 'css', label: 'CSS var', value: `var(${token.cssVar})`, variant: 'inline-code' as const },
    { id: 'path', label: 'JS path', value: token.path, variant: 'inline-code' as const },
    ...(rawOklch
      ? [{ id: 'oklch', label: 'OKLCH', value: rawOklch, variant: 'inline-code' as const }]
      : []),
    ...(rawHex
      ? [{ id: 'hex', label: 'Hex', value: rawHex, variant: 'inline-code' as const }]
      : []),
  ];

  return (
    <section>
      <p
        style={{ ...hds.typeStyles.ui, margin: 0, color: 'var(--semantic-color-content-primary)' }}
      >
        Copy
      </p>
      <div style={{ display: 'grid', gap: hds.semantic.space.component.gap }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{ display: 'grid', gap: hds.semantic.space.subgrid.gap, minWidth: 0 }}
          >
            <p
              style={{
                ...(item.id === 'css' ||
                item.id === 'path' ||
                item.id === 'oklch' ||
                item.id === 'hex'
                  ? hds.typeStyles.caption
                  : hds.typeStyles.ui),
                margin: 0,
                color:
                  item.id === 'css' ||
                  item.id === 'path' ||
                  item.id === 'oklch' ||
                  item.id === 'hex'
                    ? 'var(--semantic-color-content-secondary)'
                    : 'var(--semantic-color-content-primary)',
              }}
            >
              {item.label}
            </p>
            <CodeBlock code={item.value} variant="inline" truncateFromStart />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Contrast checker ──────────────────────────────────────────────────────────

function ContrastBadge({ label, passes }: { label: string; passes: boolean }) {
  return (
    <Badge tone={passes ? 'success' : 'warning'}>
      {label} {passes ? 'PASS' : 'FAIL'}
    </Badge>
  );
}
function ContrastCheckerPanel({ token, mode }: { token: FlatToken; mode: ThemeMode }) {
  if (token.type !== 'color') return null;
  const tokenHex = resolveHexForMode(token.path, mode);
  if (!tokenHex) return null;

  const surfaces = [
    { label: 'on surface.page', path: 'semantic.color.surface.page' },
    { label: 'on surface.raised', path: 'semantic.color.surface.raised' },
    { label: 'on surface.overlay', path: 'semantic.color.surface.overlay' },
  ];

  const results = surfaces
    .map((surface) => {
      const surfaceHex = resolveHexForMode(surface.path, mode);
      if (!surfaceHex) return null;
      const ratio = contrastRatio(tokenHex, surfaceHex);
      return {
        label: surface.label,
        ratio,
        surfaceHex,
        passesAA: ratio >= 4.5,
        passesAAA: ratio >= 7.0,
        passesAALarge: ratio >= 3.0,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (results.length === 0) return null;
  const defaultCheckerHref = buildWebAimContrastHref(tokenHex, results[0].surfaceHex);

  return (
    <section>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: hds.semantic.space.component.gap,
        }}
      >
        <p
          style={{
            ...hds.typeStyles.ui,
            margin: 0,
            color: 'var(--semantic-color-content-primary)',
          }}
        >
          Contrast
        </p>
        <span
          style={{
            ...hds.typeStyles.caption,
            color: 'var(--semantic-color-content-secondary)',
            flexShrink: 0,
            transform: 'translateY(1px)',
          }}
        >
          <InlineLink href={defaultCheckerHref}>WebAIM checker</InlineLink>
        </span>
      </div>
      <div>
        {results.map((result) => (
          <div key={result.label}>
            <div style={legacyTokenDetailStyles.contrastRow}>
              <span
                style={{
                  ...hds.typeStyles.technical,
                  color: 'var(--semantic-color-content-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {result.label}
              </span>
              <span
                style={{
                  ...hds.typeStyles.technical,
                  color: 'var(--semantic-color-content-primary)',
                }}
              >
                {result.ratio.toFixed(2)}:1
              </span>
            </div>
            <div>
              <ContrastBadge label="AA" passes={result.passesAA} />
              <ContrastBadge label="AAA" passes={result.passesAAA} />
              <ContrastBadge label="AA Large" passes={result.passesAALarge} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Upstream consumers ────────────────────────────────────────────────────────

function UpstreamConsumersPanel({
  token,
  mode,
  onSelectToken,
}: {
  token: FlatToken;
  mode: ThemeMode;
  onSelectToken?: (token: FlatToken) => void;
}) {
  const upstream = useMemo(() => findUpstreamAliases(token), [token]);
  if (upstream.length === 0) return null;

  return (
    <section>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: hds.semantic.space.subgrid.gap,
          flexWrap: 'wrap',
        }}
      >
        <p
          style={{
            ...hds.typeStyles.ui,
            margin: 0,
            color: 'var(--semantic-color-content-primary)',
          }}
        >
          Aliased by
        </p>
        <span
          style={{ ...hds.typeStyles.technical, color: 'var(--semantic-color-content-secondary)' }}
        >
          {upstream.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: DETAILS_LABEL_GAP }}>
        {upstream.slice(0, 10).map((t) => (
          <Token
            key={t.path}
            variant="node"
            tokenPath={t.path}
            onClick={onSelectToken ? () => onSelectToken(t) : undefined}
            swatchVar={
              t.type === 'color' ? (resolveHexForMode(t.path, mode) ?? undefined) : undefined
            }
            truncateFromStart
          >
            {t.path}
          </Token>
        ))}
        {upstream.length > 10 && (
          <p
            style={{
              ...hds.typeStyles.caption,
              margin: 0,
              color: 'var(--semantic-color-content-secondary)',
            }}
          >
            +{upstream.length - 10} more
          </p>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function getUsageStatus(totalReferences: number) {
  if (totalReferences === 0) {
    return {
      label: 'Unused',
      variant: 'warning' as const,
      description: 'No consumers outside documentation — pruning candidate.',
    };
  }
  if (totalReferences >= HIGH_IMPACT_LIMIT) {
    return {
      label: 'High Impact',
      variant: 'warning' as const,
      description: `${totalReferences} references — high blast radius.`,
    };
  }
  return {
    label: 'Active',
    variant: 'success' as const,
    description: `${totalReferences} reference${totalReferences === 1 ? '' : 's'}.`,
  };
}

export function HdsLegacyTokenGovernancePanel({
  token,
  isDark,
  showHeading = true,
  onSelectToken,
}: {
  token: FlatToken | null;
  isDark: boolean;
  showHeading?: boolean;
  onSelectToken?: (token: FlatToken) => void;
}) {
  if (!token) {
    return (
      <div>
        {showHeading ? (
          <h2
            style={{
              ...hds.typeStyles.heading3,
              margin: 0,
              marginBottom: hds.semantic.space.component.gap,
              color: 'var(--semantic-color-content-primary)',
            }}
          >
            Details
          </h2>
        ) : null}
        <span className="text-secondary" style={{ ...hds.typeStyles.caption, margin: 0 }}>
          Select a token to inspect tier, usage, accessibility, and impact telemetry.
        </span>
      </div>
    );
  }

  const currentMode: ThemeMode = isDark ? 'dark' : 'light';
  const _alternateMode: ThemeMode = isDark ? 'light' : 'dark';
  const usageEntry: UsageEntry = auditReport.usageMap?.[token.path] ?? {
    tokenPath: token.path,
    totalReferences: 0,
    files: [],
    fileReferences: [],
  };
  const usageCount = usageEntry.totalReferences;
  const _fileCount = usageEntry.fileReferences.length;
  const _status = getUsageStatus(usageCount);

  return (
    <div>
      <div>
        {showHeading ? (
          <h2
            style={{
              ...hds.typeStyles.heading3,
              margin: 0,
              marginBottom: hds.semantic.space.component.gap,
              color: 'var(--semantic-color-content-primary)',
            }}
          >
            Details
          </h2>
        ) : null}
        {token.description ? (
          <div>
            <p
              style={{
                ...hds.typeStyles.ui,
                margin: 0,
                color: 'var(--semantic-color-content-primary)',
              }}
            >
              Description
            </p>
            <p
              style={{
                ...hds.typeStyles.caption,
                margin: 0,
                color: 'var(--semantic-color-content-secondary)',
                maxWidth: '42ch',
              }}
            >
              {token.description}
            </p>
          </div>
        ) : null}
      </div>

      <div>
        <CopyRailPanel token={token} mode={currentMode} />
        <ContrastCheckerPanel token={token} mode={currentMode} />
        <UpstreamConsumersPanel token={token} mode={currentMode} onSelectToken={onSelectToken} />
      </div>
    </div>
  );
}
