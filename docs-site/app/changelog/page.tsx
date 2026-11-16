import { loadReleaseNotes, loadUpgradeReleases } from '@/lib/site-data';
import { ReleaseIndexView } from '@/components/release-notes';

export const metadata = {
  title: 'Changelog · Hirobius Design System',
  description: 'Every release of @hirobius/design-system, newest first, built from CHANGELOG.md.',
};

/** /changelog: the release list. Read from CHANGELOG.md when the site builds. */
export default function ChangelogPage() {
  const dates = Object.fromEntries(loadUpgradeReleases().map((r) => [r.version, r.date]));
  return (
    <main className="hds-upgrade">
      <ReleaseIndexView releases={loadReleaseNotes()} dates={dates} />
    </main>
  );
}
