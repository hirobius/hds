/**
 * Where each component's docs page lives, for the /tour captions (hds#795).
 * Reads the manifest's `docsPage` (the one answer scripts/lib/docs-component-pages.mjs
 * also produces), falls back to the parent component's page for a compound part
 * (CardBody -> Card), then to the components index.
 */
export const COMPONENTS_INDEX = '/docs/components';

export type Specs = Record<string, { docsPage?: string | null } | undefined>;

export function buildLinks(names: readonly string[], specs: Specs): Record<string, string> {
  const page = (n: string) => specs[n]?.docsPage || null;
  const links: Record<string, string> = {};
  for (const name of names) {
    let href = page(name);
    if (!href) {
      const parent = names
        .filter((p) => p !== name && name.startsWith(p) && page(p))
        .sort((a, b) => b.length - a.length)[0];
      href = parent ? page(parent) : COMPONENTS_INDEX;
    }
    links[name] = href as string;
  }
  return links;
}
