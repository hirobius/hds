/**
 * @tier experiment
 */
// @doc-exempt: internal lab token inspector, used by live explorer plumbing rather than docs surfaces.
/**
 * TokenDetail - canonical token detail inspector for the live token explorer and lab tooling.
 * @category Lab
 *
 * @deprecated 2026-05-01 (10d-11): superseded by the headless scan
 *   architecture per TASKS.md "Stale / Superseded" → "Live token
 *   inspector UI". Pruning deferred until /hds/tokens is retired or
 *   rewritten — see docs/archive/work/2026-05-01-token-explorer-prune-deferred.md.
 */
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { Icon } from '../icon';
import hds from '../../design-system/tokens';
import { Tag } from '../tag';
import { Token } from '../token';

const tokenDetailStyles = {
  categoryBtnBase: {
    display: 'grid',
    gap: hds.semantic.space.subgrid.gap,
    width: '100%',
    padding: hds.semantic.space.component.gap,
    border: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
    borderRadius: hds.borderRadius[8],
    background: 'var(--semantic-color-surface-page)',
    textAlign: 'left' as const,
  } satisfies React.CSSProperties,
} as const;
import { useIsMobile } from '../../pages/hds/HdsDocPrimitives';
import { FlatToken, formatTokenValue, resolveAlias, resolveAliasCssVar, formatCategoryLabel } from './tokenUtils';

type UsageEntry = {
  tokenPath: string;
  totalReferences: number;
  files: string[];
  fileReferences: Array<{ file: string; references: number }>;
};

function shortFileName(file: string) {
  return file.split(/[\\/]/).pop() ?? file;
}

function findPrimitiveLeaf(token: FlatToken) {
  const seen = new Set<string>([token.path]);
  let current: FlatToken | null = token;

  while (current && current.tier !== 'primitive') {
    const ref = typeof current.lightAlias === 'string' ? current.lightAlias : current.darkAlias;
    if (typeof ref !== 'string' || !ref) break;
    const next = resolveAlias(ref);
    if (!next || seen.has(next.path)) break;
    seen.add(next.path);
    current = next;
  }

  return current && current.tier === 'primitive' ? current : null;
}

const truncateFromStartTextStyle: React.CSSProperties = {
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  direction: 'rtl',
  textAlign: 'left',
};

function InspectorCard({
  label,
  value,
  tone = 'primary',
  subvalue,
}: {
  label: string;
  value: ReactNode;
  tone?: 'primary' | 'muted' | 'warning';
  subvalue?: ReactNode;
}) {
  const valueColor = tone === 'warning'
    ? 'var(--semantic-color-feedback-warning)'
    : tone === 'muted'
      ? 'var(--semantic-color-content-secondary)'
      : 'var(--semantic-color-content-primary)';

  return (
    <div>
      <span style={{ ...hds.typeStyles.caption, color: 'var(--semantic-color-content-secondary)', margin: 0 }}>
        {label}
      </span>
      <span
        style={{
          ...hds.typeStyles.technical,
          color: valueColor,
          margin: 0,
          display: 'block',
          minWidth: 0,
          ...truncateFromStartTextStyle,
        }}
      >
        {value}
      </span>
      {subvalue ? (
        typeof subvalue === 'string' || typeof subvalue === 'number' ? (
          <span style={{ ...hds.typeStyles.caption, color: 'var(--semantic-color-content-secondary)', margin: 0 }}>
            {subvalue}
          </span>
        ) : (
          <div>{subvalue}</div>
        )
      ) : null}
    </div>
  );
}

function LineageStepCard({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: ReactNode;
  subvalue?: ReactNode;
}) {
  return (
    <div>
      <span style={{ ...hds.typeStyles.caption, color: 'var(--semantic-color-content-secondary)', margin: 0 }}>
        {label}
      </span>
      {typeof value === 'string' || typeof value === 'number' ? (
        <span
          style={{
            ...hds.typeStyles.technical,
            color: 'var(--semantic-color-content-primary)',
            margin: 0,
            display: 'block',
            minWidth: 0,
            ...truncateFromStartTextStyle,
          }}
        >
          {value}
        </span>
      ) : (
        <div>{value}</div>
      )}
      {subvalue ? (
        typeof subvalue === 'string' || typeof subvalue === 'number' ? (
          <span style={{ ...hds.typeStyles.caption, color: 'var(--semantic-color-content-secondary)', margin: 0 }}>
            {subvalue}
          </span>
        ) : (
          <div>{subvalue}</div>
        )
      ) : null}
    </div>
  );
}

function RawValueNode({
  value,
  title,
}: {
  value: ReactNode;
  title?: string;
}) {
  return (
    <div title={title} style={{ minWidth: 0, maxWidth: '100%' }}>
      <Token variant="node" isSelected={false}>
        {value}
      </Token>
    </div>
  );
}

function getHealthStatus(totalReferences: number) {
  if (totalReferences === 0) {
    return { label: 'Dead Wood', tone: 'warning' as const, detail: 'No consuming files found.' };
  }
  if (totalReferences >= 10) {
    return { label: 'High Blast Radius', tone: 'warning' as const, detail: 'Touches many files.' };
  }
  return { label: 'Balanced', tone: 'primary' as const, detail: 'Tight consumption footprint.' };
}

function FileChipList({ usageEntry }: { usageEntry: UsageEntry }) {
  if (usageEntry.files.length === 0) {
    return (
      <span style={{ ...hds.typeStyles.caption, color: 'var(--semantic-color-content-secondary)' }}>
        No consuming files found.
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: hds.semantic.space.subgrid.gap }}>
      {usageEntry.fileReferences.map(({ file, references }) => {
        const shortName = shortFileName(file);
        return (
          <Tag
            key={file}
            active={false}
            onClick={() => navigator.clipboard.writeText(file)}
            className="whitespace-normal"
            title={file}
            ariaLabel={`Copy path for ${shortName}`}
          >
            {shortName} Â· {references}
          </Tag>
        );
      })}
    </div>
  );
}

function CompositeSection({
  token,
  onSelectToken,
}: {
  token: FlatToken;
  onSelectToken?: (token: FlatToken) => void;
}) {
  const entries = Object.entries(token.composite ?? {});
  if (entries.length === 0) return null;

  return (
    <section>
      <p style={{ ...hds.typeStyles.body, color: 'var(--semantic-color-content-primary)', margin: 0 }}>
        Component anatomy
      </p>
      <div>
        {entries.map(([key, authoredValue]) => {
          const resolvedToken = typeof authoredValue === 'string' && authoredValue.startsWith('{')
            ? resolveAlias(authoredValue)
            : null;
          const resolvedValue = typeof authoredValue === 'string'
            ? resolveAliasCssVar(authoredValue)
            : formatTokenValue(authoredValue);

          return (
            <button
              key={key}
              type="button"
              className="hds-focus"
              onClick={resolvedToken && onSelectToken ? () => onSelectToken(resolvedToken) : undefined}
              style={{ ...tokenDetailStyles.categoryBtnBase, cursor: resolvedToken && onSelectToken ? 'pointer' : 'default' }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: hds.semantic.space.component.gap }}>
                <span style={{ ...hds.typeStyles.caption, color: 'var(--semantic-color-content-secondary)', margin: 0 }}>
                  {formatCategoryLabel(key)}
                </span>
                <span
                  style={{
                    ...hds.typeStyles.technical,
                    color: 'var(--semantic-color-content-primary)',
                    margin: 0,
                    minWidth: 0,
                    ...truncateFromStartTextStyle,
                  }}
                >
                  {resolvedValue}
                </span>
              </div>
              {resolvedToken ? (
                <span style={{ ...hds.typeStyles.caption, color: 'var(--semantic-color-content-secondary)', margin: 0 }}>
                  {resolvedToken.path}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EmptyState({ isDark }: { isDark: boolean }) {
  void isDark;
  return (
    <div>
      <Icon icon={Search} size="small" color="var(--semantic-color-content-secondary)" style={{ width: 18, height: 18, minWidth: 18, minHeight: 18 }} />
      <span className="text-secondary" style={{ ...hds.typeStyles.caption, margin: 0 }}>
        Select a token to inspect its lineage and usage.
      </span>
    </div>
  );
}

export function TokenDetail({
  token,
  isDark,
  onSelectToken,
  usageEntry,
}: {
  token: FlatToken | null;
  isDark: boolean;
  onSelectToken?: (token: FlatToken) => void;
  usageEntry?: UsageEntry | null;
}) {
  const _isNarrow = useIsMobile();

  if (!token) return <EmptyState isDark={isDark} />;

  const primitiveLeaf = findPrimitiveLeaf(token);
  const primitiveValue = primitiveLeaf ? formatTokenValue(primitiveLeaf.rawValue) : formatTokenValue(token.rawValue);
  const status = usageEntry ? getHealthStatus(usageEntry.totalReferences) : null;
  const _componentValue = usageEntry
    ? `${usageEntry.files.length} file${usageEntry.files.length === 1 ? '' : 's'}`
    : 'No consumers';
  const _componentSubvalue = usageEntry
    ? usageEntry.fileReferences[0]
      ? shortFileName(usageEntry.fileReferences[0].file)
      : `${usageEntry.totalReferences} references`
    : 'Select a token to inspect consumers.';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        data-inspector-ignore="token-detail"
        key={token.path}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}>
        <section>
          <p style={{ ...hds.typeStyles.caption, margin: 0, color: 'var(--semantic-color-content-primary)' }}>
            Active token
          </p>
          <Token
            variant="node"
            fullWidth
            tokenPath={token.path}
            swatchVar={token.type === 'color' ? token.cssVar : undefined}
            onClick={onSelectToken ? () => onSelectToken(token) : undefined}
            ariaLabel={onSelectToken ? `Select ${token.path}` : undefined}
          >
            {token.path}
          </Token>
        </section>

        <section>
          <p style={{ ...hds.typeStyles.body, color: 'var(--semantic-color-content-primary)', margin: 0 }}>
            Path of Truth
          </p>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: hds.semantic.space.component.gap, overflowX: 'auto' }}>
            <LineageStepCard
              label="Raw Value"
              value={<RawValueNode value={primitiveValue} title="Primitive resolved value" />}
            />
            <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--semantic-color-content-secondary)' }}>
              <Icon icon={ChevronRight} size="small" color="currentColor" style={{ width: 14, height: 14, minWidth: 14, minHeight: 14 }} />
            </span>
            <LineageStepCard
              label="Primitive"
              value={(
                <Token variant="node" fullWidth tokenPath={primitiveLeaf ? primitiveLeaf.path : token.path} swatchVar={primitiveLeaf?.type === 'color' ? primitiveLeaf.cssVar : undefined}>
                  {primitiveLeaf ? primitiveLeaf.path : token.path}
                </Token>
              )}
            />
            {primitiveLeaf && primitiveLeaf.path !== token.path ? (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--semantic-color-content-secondary)' }}>
                  <Icon icon={ChevronRight} size="small" color="currentColor" style={{ width: 14, height: 14, minWidth: 14, minHeight: 14 }} />
                </span>
                <LineageStepCard
                  label="Selected"
                  value={(
                    <Token variant="node" fullWidth tokenPath={token.path} swatchVar={token.type === 'color' ? token.cssVar : undefined}>
                      {token.path}
                    </Token>
                  )}
                />
              </>
            ) : null}
          </div>
        </section>

        <section>
          <div>
            <InspectorCard
              label="Total References"
              value={usageEntry ? usageEntry.totalReferences : '—'}
              subvalue={usageEntry ? `${usageEntry.files.length} file${usageEntry.files.length === 1 ? '' : 's'}` : 'No usage data'}
            />
            <InspectorCard
              label="Health Check"
              value={status?.label ?? 'No usage data'}
              tone={status?.tone ?? 'muted'}
              subvalue={status?.detail ?? 'Select a token to inspect health.'}
            />
          </div>
        </section>

        {usageEntry ? (
          <section>
            <p style={{ ...hds.typeStyles.body, color: 'var(--semantic-color-content-primary)', margin: 0 }}>
              Consumed In
            </p>
            <FileChipList usageEntry={usageEntry} />
          </section>
        ) : null}

        {token.composite ? (
          <CompositeSection token={token} onSelectToken={onSelectToken} />
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
