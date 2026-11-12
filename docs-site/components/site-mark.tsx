import { SITE_MARK } from '../lib/site-name';
import { loadPackageVersion } from '../lib/site-data';

/**
 * The nav header: the short mark, then the released version small and quiet beside it. This is
 * the one place the docs show the version (Adrian, doc pages Draft 2, 2026-11-06), so no page
 * carries it twice and there is no page footer: the page is one fixed frame of sidebar and
 * content. The version is read from the root package.json at build time, so it cannot go stale.
 */
export function SiteMark() {
  return (
    <span className="hds-site-mark">
      {SITE_MARK} <span className="hds-site-version">v{loadPackageVersion()}</span>
    </span>
  );
}
