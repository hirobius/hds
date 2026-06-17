/* eslint-disable no-restricted-syntax */
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import Fuse from 'fuse.js';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Shuffle } from 'lucide-react';
import { IconButton } from '../../components/icon-button';
import { Icon } from '../../components/icon';
import { Stack } from '../../components/stack';
import hds from '../../design-system/tokens';
import { Input } from '../../components/input';
import { LegacyTokenList } from '../../components/lab/legacy-token-list';
import { TokenCollectionList } from '../../components/lab/token-collection-list';
import { FlatToken, Tier, allTokens, getTierCategories, getTokensByTier, formatCategoryLabel, groupByCategory, formatTokenValue, resolveTokenLiteralValue } from '../../components/lab/tokenUtils';
import { Tag } from '../../components/tag';
import { HdsSelect } from '../../components/controls';
import { DOC_LAYOUT_STICKY_OFFSET, DOC_LAYOUT_STICKY_VIEWPORT_HEIGHT } from '../../layouts/DocLayout';
import { useIsMobile } from './HdsDocPrimitives';

type ExplorerView = Tier | 'all';

const legacyExplorerStyles = {
  categoryFilterRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignContent: 'flex-start',
    gap: hds.semantic.space.subgrid.gap,
    width: '100%',
  } satisfies React.CSSProperties,
} as const;
type SearchResultToken = FlatToken & { searchText: string };
type FuseSearchResult = {
  item: SearchResultToken;
  matches?: ReadonlyArray<{ key?: string }>;
};

const VIEW_OPTIONS: Array<{ id: ExplorerView; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'primitive', label: 'Primitive' },
  { id: 'semantic', label: 'Semantic' },
  { id: 'component', label: 'Component' },
];

function getAllSections() {
  return (['primitive', 'semantic', 'component'] as Tier[]).map(tier => ({
    tier,
    label: VIEW_OPTIONS.find(option => option.id === tier)?.label ?? tier,
    categories: Object.entries(groupByCategory(getTokensByTier(tier))).map(([category, items]) => ({
      category,
      items: [...items].sort((a, b) => a.path.localeCompare(b.path)),
    })),
  }));
}

function getTokenSearchText(token: FlatToken) {
  const aliasHints = [
    token.lightAlias,
    token.darkAlias,
  ]
    .filter(Boolean)
    .map(value => String(value))
    .join(' ');

  const resolvedLight = resolveTokenLiteralValue(token.path, 'light') ?? '';
  const resolvedDark = resolveTokenLiteralValue(token.path, 'dark') ?? '';
  const rawValue = formatTokenValue(token.rawValue);

  return [
    token.path,
    token.cssVar,
    token.tier,
    token.category,
    formatCategoryLabel(token.category),
    token.type,
    token.description ?? '',
    rawValue,
    aliasHints,
    resolvedLight,
    resolvedDark,
  ].join(' ');
}

function getTokenSearchEntries(tokens: FlatToken[]): SearchResultToken[] {
  return tokens.map(token => ({
    ...token,
    searchText: getTokenSearchText(token),
  }));
}

function getSearchMatchLabel(key: string) {
  switch (key) {
    case 'path':
      return 'path';
    case 'cssVar':
      return 'CSS var';
    case 'category':
      return 'category';
    case 'tier':
      return 'tier';
    case 'type':
      return 'type';
    case 'description':
      return 'description';
    case 'searchText':
      return 'aliases / values';
    default:
      return null;
  }
}

export function LegacyTokenExplorerPanel({
  isDark,
}: {
  isDark: boolean;
}) {
  const isMobile = useIsMobile();
  const libraryListShellStyle = isMobile
    ? {
        maxHeight: 'clamp(22rem, 50vh, 28rem)',
        overflowY: 'auto' as const,
      }
    : {
        position: 'sticky' as const,
        top: DOC_LAYOUT_STICKY_OFFSET,
        maxHeight: DOC_LAYOUT_STICKY_VIEWPORT_HEIGHT,
        overflowY: 'auto' as const,
      };
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeView, setActiveView] = useState<ExplorerView>('semantic');
  const [selectedToken, setSelectedToken] = useState<FlatToken | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const tierParam = searchParams.get('tier');
  const categoryParam = searchParams.get('category');

  const activeTier: Tier = activeView === 'all' ? 'semantic' : activeView;
  const tierTokens = getTokensByTier(activeTier);
  const allSections = useMemo(() => getAllSections(), []);
  const allSearchEntries = useMemo(() => getTokenSearchEntries(allTokens), []);
  const tokenFuse = useMemo(
    () =>
      new Fuse(allSearchEntries, {
        includeMatches: true,
        threshold: 0.32,
        ignoreLocation: true,
        minMatchCharLength: 1,
        keys: ['path', 'cssVar', 'category', 'tier', 'type', 'description', 'searchText'],
      }),
    [allSearchEntries],
  );
  const fuzzyResults = useMemo<FuseSearchResult[]>(() => {
    if (!deferredSearchQuery) return [];
    return tokenFuse.search(deferredSearchQuery) as unknown as FuseSearchResult[];
  }, [deferredSearchQuery, tokenFuse]);
  const fuzzyMatches = useMemo(() => {
    if (!deferredSearchQuery) return null;
    return fuzzyResults.map(result => result.item.path);
  }, [deferredSearchQuery, fuzzyResults]);
  const searchWhy = useMemo(() => {
    if (!deferredSearchQuery || fuzzyResults.length === 0) return [];
    const reasons = new Set<string>();
    for (const result of fuzzyResults.slice(0, 8)) {
      for (const match of result.matches ?? []) {
        const label = getSearchMatchLabel(String(match.key ?? ''));
        if (label) reasons.add(label);
      }
    }
    return [...reasons].slice(0, 4);
  }, [deferredSearchQuery, fuzzyResults]);
  const filteredAllSections = useMemo(() => {
    if (!fuzzyMatches) return allSections;
    return allSections
      .map(section => ({
        ...section,
        categories: section.categories
          .map(category => ({
            ...category,
            items: category.items.filter(t => fuzzyMatches.includes(t.path)),
          }))
          .filter(category => category.items.length > 0),
      }))
      .filter(section => section.categories.length > 0);
  }, [allSections, fuzzyMatches]);
  const allViewSections = useMemo(() => filteredAllSections.map(section => ({
    key: section.tier,
    label: section.label,
    groups: section.categories.map(category => ({
      key: `${section.tier}-${category.category}`,
      label: formatCategoryLabel(category.category),
      items: category.items,
    })),
  })), [filteredAllSections]);

  const categories = useMemo(
    () => getTierCategories(activeTier),
    [activeTier],
  );
  const filteredTokens = useMemo(() => {
    let tokens = tierTokens;
    if (activeCategory) tokens = tokens.filter(t => t.category === activeCategory);
    if (fuzzyMatches) {
      const matched = new Set(fuzzyMatches);
      tokens = tokens.filter(t => matched.has(t.path));
    }
    return tokens;
  }, [tierTokens, activeCategory, fuzzyMatches]);
  const visibleTokens = useMemo(() => {
    if (filteredTokens.length > 0) return filteredTokens;
    if (!selectedToken || activeView === 'all') return filteredTokens;
    if (selectedToken.tier !== activeTier) return filteredTokens;
    return [selectedToken];
  }, [filteredTokens, selectedToken, activeView, activeTier]);

  const deepLinkPath = searchParams.get('token');

  useEffect(() => {
    if (!deepLinkPath) return;
    const match = allTokens.find(t => t.path === deepLinkPath);
    if (!match) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveView(match.tier);
    setSelectedToken(match);
  }, [deepLinkPath]);

  useEffect(() => {
    if (!tierParam && !categoryParam) return;
    if (tierParam === 'primitive' || tierParam === 'semantic' || tierParam === 'component') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveView(tierParam);
    }
    setActiveCategory(categoryParam);
  }, [tierParam, categoryParam]);

  useEffect(() => {
    if (deepLinkPath) return;
    if (activeView === 'all') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveCategory(null);
  }, [activeView, deepLinkPath]);

  useEffect(() => {
    if (deepLinkPath) return;
    if (activeView === 'all') return;
    const pool = selectedToken === null ? tierTokens : visibleTokens;
    // 12v-permanent-fix: Use pool[0] (deterministic) for the initial auto-selection
    // instead of Math.random(). Random initial selection caused VRT snapshot drift at
    // TV viewport (1920×1080) where the Details panel description is visible in frame.
    // The shuffle button (handleShuffle) still uses Math.random() for interactive use.
    const nextToken = visibleTokens.find(t => t.path === selectedToken?.path)
      ?? pool[0]
      ?? null;

    if (nextToken && nextToken.path !== selectedToken?.path) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedToken(nextToken);
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('token', nextToken.path);
        return next;
      }, { replace: true, preventScrollReset: true });
    }
  // selectedToken?.path used intentionally (not the full object) to avoid extra rerenders.
  // setSearchParams from react-router is stable and excluded by convention.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTokens, tierTokens, deepLinkPath, selectedToken?.path, activeView]);

  function handleSelectToken(token: FlatToken) {
    setSearchQuery('');
    setActiveView(token.tier);
    setActiveCategory(token.category);
    setSelectedToken(token);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('token', token.path);
      return next;
    }, { replace: true, preventScrollReset: true });
  }

  function handleShuffle() {
    const token = allTokens[Math.floor(Math.random() * allTokens.length)];
    if (token) handleSelectToken(token);
  }

  function handleChangeView(value: ExplorerView) {
    setActiveView(value);
    if (value === 'all') {
      setActiveCategory(null);
      return;
    }
    setSearchQuery('');
  }

  const controlRail = (
    <Stack gap="gap" style={{ width: '100%', minWidth: 0 }}>
      <div>
        <h2 style={{ ...hds.typeStyles.heading3, margin: 0, marginBottom: hds.semantic.space.layout.gap, color: 'var(--semantic-color-content-primary)' }}>
          Library
        </h2>
        <HdsSelect
          label="Token view"
          showLabel={false}
          options={VIEW_OPTIONS.map(option => ({
            value: option.id,
            label: option.label,
          }))}
          value={activeView}
          onChange={value => handleChangeView(value as ExplorerView)}
        />
      </div>
      <div style={{ display: 'flex', gap: hds.semantic.space.subgrid.gap, alignItems: 'flex-start', width: '100%', maxWidth: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input
            type="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder={activeView === 'all' ? 'Search all tokens...' : `Search ${activeView} tokens...`}
            aria-label="Search tokens"
            leadingVisual={<Icon icon={Search} size={12} color="currentColor" />}
            helperText={deferredSearchQuery ? `Why this matched: ${searchWhy.length > 0 ? searchWhy.join(', ') : 'path and token metadata'}` : undefined}
            style={{ width: '100%', maxWidth: '100%' }}
          />
        </div>
        <IconButton
          icon={Shuffle}
          size="sm"
          variant="secondary"
          label="Jump to random token"
          onClick={handleShuffle}
        />
      </div>
    </Stack>
  );

  return (
    <div data-inspector-ignore="token-explorer">
      <Stack gap="normal">
        <div style={{ display: 'grid', gap: hds.semantic.space.component.gap, minWidth: 0 }}>
          {controlRail}

          {activeView !== 'all' && categories.length > 1 && (
            <div
              style={{ ...legacyExplorerStyles.categoryFilterRow, marginTop: hds.semantic.space.component.gap }}
            >
              {['all', ...categories].map(cat => (
                <Tag
                  key={cat}
                  active={cat === 'all' ? activeCategory === null : activeCategory === cat}
                  onClick={() => {
                    if (cat === 'all') {
                      setActiveCategory(null);
                      return;
                    }
                    setActiveCategory(cat === activeCategory ? null : cat);
                  }}
                >
                  {cat === 'all' ? 'All' : formatCategoryLabel(cat)}
                </Tag>
              ))}
            </div>
          )}
        </div>

        <div
          className={!isMobile ? 'hds-scrollbar' : undefined}
          style={{
            ...libraryListShellStyle,
            minWidth: 0,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div
            style={{
              minWidth: 0,
              order: isMobile ? 1 : 2,
              display: 'grid',
            }}
          >
            <div
              style={{
                minHeight: 0,
                minWidth: 0,
                paddingTop: 0,
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${activeView}-${activeCategory ?? 'all'}-${deferredSearchQuery || 'default'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {activeView === 'all' ? (
                    filteredAllSections.length === 0 ? (
                      <p style={{ ...hds.typeStyles.body, color: 'var(--semantic-color-content-secondary)', margin: 0 }}>
                        No tokens match this search.
                      </p>
                    ) : (
                      <TokenCollectionList
                        sections={allViewSections}
                        selectedPath={selectedToken?.path ?? null}
                        onSelect={handleSelectToken}
                      />
                    )
                  ) : visibleTokens.length === 0 ? (
                    <p style={{ ...hds.typeStyles.body, color: 'var(--semantic-color-content-secondary)', padding: `${hds.semantic.space.layout.gutter} 0`, margin: 0 }}>
                      No tokens in this view.
                    </p>
                  ) : (
                    <LegacyTokenList
                      tier={activeTier}
                      tokens={visibleTokens}
                      selectedPath={selectedToken?.path ?? null}
                      onSelect={handleSelectToken}
                      isDark={isDark}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Stack>
    </div>
  );
}
