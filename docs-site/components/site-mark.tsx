import { Badge, VisuallyHidden } from '@hirobius/design-system';
import { SITE_MARK } from '../lib/site-name';
import { loadPackageVersion } from '../lib/site-data';

/**
 * The sidebar header: the short mark and the released version. The version is read
 * from the root package.json at build time, so it always matches what ships.
 */
export function SiteMark() {
  const version = loadPackageVersion();
  return (
    <span className="hds-site-mark">
      {SITE_MARK}
      <Badge tone="info">
        <VisuallyHidden>Version </VisuallyHidden>
        {version}
      </Badge>
    </span>
  );
}
