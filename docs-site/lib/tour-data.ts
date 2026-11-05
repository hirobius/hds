import { readFileSync } from 'node:fs';
import { buildLinks, type Specs } from './tour-links';
import {
  findUp,
  loadManifestSpecs,
  loadPackageVersion,
  loadTokens,
  loadUpgradeIndex,
} from './site-data';

/**
 * Build-time data for /tour, "HDS Console" (hds#795): the component registry
 * (src/app/data/component-api.json + the manifest), the token file and
 * CHANGELOG.md. Nothing on the page is typed by hand, so it stays true as the
 * system changes.
 */
export interface TourComponent {
  name: string;
  category: string;
  tier: string;
  props: number;
  href: string;
}
export interface TourRelease {
  version: string;
  /** Noon UTC on the release day (from the upgrade ledger), or '' when the ledger has none. */
  date: string;
  bump: string;
  /** "Looks different" and other steps the release asks of a consumer. */
  asks: string[];
  changes: string[];
}
export interface TourData {
  version: string;
  /** Noon UTC on the day status.json was last updated, so every timezone prints the same date. */
  updated: string;
  components: TourComponent[];
  tokenGroups: { group: string; count: number }[];
  releases: TourRelease[];
  /** Docs page per public component name. */
  links: Record<string, string>;
}

const readJson = (relative: string) => JSON.parse(readFileSync(findUp(relative), 'utf8'));

/** `## 1.2.3` headings with their `### Upgrade` bullets (asks) and `### * Changes` bullets. */
export function parseChangelog(markdown: string): TourRelease[] {
  const releases: TourRelease[] = [];
  let release: TourRelease | null = null;
  let kind: 'asks' | 'changes' | null = null;
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) inFence = !inFence;
    if (inFence) continue;
    const heading = /^## (\d+\.\d+\.\d+\S*)/.exec(line);
    if (heading) {
      release = { version: heading[1], date: '', bump: '', asks: [], changes: [] };
      releases.push(release);
      kind = null;
      continue;
    }
    const section = /^### (.+)/.exec(line);
    if (section) {
      kind = /^Upgrade$/i.test(section[1])
        ? 'asks'
        : /Changes$/.test(section[1])
          ? 'changes'
          : null;
      continue;
    }
    const bullet = /^- (.+)/.exec(line);
    if (release && kind && bullet) {
      const text = bullet[1]
        .replace(/^[0-9a-f]{7}: /, '')
        .replace(/\\\*/g, '*')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .trim();
      if (kind === 'asks' && /^Every step is also in/i.test(text)) continue;
      if (kind === 'asks' && /^Nothing in this release asks/i.test(text)) continue;
      release[kind].push(text);
    }
  }
  return releases;
}

interface Node {
  [key: string]: unknown;
}
function countLeaves(node: unknown): number {
  if (!node || typeof node !== 'object') return 0;
  const o = node as Node;
  if ('$value' in o || 'value' in o) return 1;
  return Object.entries(o).reduce((n, [k, v]) => (k.startsWith('$') ? n : n + countLeaves(v)), 0);
}

let linkCache: Record<string, string> | null = null;
export function docsHref(name: string): string {
  linkCache ??= buildLinks(
    Object.keys(readJson('src/app/data/component-api.json').components),
    loadManifestSpecs() as Specs,
  );
  return linkCache[name];
}

export function loadTourData(): TourData {
  const api = readJson('src/app/data/component-api.json').components as Record<
    string,
    { props?: unknown[] }
  >;
  const specs = loadManifestSpecs() as Record<
    string,
    { category?: string; tier?: string; docsPage?: string | null }
  >;
  const names = Object.keys(api);
  const links = buildLinks(names, specs as Specs);
  const components = names
    .filter((n) => specs[n]?.category && !n.match(/^(Card|Dialog|Tabs)[A-Z]/))
    .map((name) => ({
      name,
      category: specs[name]!.category!,
      tier: specs[name]!.tier ?? 'primitive',
      props: api[name].props?.length ?? 0,
      href: links[name],
    }));
  const tokens = loadTokens() as Record<string, unknown>;
  const tokenGroups = (['primitive', 'semantic', 'component', 'role'] as const).map((group) => ({
    group,
    count: countLeaves(tokens[group]),
  }));
  const changelog = readFileSync(findUp('CHANGELOG.md'), 'utf8');
  const status = readJson('status.json') as { updatedAt: string };
  return {
    version: loadPackageVersion(),
    updated: `${status.updatedAt.slice(0, 10)}T12:00:00Z`,
    components,
    tokenGroups,
    releases: parseChangelog(changelog)
      .slice(0, 4)
      .map((r) => {
        const entry = loadUpgradeIndex().versions.find((v) => v.version === r.version);
        return { ...r, date: entry ? `${entry.date}T12:00:00Z` : '', bump: entry?.bump ?? '' };
      }),
    links,
  };
}
