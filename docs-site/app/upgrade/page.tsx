import { loadUpgradeIndex, loadUpgradeReleases } from '@/lib/site-data';
import { execSync } from 'node:child_process';
import { UpgradeRangeView } from '@/components/upgrade-range';
import { builtFrom } from '@/lib/upgrade-range';

function buildSha(): string | undefined {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

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
      <UpgradeRangeView
        releases={releases}
        latest={index.latest}
        floor={index.floor}
        built={builtFrom(index.latest, buildSha())}
      />
    </main>
  );
}
