import type { LedgerRelease } from '../lib/upgrade-ledger';
import { RELEASE_LISTS, releaseLists, subjectLead } from '../lib/upgrade-release';

const PACKAGE = '@hirobius/design-system';
const rangeHref = (from: string, to: string) => `/upgrade?from=${from}&to=${to}`;

/**
 * One release's upgrade page (hds#445), phone first: the command pinned to the
 * release, then the four UPGRADING.md lists. Server-rendered; no state.
 */
export function UpgradeReleaseView({
  release,
  previous,
  latest,
}: {
  release: LedgerRelease;
  /** The release before this one, for the range link; null for the oldest. */
  previous: string | null;
  latest: string;
}) {
  const lists = releaseLists(release);
  const v = release.version;
  return (
    <article className="hds-upgrade-page">
      <h1>Upgrade to {v}</h1>
      <p className="hds-upgrade-build">
        Released {release.date} · {release.bump}
      </p>
      <p>{release.steps.length === 0 ? 'Nothing to do for this release.' : release.summary}</p>
      <p>Run this from your repo root; it applies the codemods and lists what is left:</p>
      <pre>
        <code>{`npx ${PACKAGE}@${v} upgrade`}</code>
      </pre>
      {RELEASE_LISTS.map(({ key, title }) =>
        lists[key].length === 0 ? null : (
          <section key={key} aria-label={title}>
            <h2>
              {title} ({lists[key].length})
            </h2>
            <ul className="hds-upgrade-list">
              {lists[key].map((s) => (
                <li key={s.id}>
                  {subjectLead(s) ? (
                    <>
                      <code>{subjectLead(s)}</code>{' '}
                    </>
                  ) : null}
                  {s.plain}
                  {s.auto ? (
                    <>
                      {' '}
                      <code>{[s.auto.codemod, ...s.auto.args].join(' ')}</code>
                    </>
                  ) : null}
                  {s.removeIn ? ` (removed in ${s.removeIn})` : null}
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
      <nav aria-label="Other versions">
        <ul className="hds-upgrade-list">
          {previous ? (
            <li>
              <a href={rangeHref(previous, v)}>
                Steps from {previous} to {v}
              </a>
            </li>
          ) : null}
          {v !== latest ? (
            <li>
              <a href={rangeHref(v, latest)}>
                Steps from {v} to {latest}, the newest
              </a>
            </li>
          ) : null}
        </ul>
      </nav>
    </article>
  );
}
