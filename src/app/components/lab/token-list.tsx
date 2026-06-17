/**
 * @tier experiment
 */
// @doc-exempt: internal lab token rail, used by live explorer plumbing rather than docs surfaces.
/**
 * TokenList - searchable token rail for interactive lab-side token inspection.
 * @category Lab
 *
 * @deprecated 2026-05-01 (10d-11): superseded by the headless scan
 *   architecture per TASKS.md "Stale / Superseded" → "Live token
 *   inspector UI". Pruning deferred until /hds/tokens is retired or
 *   rewritten — see docs/archive/work/2026-05-01-token-explorer-prune-deferred.md.
 */
import hds from '../../design-system/tokens';
import { Surface } from '../surface';
import { FlatToken, formatCategoryLabel, formatTokenValue, groupByCategory, resolveTokenLiteralValue } from './tokenUtils';

const tokenListStyles = {
  valueBadge: {
    ...hds.typeStyles.caption,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: hds.size[24],
    minHeight: hds.size[24],
    paddingInline: hds.semantic.space.subgrid.gap,
    border: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
    borderRadius: hds.borderRadius[4],
    background: 'var(--semantic-color-surface-raised)',
    color: 'var(--semantic-color-content-secondary)',
    lineHeight: 1,
    whiteSpace: 'nowrap' as const,
  } satisfies React.CSSProperties,
  tokenRowBtnBase: {
    width: '100%',
    display: 'grid',
    gap: hds.semantic.space.subgrid.gap,
    padding: hds.semantic.space.component.gap,
    borderRadius: hds.borderRadius[8],
    textAlign: 'left' as const,
    cursor: 'pointer',
  } satisfies React.CSSProperties,
  descriptionValue: {
    ...hds.typeStyles.caption,
    color: 'var(--semantic-color-content-secondary)',
    margin: 0,
    textAlign: 'right' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: '55%',
  } satisfies React.CSSProperties,
} as const;

interface Props {
  tokens: FlatToken[];
  selectedPath: string | null;
  onSelect: (token: FlatToken) => void;
}

const truncateFromStartTextStyle = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  direction: 'rtl' as const,
  textAlign: 'left' as const,
};

function TokenBadge({ token }: { token: FlatToken }) {
  if (token.type === 'color') {
    return (
      <span
        aria-hidden="true" />
    );
  }

  const literalValue = resolveTokenLiteralValue(token.rawValue);
  const badgeValue = typeof literalValue === 'string' && /[0-9]/.test(literalValue) ? literalValue : null;

  if (!badgeValue) return null;

  return (
    <span
      aria-hidden="true"
      style={tokenListStyles.valueBadge}
    >
      {badgeValue}
    </span>
  );
}

function TokenRow({
  token,
  isSelected,
  onSelect,
}: {
  token: FlatToken;
  isSelected: boolean;
  onSelect: (token: FlatToken) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(token)}
      aria-pressed={isSelected}
      className="hds-focus"
      style={{ ...tokenListStyles.tokenRowBtnBase, border: `${hds.borderWidth.default} solid ${isSelected ? 'var(--semantic-color-border-accent)' : 'var(--semantic-color-border-default)'}`, background: isSelected ? 'var(--semantic-color-surface-raised)' : 'var(--semantic-color-surface-page)', transition: `background ${hds.motion.productive.duration}s ${hds.motion.productive.easing}, border-color ${hds.motion.productive.duration}s ${hds.motion.productive.easing}` }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: hds.semantic.space.component.gap, minWidth: 0 }}>
        <TokenBadge token={token} />
        <div>
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
            {token.path}
          </span>
          <span
            style={{
              ...hds.typeStyles.technical,
              color: 'var(--semantic-color-content-secondary)',
              margin: 0,
              display: 'block',
              minWidth: 0,
              ...truncateFromStartTextStyle,
            }}
          >
            {token.cssVar}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: hds.semantic.space.subgrid.gap }}>
        <span style={{ ...hds.typeStyles.caption, color: 'var(--semantic-color-content-secondary)', margin: 0 }}>
          {formatCategoryLabel(token.category)}
        </span>
        <span
          style={tokenListStyles.descriptionValue}
        >
          {typeof token.description === 'string' ? token.description : formatTokenValue(token.rawValue)}
        </span>
      </div>
    </button>
  );
}

export function TokenList({ tokens, selectedPath, onSelect }: Props) {
  const groups = groupByCategory(tokens);

  if (tokens.length === 0) {
    return (
      <div
        style={{
          padding: hds.semantic.space.layout.gap,
          border: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
          borderRadius: hds.borderRadius[8],
          background: 'var(--semantic-color-surface-raised)',
        }}
      >
        <p style={{ ...hds.typeStyles.caption, color: 'var(--semantic-color-content-secondary)', margin: 0 }}>
          No tokens match this filter.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: hds.semantic.space.sidebar.sectionGap }}>
      {Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([group, items]) => (
          <section
            key={group}>
            <Surface padding="component" style={{position: 'sticky',
                top: 0,
                zIndex: hds.zIndex.focus,
                display: 'flex',
                alignItems: 'center',
                minHeight: hds.size[16],
                
                background: 'var(--semantic-color-surface-page)',}}>
              <span style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-secondary)', margin: 0 }}>
                {formatCategoryLabel(group)}
              </span>
            </Surface>

            <div>
              {items
                .slice()
                .sort((a, b) => a.path.localeCompare(b.path))
                .map(token => (
                  <TokenRow
                    key={token.path}
                    token={token}
                    isSelected={token.path === selectedPath}
                    onSelect={onSelect}
                  />
                ))}
            </div>
          </section>
        ))}
    </div>
  );
}
