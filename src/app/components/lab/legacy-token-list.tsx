/**
 * LegacyTokenList - legacy token grouping list retained for lab-side maintenance workflows.
 * @category Lab
 * @tier experiment
 *
 * @deprecated 2026-05-01 (10d-11): superseded by the headless scan
 *   architecture per TASKS.md "Stale / Superseded" → "Live token
 *   inspector UI". Pruning deferred until /hds/tokens is retired or
 *   rewritten — see docs/archive/work/2026-05-01-token-explorer-prune-deferred.md.
 */
// motion-ok: list wrapper - all interactive rows render as Token (motion.button with whileTap)
import { FlatToken, Tier, groupByCategory, formatCategoryLabel } from './tokenUtils';
import { TokenCollectionList } from './token-collection-list';

interface Props {
  tier: Tier;
  tokens: FlatToken[];
  selectedPath: string | null;
  onSelect: (token: FlatToken) => void;
  isDark: boolean;
}

export function LegacyTokenList({ tokens, selectedPath, onSelect }: Props) {
  const groups = groupByCategory(tokens);

  const sections = Object.entries(groups).map(([group, items]) => ({
    key: group,
    label: formatCategoryLabel(group),
    items: [...items].sort((a, b) => a.path.localeCompare(b.path)),
  }));

  return (
    <TokenCollectionList
      sections={sections}
      selectedPath={selectedPath}
      onSelect={onSelect}
    />
  );
}
