/* hds-bypass: internal health dashboard — executive summary page for the HDS build system, not a public user-facing doc page. Inline typography used for table readouts and status indicators. */

import type { CSSProperties } from 'react';
import rawManifest from 'virtual:hds-manifest';
import hds from '../../design-system/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComponentSpec {
  category: string;
  docExempt?: boolean;
  hidden?: boolean;
  tokenMapping?: Record<string, string>;
  a11yRules?: { rule: string; required: boolean }[];
  figmaUrl?: string | null;
  figmaId?: string | null;
}

interface FidelityIncomplete {
  name: string;
  category: string;
  hasPageEntry: boolean;
  hasPreview: boolean;
  hasDocumentedProp: boolean;
  usesTokens: boolean;
  hasTokenTable: boolean;
  missing: string[];
  complete: boolean;
}

interface HdsManifestShape {
  componentSpecs: Record<string, ComponentSpec>;
  health: {
    generatedAt: string;
    fidelity: {
      grade: string;
      complete: number;
      total: number;
      percent: number;
      incomplete: FidelityIncomplete[];
    };
  };
}

// Cast: virtual:hds-manifest is typed as `unknown` — shape is stable from manifest generator.
const manifest = rawManifest as HdsManifestShape;

interface ComponentHealthRow {
  name: string;
  category: string;
  tokenCount: number;
  a11yCount: number;
  hasFigma: boolean;
  docExempt: boolean;
  // from fidelity check (null = not tracked in fidelity audit)
  hasPageEntry: boolean | null;
  usesTokens: boolean | null;
  hasTokenTable: boolean | null;
  hasDocumentedProp: boolean | null;
  missingItems: string[];
  fidelityIssue: boolean; // true = explicitly flagged as incomplete
}

// ─── Derive health data from manifest at render time ─────────────────────────

function buildHealthRows(): ComponentHealthRow[] {
  const specs = manifest.componentSpecs as Record<string, ComponentSpec>;
  const fidelityIncomplete: FidelityIncomplete[] =
    manifest.health.fidelity.incomplete as FidelityIncomplete[];

  const incompleteMap = new Map<string, FidelityIncomplete>(
    fidelityIncomplete.map((item) => [item.name, item])
  );

  return Object.entries(specs)
    .filter(([, spec]) => !spec.hidden)
    .map(([name, spec]): ComponentHealthRow => {
      const inc = incompleteMap.get(name);
      return {
        name,
        category: spec.category ?? 'Uncategorized',
        tokenCount: Object.keys(spec.tokenMapping ?? {}).length,
        a11yCount: (spec.a11yRules ?? []).length,
        hasFigma: !!(spec.figmaUrl || spec.figmaId),
        docExempt: spec.docExempt ?? false,
        hasPageEntry: inc ? inc.hasPageEntry : null,
        usesTokens: inc ? inc.usesTokens : null,
        hasTokenTable: inc ? inc.hasTokenTable : null,
        hasDocumentedProp: inc ? inc.hasDocumentedProp : null,
        missingItems: inc ? inc.missing : [],
        fidelityIssue: inc !== undefined,
      };
    })
    .sort((a, b) => {
      // Sort by category then name
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });
}

// ─── Summary stats ────────────────────────────────────────────────────────────

function computeSummary(rows: ComponentHealthRow[]) {
  const total = rows.length;
  const withTokens = rows.filter((r) => r.tokenCount > 0).length;
  const withA11y = rows.filter((r) => r.a11yCount > 0).length;
  const withFigma = rows.filter((r) => r.hasFigma).length;
  const docExempt = rows.filter((r) => r.docExempt).length;
  const fidelityIssues = rows.filter((r) => r.fidelityIssue).length;

  return { total, withTokens, withA11y, withFigma, docExempt, fidelityIssues };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComponentHealthPage() {
  const rows = buildHealthRows();
  const summary = computeSummary(rows);
  const { fidelity } = manifest.health;

  const generatedAt = new Date(manifest.health.generatedAt);
  const generatedLabel = generatedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={styles.page}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <h1 style={typog.display}>Component Health</h1>
        <p style={typog.body}>
          Per-component executive summary — token coverage, a11y rules, Figma
          parity, and documentation status. Data derived entirely from{' '}
          <code style={typog.code}>public/hds-manifest.json</code> at build time.
        </p>
        <p style={typog.caption}>Last manifest scan: {generatedLabel}</p>
      </div>

      {/* ── Summary band ───────────────────────────────────────────────── */}
      <div style={styles.summaryBand}>
        <SummaryCell label="Total components" value={String(summary.total)} />
        <SummaryCell
          label="Token mappings"
          value={`${summary.withTokens} / ${summary.total}`}
          pct={summary.withTokens / summary.total}
        />
        <SummaryCell
          label="A11y rules"
          value={`${summary.withA11y} / ${summary.total}`}
          pct={summary.withA11y / summary.total}
        />
        <SummaryCell
          label="Figma linked"
          value={`${summary.withFigma} / ${summary.total}`}
          pct={summary.withFigma / summary.total}
        />
        <SummaryCell
          label="Fidelity grade"
          value={fidelity.grade}
          sub={`${fidelity.percent}% complete`}
        />
        <SummaryCell
          label="Fidelity issues"
          value={String(summary.fidelityIssues)}
          highlight={summary.fidelityIssues > 0 ? 'warn' : 'pass'}
        />
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <Th>Component</Th>
              <Th>Category</Th>
              <Th title="Number of token mappings in manifest">Tokens</Th>
              <Th title="Number of a11y rules defined in manifest">A11y</Th>
              <Th title="Figma component URL or ID present">Figma</Th>
              <Th title="Has a doc page entry in the HDS site">Doc page</Th>
              <Th title="Has documented props in the doc page">Props</Th>
              <Th title="Has a token table in the doc page">Token table</Th>
              <Th title="Missing items from fidelity audit">Issues</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <HealthRow key={row.name} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div style={styles.legend}>
        <span style={typog.caption}>Legend: </span>
        <LegendItem symbol={ICON.pass} label="Yes / present" />
        <LegendItem symbol={ICON.fail} label="No / missing" />
        <LegendItem symbol={ICON.exempt} label="Doc-exempt (internal)" />
        <LegendItem symbol={ICON.unknown} label="Not in fidelity audit" />
        <LegendItem symbol={ICON.figma} label="Figma linked" />
      </div>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function HealthRow({ row }: { row: ComponentHealthRow }) {
  const rowStyle: CSSProperties = row.fidelityIssue
    ? { ...styles.tr, background: 'var(--semantic-color-feedback-bg-warning)' }
    : styles.tr;

  return (
    <tr style={rowStyle}>
      <td style={{ ...styles.td, ...typog.mono }}>{row.name}</td>
      <td style={styles.td}>
        <CategoryTag category={row.category} />
      </td>
      <td style={{ ...styles.td, textAlign: 'center' }}>
        {row.tokenCount > 0 ? (
          <span style={styles.tokenCount}>{row.tokenCount}</span>
        ) : (
          <span style={typog.dim}>—</span>
        )}
      </td>
      <td style={{ ...styles.td, textAlign: 'center' }}>
        {row.a11yCount > 0 ? (
          <span style={styles.a11yCount}>{row.a11yCount}</span>
        ) : (
          <span style={typog.dim}>—</span>
        )}
      </td>
      <td style={{ ...styles.td, textAlign: 'center' }}>
        {row.hasFigma ? ICON.figma : <span style={typog.dim}>—</span>}
      </td>
      <td style={{ ...styles.td, textAlign: 'center' }}>
        <FidelityCell value={row.hasPageEntry} exemptIfNull={row.docExempt} />
      </td>
      <td style={{ ...styles.td, textAlign: 'center' }}>
        <FidelityCell value={row.hasDocumentedProp} exemptIfNull={row.docExempt} />
      </td>
      <td style={{ ...styles.td, textAlign: 'center' }}>
        <FidelityCell value={row.hasTokenTable} exemptIfNull={row.docExempt} />
      </td>
      <td style={{ ...styles.td }}>
        {row.missingItems.length > 0 ? (
          <span style={typog.missing}>{row.missingItems.join(', ')}</span>
        ) : row.fidelityIssue ? (
          <span style={typog.dim}>—</span>
        ) : (
          <span style={typog.pass}>{row.docExempt ? ICON.exempt : ICON.pass}</span>
        )}
      </td>
    </tr>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function Th({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <th style={styles.th} title={title}>
      {children}
    </th>
  );
}

function FidelityCell({
  value,
  exemptIfNull,
}: {
  value: boolean | null;
  exemptIfNull: boolean;
}) {
  if (value === true) return <span style={typog.pass}>{ICON.pass}</span>;
  if (value === false) return <span style={typog.fail}>{ICON.fail}</span>;
  if (exemptIfNull) return <span title="Doc-exempt">{ICON.exempt}</span>;
  return <span style={typog.dim}>{ICON.unknown}</span>;
}

function CategoryTag({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;
  return (
    <span
      style={{
        ...styles.categoryTag,
        background: color.bg,
        color: color.fg,
      }}
    >
      {category}
    </span>
  );
}

function SummaryCell({
  label,
  value,
  pct,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  pct?: number;
  sub?: string;
  highlight?: 'pass' | 'warn' | 'fail';
}) {
  const valueStyle: CSSProperties =
    highlight === 'pass'
      ? { ...typog.summaryValue, color: 'var(--semantic-color-feedback-success)' }
      : highlight === 'warn'
        ? { ...typog.summaryValue, color: 'var(--semantic-color-feedback-warning)' }
        : highlight === 'fail'
          ? { ...typog.summaryValue, color: 'var(--semantic-color-feedback-error)' }
          : typog.summaryValue;

  return (
    <div style={styles.summaryCell}>
      <p style={typog.summaryLabel}>{label}</p>
      <p style={valueStyle}>{value}</p>
      {sub && <p style={typog.summaryMeta}>{sub}</p>}
      {pct !== undefined && (
        <div style={styles.miniBar}>
          <div
            style={{
              ...styles.miniBarFill,
              width: `${Math.round(pct * 100)}%`,
              background:
                pct >= 0.8
                  ? 'var(--semantic-color-feedback-success)'
                  : pct >= 0.5
                    ? 'var(--semantic-color-feedback-warning)'
                    : 'var(--semantic-color-feedback-error)',
            }}
          />
        </div>
      )}
    </div>
  );
}

function LegendItem({ symbol, label }: { symbol: string; label: string }) {
  return (
    <span style={styles.legendItem}>
      <span>{symbol}</span>
      <span style={typog.caption}>{label}</span>
    </span>
  );
}

// ─── Icons / constants ────────────────────────────────────────────────────────

const ICON = {
  pass: '✓',
  fail: '✗',
  exempt: '○',
  unknown: '·',
  figma: '◈',
} as const;

// Category color system — uses feedback/surface tokens
const CATEGORY_COLORS = {
  Actions: {
    bg: 'var(--semantic-color-feedback-bg-info)',
    fg: 'var(--semantic-color-feedback-info)',
  },
  Display: {
    bg: 'color-mix(in srgb, var(--semantic-accent-rest) 12%, transparent)',
    fg: 'var(--semantic-accent-rest)',
  },
  Feedback: {
    bg: 'var(--semantic-color-feedback-bg-warning)',
    fg: 'var(--semantic-color-feedback-warning)',
  },
  Inputs: {
    bg: 'var(--semantic-color-feedback-bg-success)',
    fg: 'var(--semantic-color-feedback-success)',
  },
  Layout: {
    bg: 'color-mix(in srgb, var(--semantic-color-content-secondary) 12%, transparent)',
    fg: 'var(--semantic-color-content-secondary)',
  },
  Navigation: {
    bg: 'color-mix(in srgb, var(--semantic-color-feedback-info) 15%, transparent)',
    fg: 'var(--semantic-color-feedback-info)',
  },
  Overlays: {
    bg: 'color-mix(in srgb, var(--semantic-color-feedback-error) 10%, transparent)',
    fg: 'var(--semantic-color-feedback-error)',
  },
  Uncategorized: {
    bg: 'var(--semantic-color-surface-raised)',
    fg: 'var(--semantic-color-content-secondary)',
  },
  Branding: {
    bg: 'color-mix(in srgb, var(--semantic-accent-rest) 8%, transparent)',
    fg: 'var(--semantic-accent-rest)',
  },
  Utilities: {
    bg: 'var(--semantic-color-surface-raised)',
    fg: 'var(--semantic-color-content-tertiary)',
  },
  default: {
    bg: 'var(--semantic-color-surface-raised)',
    fg: 'var(--semantic-color-content-secondary)',
  },
} satisfies Record<string, { bg: string; fg: string }>;

// ─── Typography ───────────────────────────────────────────────────────────────

const typog = {
  display: {
    fontSize: '36px',
    lineHeight: '1.25',

    margin: 0,
    color: 'var(--semantic-color-content-primary)',
  },
  body: {
    fontSize: '16px',
    lineHeight: '1.5',

    margin: 0,
    color: 'var(--semantic-color-content-secondary)',
  },
  caption: {
    fontSize: '12px',
    lineHeight: '1.5',

    margin: 0,
    color: 'var(--semantic-color-content-tertiary)',
  },
  code: {
    fontSize: '12px',
    lineHeight: '1.0',
    fontFamily: 'monospace', // font-ok: code file path label — intentional monospace for path readout
    color: 'var(--semantic-color-content-secondary)',
  },
  mono: {
    fontSize: '12px',
    lineHeight: '1.4',
    fontFamily: 'monospace', // font-ok: component name in health table — monospace for aligned tabular readout
    color: 'var(--semantic-color-content-primary)',
  },
  th: {
    ...hds.typeStyles.eyebrow,
    fontSize: '11px',
    lineHeight: '1.4',
    margin: 0,
    color: 'var(--semantic-color-content-secondary)',
  },
  dim: {
    fontSize: '12px',
    color: 'var(--semantic-color-content-tertiary)',
  },
  pass: {
    fontSize: '13px',
    color: 'var(--semantic-color-feedback-success)',

  },
  fail: {
    fontSize: '13px',
    color: 'var(--semantic-color-feedback-error)',

  },
  missing: {
    fontSize: '11px',
    color: 'var(--semantic-color-feedback-warning)',
    fontStyle: 'italic',
  },
  summaryLabel: {
    ...hds.typeStyles.eyebrow,
    fontSize: '11px',
    lineHeight: '1.4',
    margin: 0,
    color: 'var(--semantic-color-content-tertiary)',
  },
  summaryValue: {
    fontSize: '24px',
    lineHeight: '1.2',

    margin: 0,
    color: 'var(--semantic-color-content-primary)',
  },
  summaryMeta: {
    fontSize: '11px',
    lineHeight: '1.4',
    margin: 0,
    color: 'var(--semantic-color-content-tertiary)',
  },
} satisfies Record<string, CSSProperties>;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    padding: 'var(--semantic-space-layout-inset)',
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--semantic-space-section-stack)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--semantic-space-component-gap)',
  },
  summaryBand: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 'var(--semantic-space-component-gap)',
    padding: 'var(--semantic-space-component-padding)',
    background: 'var(--semantic-color-surface-raised)',
    borderRadius: 'var(--semantic-radius-action)',
    border: '1px solid var(--semantic-color-border-subtle)',
  },
  summaryCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px', // spacing-ok: internal health table tight row, 4px = subgrid hairline
    padding: 'var(--semantic-space-component-gap)',
  },
  miniBar: {
    height: '3px',
    background: 'var(--semantic-color-border-subtle)',
    borderRadius: hds.borderRadius[2],
    overflow: 'hidden',
    marginTop: '4px', // spacing-ok: internal health table tight row, 4px = subgrid hairline
  },
  miniBarFill: {
    height: '100%',
    borderRadius: hds.borderRadius[2],
    transition: `width ${hds.duration.normal} ease`,
  },
  tableWrap: {
    overflowX: 'auto',
    borderRadius: 'var(--semantic-radius-action)',
    border: '1px solid var(--semantic-color-border-subtle)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
    background: 'var(--semantic-color-surface-page)',
  },
  th: {
    ...typog.th,
    padding: '10px 12px',
    textAlign: 'left' as const,
    background: 'var(--semantic-color-surface-raised)',
    borderBottom: '1px solid var(--semantic-color-border-subtle)',
    whiteSpace: 'nowrap' as const,
  },
  tr: {
    borderBottom: '1px solid var(--semantic-color-border-subtle)',
  },
  td: {
    padding: '8px 12px',
    verticalAlign: 'middle' as const,
    color: 'var(--semantic-color-content-primary)',
  },
  categoryTag: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: hds.borderRadius[2],
    fontSize: '11px',

    whiteSpace: 'nowrap' as const,
  },
  tokenCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    height: '20px',
    borderRadius: 'var(--primitive-radius-full)', // tier-ok: pill-shape count badge — full radius scales with the 20px height
    background: 'color-mix(in srgb, var(--semantic-accent-rest) 15%, transparent)',
    color: 'var(--semantic-accent-rest)',
    fontSize: '11px',

    padding: '0 6px',
  },
  a11yCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    height: '20px',
    borderRadius: 'var(--primitive-radius-full)', // tier-ok: pill-shape count badge — full radius scales with the 20px height
    background: 'var(--semantic-color-feedback-bg-success)',
    color: 'var(--semantic-color-feedback-success)',
    fontSize: '11px',

    padding: '0 6px',
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--semantic-space-component-gap)',
    alignItems: 'center',
    padding: 'var(--semantic-space-component-gap)',
    borderTop: '1px solid var(--semantic-color-border-subtle)',
  },
  legendItem: {
    display: 'inline-flex',
    gap: '4px', // spacing-ok: legend pip + label tight pairing, 4px = subgrid hairline
    alignItems: 'center',
    fontSize: '12px',
    color: 'var(--semantic-color-content-secondary)',
  },
} satisfies Record<string, CSSProperties>;
