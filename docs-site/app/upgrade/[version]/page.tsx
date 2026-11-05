import { notFound } from 'next/navigation';
import { loadUpgradeIndex, loadUpgradeReleases } from '@/lib/site-data';
import { previousVersion } from '@/lib/upgrade-release';
import { UpgradeReleaseView } from '@/components/upgrade-release';

type Props = { params: Promise<{ version: string }> };

/**
 * /upgrade/<version> (hds#445): one generated page per release in the upgrade
 * ledger, the link a release notice carries. Built from
 * upgrade/releases/<version>.json; a version with no ledger is a 404.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return loadUpgradeReleases().map((r) => ({ version: r.version }));
}

export async function generateMetadata({ params }: Props) {
  const { version } = await params;
  return {
    title: `Upgrade to ${version} · Hirobius Design System`,
    description: `What ${version} fixes for you, what looks different, what is coming next and what to do by hand.`,
  };
}

export default async function UpgradeReleasePage({ params }: Props) {
  const { version } = await params;
  const releases = loadUpgradeReleases();
  const release = releases.find((r) => r.version === version);
  if (!release) notFound();
  return (
    <main className="hds-upgrade">
      <UpgradeReleaseView
        release={release}
        previous={previousVersion(
          releases.map((r) => r.version),
          version,
        )}
        latest={loadUpgradeIndex().latest}
      />
    </main>
  );
}
