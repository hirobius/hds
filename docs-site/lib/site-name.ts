import type { LoaderPlugin } from 'fumadocs-core/source';

/**
 * The full name appears once, as the home page H1 (content/docs/index.mdx); the
 * chrome uses the short mark so the home page doesn't repeat it (hds#845).
 */
export const SITE_MARK = 'HDS';

/** Sidebar label for the home page, whose own title is the full name. */
export const HOME_NAV_LABEL = 'Overview';

const HOME_URL = '/docs';

/** Relabels the home page's sidebar entry; its H1 and <title> keep the full name. */
export function homeNavLabelPlugin(): LoaderPlugin {
  return {
    name: 'hds:home-nav-label',
    transformPageTree: {
      file(node) {
        return node.url === HOME_URL ? { ...node, name: HOME_NAV_LABEL } : node;
      },
    },
  };
}

/**
 * The top bar's page title: the current page's name on inner pages, nothing on the
 * home page (its H1 already says the full name). `names` is the sidebar path to the
 * current page, root first.
 */
export function topBarTitle(pathname: string, names: string[]): string | undefined {
  if (pathname.replace(/\/+$/, '') === HOME_URL) return undefined;
  return names.at(-1);
}
