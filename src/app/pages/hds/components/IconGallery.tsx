/* eslint-disable no-restricted-syntax */
import { useDeferredValue, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import {
  Apple,
  CircleArrowRight,
  RotateCw,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  SquareArrowOutUpRight,
  ArrowUpRight,
  Book,
  BookOpenText,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Check,
  CircleCheck,
  Circle,
  Compass,
  Copy,
  Box,
  FileCode,
  Figma,
  GitBranch,
  Github,
  Hammer,
  Info,
  Zap,
  Link,
  Menu,
  Search,
  Minus,
  Moon,
  Palette,
  Plus,
  Ruler,
  Shapes,
  LayoutGrid,
  Sun,
  Type,
  Languages,
  TriangleAlert,
  X,
  CircleX,
  type LucideIcon,
} from 'lucide-react';
import hds from '../../../design-system/tokens';
import { Input } from '../../../components/input';
import { Icon } from '../../../components/icon';
import { Surface } from '../../../components/surface';
import { Text } from '../../../components/text';
import iconRegistry from '../../../data/used-icons.json';

type IconRecord = { name: string; count: number; files: string[] };
type IconRegistry = {
  generatedAt: string;
  source: string;
  totalReferences: number;
  icons: IconRecord[];
};

const registry = iconRegistry as IconRegistry;
const glyphRegistry = registry.icons;
const glyphReferenceCount = glyphRegistry.reduce((sum, record) => sum + record.count, 0);

// Map from the icon names stored in used-icons.json to Lucide components.
// Names match what sync-icons.mjs records after the Phosphor→Lucide migration.
const ICON_COMPONENTS: Record<string, LucideIcon> = {
  Apple,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Book,
  BookOpenText,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleArrowRight,
  CircleCheck,
  CircleX,
  Compass,
  Copy,
  Figma,
  FileCode,
  Github,
  GitBranch,
  Hammer,
  Info,
  Languages,
  LayoutGrid,
  Link,
  Menu,
  Minus,
  Moon,
  Palette,
  Plus,
  RotateCw,
  Ruler,
  Search,
  Shapes,
  SquareArrowOutUpRight,
  Sun,
  TriangleAlert,
  Type,
  X,
  Zap,
};

const iconGalleryStyles = {
  searchBarRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: hds.semantic.space.component.gap,
    flexWrap: 'wrap' as const,
    width: '100%',
  } satisfies React.CSSProperties,
} as const;

export function IconGallery() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());

  const fuse = useMemo(
    () =>
      new Fuse(glyphRegistry, {
        keys: ['name', 'files'],
        threshold: 0.32,
        ignoreLocation: true,
        minMatchCharLength: 1,
      }),
    [],
  );

  const visibleIcons = useMemo(() => {
    if (!deferredQuery) return glyphRegistry;
    return fuse.search(deferredQuery).map(result => result.item);
  }, [deferredQuery, fuse]);

  return (
    <section>
      <div style={iconGalleryStyles.searchBarRow}>
        <div style={{ width: `min(100%, calc(${hds.size[96]} * 3))` }}>
          <Input
            type="search"
            label=""
            leadingVisual={(
              <Icon
                icon={Search}
                size="small"
                color="currentColor"
              />
            )}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Filter by icon name or source file"
          />
        </div>
        <Text variant="caption" as="p" style={{ color: 'var(--semantic-color-content-secondary)', whiteSpace: 'nowrap' }}>
          {glyphRegistry.length} icons {glyphReferenceCount} instances
        </Text>
      </div>

      <div
        style={{
          ['display']: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: hds.semantic.space.layout.gap,
          marginTop: hds.semantic.space.layout.gap,
        }}
      >
        {visibleIcons.map((record) => {
          const IconGlyph = ICON_COMPONENTS[record.name] ?? Circle;
          return (
            <Surface
              key={record.name}
              style={{ minWidth: 0 }}
            >
              <div style={{ display: 'grid', gap: hds.semantic.space.subgrid.gap, justifyItems: 'center' }}>
                <Icon icon={IconGlyph} size="medium" color="var(--semantic-color-content-primary)" />
                <Text
                  variant="technical"
                  as="p"
                  style={{
                    maxWidth: '100%',
                    textAlign: 'center',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    lineHeight: 1.2,
                  }}
                >
                  {record.name}
                </Text>
              </div>
            </Surface>
          );
        })}
      </div>
    </section>
  );
}
