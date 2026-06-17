/**
 * TokenCollectionList - grouped token inventory list for lab and explorer maintenance.
 * @category Lab
 * @tier experiment
 *
 * @deprecated 2026-05-01 (10d-11): superseded by the headless scan
 *   architecture per TASKS.md "Stale / Superseded" → "Live token
 *   inspector UI". Pruning deferred until /hds/tokens is retired or
 *   rewritten — see docs/archive/work/2026-05-01-token-explorer-prune-deferred.md.
 */
// motion-ok: token row interaction feedback is owned by the nested Token nodes, while the collection wrapper remains a static organizational scaffold
import hds from '../../design-system/tokens';
import { Stack } from '../stack';
import { Token } from '../token';
import { FlatToken } from './tokenUtils';

const collectionListStyles = {
  headerBase: {
    ...hds.typeStyles.ui,
    color: 'var(--semantic-color-content-primary)',
    minHeight: hds.size[40],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: hds.semantic.space.subgrid.gap,
    paddingTop: hds.semantic.space.subgrid.gap,
    paddingBottom: hds.semantic.space.subgrid.gap,
  } satisfies React.CSSProperties,
} as const;

interface TokenCollectionGroup {
  key: string;
  label?: string;
  items: FlatToken[];
  showCount?: boolean;
}

interface TokenCollectionSection {
  key: string;
  label: string;
  items?: FlatToken[];
  groups?: TokenCollectionGroup[];
}

interface Props {
  sections: TokenCollectionSection[];
  selectedPath: string | null;
  onSelect: (token: FlatToken) => void;
}

function GroupItems({
  items,
  selectedPath,
  onSelect,
}: {
  items: FlatToken[];
  selectedPath: string | null;
  onSelect: (token: FlatToken) => void;
}) {
  return (
    <Stack gap="xs">
      {items.map(tok => {
        const isSelected = tok.path === selectedPath;
        return (
          <Stack
            key={tok.path}
            align="start"
            gap="xs"
            style={{ width: '100%', minWidth: 0 }}
          >
            <Token
              variant="node"
              isSelected={isSelected}
              onClick={() => onSelect(tok)}
              swatchVar={tok.type === 'color' ? tok.cssVar : undefined}
              pathDisplayMode="compressed"
              pathDisplayDepth={3}
              truncateFromStart
            >
              {tok.path}
            </Token>
          </Stack>
        );
      })}
    </Stack>
  );
}

function CollectionHeader({
  label,
  count,
  sticky = false,
}: {
  label: string;
  count?: number;
  sticky?: boolean;
}) {
  return (
    <div
      style={{ ...collectionListStyles.headerBase, position: sticky ? 'sticky' : 'relative', top: sticky ? 0 : undefined, background: sticky ? 'var(--semantic-color-surface-page)' : undefined, zIndex: sticky ? hds.zIndex.focus : undefined }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: hds.semantic.space.subgrid.gap }}>
        <span>{label}</span>
        {typeof count === 'number' ? (
          <span style={{ ...hds.typeStyles.caption, color: 'var(--semantic-color-content-secondary)', lineHeight: 'var(--semantic-typography-lineHeight-none)' }}>
            {count}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function TokenCollectionList({ sections, selectedPath, onSelect }: Props) {
  return (
    <Stack gap="tight">
      {sections.map(section => (
        <Stack key={section.key} gap="xs">
          <CollectionHeader sticky label={section.label} count={section.groups ? section.groups.length : section.items?.length} />
          {section.groups ? (
            <Stack gap="xs">
              {section.groups.map(group => (
                <Stack key={group.key} gap="xs">
                  {group.label ? <CollectionHeader sticky label={group.label} count={group.showCount ? group.items.length : undefined} /> : null}
                  <GroupItems items={group.items} selectedPath={selectedPath} onSelect={onSelect} />
                </Stack>
              ))}
            </Stack>
          ) : (
            <GroupItems items={section.items ?? []} selectedPath={selectedPath} onSelect={onSelect} />
          )}
        </Stack>
      ))}
    </Stack>
  );
}
