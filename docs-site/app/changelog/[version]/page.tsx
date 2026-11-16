import { notFound } from 'next/navigation';
import { loadReleaseNotes, loadUpgradeReleases } from '@/lib/site-data';
import { ReleaseNotesView } from '@/components/release-notes';

type Props = { params: Promise<{ version: string }> };

/**
 * /changelog/<version>: one generated page per release in CHANGELOG.md. A
 * version the changelog does not have is a 404.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return loadReleaseNotes().map((r) => ({ version: r.version }));
}

export async function generateMetadata({ params }: Props) {
  const { version } = await params;
  return {
    title: `Release ${version} · Hirobius Design System`,
    description: `What changed in @hirobius/design-system ${version}, from CHANGELOG.md.`,
  };
}

export default async function ReleasePage({ params }: Props) {
  const { version } = await params;
  const releases = loadReleaseNotes();
  const at = releases.findIndex((r) => r.version === version);
  if (at < 0) notFound();
  const ledger = loadUpgradeReleases().find((r) => r.version === version);
  return (
    <main className="hds-upgrade">
      <ReleaseNotesView
        notes={releases[at]!}
        date={ledger?.date ?? null}
        newer={releases[at - 1]?.version ?? null}
        older={releases[at + 1]?.version ?? null}
        hasUpgradePage={Boolean(ledger)}
      />
    </main>
  );
}
