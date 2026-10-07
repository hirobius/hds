/**
 * Build-time token-table generator for the docs site.
 *
 * content-model Rule 1: token tables are generated from the token pipeline
 * (hirobius.tokens.json), never hand-written in MDX. Pages carry a
 * `{/* generated: tokens *\/}` marker; the remark plugin swaps it for
 * <TokenTable page="…" />, which calls `buildTokenSections` while Next renders
 * (a static export, so that is build time).
 */

export interface TokenRow {
  /** Dotted DTCG path, e.g. `semantic.color.surface.page`. */
  token: string;
  /** CSS custom property, or null for composite tokens that have none. */
  cssVar: string | null;
  /** Fully resolved light-mode value. */
  value: string;
  description: string;
  /** True when the value is a color and should render a swatch. */
  swatch: boolean;
}

export interface TokenSection {
  title: string;
  rows: TokenRow[];
}

type Json = unknown;
type Node = Record<string, Json>;

/** Docs page slug -> the semantic token group it documents. */
const PAGE_GROUPS: Record<string, string> = {
  color: 'semantic.color',
  spacing: 'semantic.space',
  typography: 'semantic.typography',
  motion: 'semantic.motion',
};

export const TOKEN_PAGES = Object.keys(PAGE_GROUPS);

const isNode = (v: Json): v is Node => typeof v === 'object' && v !== null && !Array.isArray(v);

function lookup(tokens: Json, path: string): Json {
  let cur: Json = tokens;
  for (const seg of path.split('.')) {
    if (!isNode(cur) || !(seg in cur)) throw new Error(`Token reference not found: ${path}`);
    cur = cur[seg];
  }
  return cur;
}

export function cssVarFor(path: string): string {
  return `--${path.split('.').join('-')}`;
}

/** Resolve aliases, dimensions, lists and composites to a display string. */
export function resolveTokenValue(tokens: Json, value: Json, seen: string[] = []): string {
  if (typeof value === 'string') {
    const alias = /^\{([^}]+)\}$/.exec(value);
    if (!alias) return value;
    const path = alias[1]!;
    if (seen.includes(path))
      throw new Error(`Circular token reference: ${[...seen, path].join(' -> ')}`);
    const target = lookup(tokens, path);
    if (!isNode(target) || !('$value' in target))
      throw new Error(`Token reference is not a token: ${path}`);
    return resolveTokenValue(tokens, target.$value, [...seen, path]);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((v) => resolveTokenValue(tokens, v, seen)).join(', ');
  if (isNode(value)) {
    if ('value' in value && 'unit' in value && Object.keys(value).length === 2) {
      return `${String(value.value)}${String(value.unit)}`;
    }
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${resolveTokenValue(tokens, v, seen)}`)
      .join('; ');
  }
  throw new Error(`Unsupported token value: ${JSON.stringify(value)}`);
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function collect(tokens: Json, node: Node, path: string, out: TokenRow[]): void {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') || !isNode(child)) continue;
    const childPath = `${path}.${key}`;
    if ('$value' in child) {
      const raw = child.$value;
      const value = resolveTokenValue(tokens, raw);
      out.push({
        token: childPath,
        cssVar: isNode(raw) && !('unit' in raw) ? null : cssVarFor(childPath),
        value,
        description: typeof child.$description === 'string' ? child.$description : '',
        swatch: childPath.startsWith('semantic.color.') && /^(#|rgb|hsl|oklch)/i.test(value),
      });
    } else {
      collect(tokens, child, childPath, out);
    }
  }
}

/**
 * One section per top-level child of the page's semantic group (e.g. color ->
 * Surface, Content, Border…). Leaf tokens sitting directly in the group fall
 * into a section named after the group.
 */
export function buildTokenSections(tokens: Json, page: string): TokenSection[] {
  const groupPath = PAGE_GROUPS[page];
  if (!groupPath) {
    throw new Error(
      `No token group for docs page "${page}". Known pages: ${TOKEN_PAGES.join(', ')}`,
    );
  }
  const group = lookup(tokens, groupPath);
  if (!isNode(group)) throw new Error(`Token group is not an object: ${groupPath}`);

  const sections: TokenSection[] = [];
  const loose: Node = {};
  for (const [key, child] of Object.entries(group)) {
    if (key.startsWith('$') || !isNode(child)) continue;
    if ('$value' in child) {
      loose[key] = child;
      continue;
    }
    const rows: TokenRow[] = [];
    collect(tokens, { [key]: child }, groupPath, rows);
    if (rows.length) sections.push({ title: titleCase(key), rows });
  }
  const looseRows: TokenRow[] = [];
  collect(tokens, loose, groupPath, looseRows);
  if (looseRows.length) sections.push({ title: titleCase(page), rows: looseRows });
  return sections;
}
