import { loadStats } from '../lib/site-data';

/**
 * The Figma parity score and the Code Connect template count, in the sidebar's
 * metadata slot (its footer, beside the display controls). Both come from
 * public/hds-stats.json when the site builds (scripts/build-stats-json.mjs), so
 * the figures cannot go stale or be typed here. Renders nothing while the stats
 * carry no parity read.
 */
export function ParityBadge() {
  const { figmaParity, codeConnect } = loadStats();
  if (!figmaParity) return null;
  return (
    <dl className="hds-docs-parity" aria-label="Figma and code">
      <div>
        <dt>Figma parity</dt>
        <dd>
          <data value={figmaParity.percent}>{figmaParity.percent}%</data>
          <span>
            {' '}
            · {figmaParity.passed}/{figmaParity.total} checks, read {figmaParity.readOn}
          </span>
        </dd>
      </div>
      {codeConnect ? (
        <div>
          <dt>Code Connect</dt>
          <dd>{codeConnect.templates} templates</dd>
        </div>
      ) : null}
    </dl>
  );
}
