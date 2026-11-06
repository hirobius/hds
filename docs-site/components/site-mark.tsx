import { SITE_MARK } from '../lib/site-name';

/**
 * The sidebar header: the short mark only. The version shows once, in the site
 * footer (site-footer.tsx), so no page carries it twice.
 */
export function SiteMark() {
  return <span className="hds-site-mark">{SITE_MARK}</span>;
}
