import { loadUpgradeIndex, loadUpgradeReleases } from '@/lib/site-data';
import { UpgradeRangeView } from '@/components/upgrade-range';

export const metadata = {
  title: 'Upgrade steps · Hirobius Design System',
  description:
    'The combined upgrade steps for any version pair: codemods, removals, manual edits and look changes.',
};

/**
 * /upgrade/?from=X&to=Y (hds#464): the ledger is read when the site builds and
 * trimmed to what the page shows; the range is picked in the browser, since the
 * site is a static export.
 */
export default function UpgradePage() {
  const index = loadUpgradeIndex();
  const releases = loadUpgradeReleases().map((r) => ({
    version: r.version,
    date: r.date,
    bump: r.bump,
    summary: r.summary,
    steps: r.steps.map(({ id, kind, impact, plain, auto }) => ({ id, kind, impact, plain, auto })),
  }));
  return (
    <main className="hds-upgrade">
      <UpgradeRangeView releases={releases} latest={index.latest} floor={index.floor} />
    </main>
  );
}
