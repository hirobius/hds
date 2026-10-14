import { loadUpgradeIndex, loadUpgradeReleases } from '../lib/site-data';
import { deprecationRows, releaseRows, removalGroups } from '../lib/upgrade-ledger';

/**
 * Tables for the upgrade and deprecation guides, read from the upgrade ledger
 * when the site builds (hds#650), so they list exactly what the upgrade
 * command runs.
 */

export function ReleaseLedger() {
  const rows = releaseRows(loadUpgradeIndex());
  return (
    <table>
      <thead>
        <tr>
          <th>Version</th>
          <th>Date</th>
          <th>Breaking</th>
          <th>What changed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.version}>
            <td>
              <code>{r.version}</code>
            </td>
            <td className="hds-nowrap">{r.date}</td>
            <td>{r.breaking}</td>
            <td>{r.summary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DeprecationLedger() {
  const rows = deprecationRows(loadUpgradeIndex(), loadUpgradeReleases());
  return (
    <table>
      <thead>
        <tr>
          <th>Deprecated</th>
          <th>Since</th>
          <th>Removed in</th>
          <th>What to do</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.step}>
            <td>
              {r.names.map((n, i) => (
                <span key={n}>
                  {i > 0 ? ', ' : null}
                  <code>{n}</code>
                </span>
              ))}
            </td>
            <td>{r.since}</td>
            <td>{r.removeIn}</td>
            <td>
              {r.plain}
              {r.auto ? (
                <>
                  {' '}
                  Codemod: <code>{r.auto}</code>.
                </>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RemovalLedger() {
  const groups = removalGroups(loadUpgradeReleases());
  return (
    <>
      {groups.map((g) => (
        <details key={g.version} className="hds-fold">
          <summary>
            {g.version} · {g.steps.length} removed, moved or renamed
          </summary>
          <ul>
            {g.steps.map((s) => (
              <li key={s.id}>
                <code>{s.subject}</code> ({s.kind}): {s.plain}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </>
  );
}

/** The oldest release the upgrade command can start from (upgrade/index.json#floor). */
export function UpgradeFloor() {
  return <code>{loadUpgradeIndex().floor}</code>;
}
