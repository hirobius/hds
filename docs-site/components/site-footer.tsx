import { loadPackageVersion } from '../lib/site-data';

/**
 * The one place the docs show the released version: a footer line on every route
 * (Adrian, doc pages Draft 2, 2026-11-06). Read from the root package.json at build
 * time, so it always matches what ships.
 */
export function SiteFooter() {
  return (
    <footer className="hds-site-footer">Hirobius Design System v{loadPackageVersion()}</footer>
  );
}
