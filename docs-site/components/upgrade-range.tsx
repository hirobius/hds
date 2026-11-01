'use client';

import { useEffect, useState } from 'react';
import type { LedgerRelease, LedgerStep } from '../lib/upgrade-ledger';
import { upgradeRange } from '../lib/upgrade-range';

const COMMAND = 'npx @hirobius/design-system@latest upgrade';

function Steps({ title, steps }: { title: string; steps: LedgerStep[] }) {
  if (steps.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2>
        {title} ({steps.length})
      </h2>
      <ul className="hds-upgrade-list">
        {steps.map((s) => (
          <li key={s.id}>
            <code>{s.id.split('/')[0]}</code> {s.plain}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The range view for /upgrade/ (hds#464), phone first: one column, the one
 * command on top, then codemods, removals, manual edits and look changes.
 */
export function UpgradeRangeView({
  releases,
  latest,
  floor,
  buildLabel,
}: {
  releases: LedgerRelease[];
  latest: string;
  floor: string;
  /** `<last release>+main <sha>` for the header (hds#464); omitted off the page. */
  buildLabel?: string;
}) {
  const [range, setRange] = useState<{ from: string | null; to: string | null } | null>(null);
  const [cssOnly, setCssOnly] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setRange({ from: q.get('from'), to: q.get('to') ?? latest });
    setCssOnly(q.get('css') === '1');
  }, [latest]);

  const versions = releases
    .map((r) => r.version)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const r = range ? upgradeRange(releases, range.from, range.to, { cssOnly }) : null;

  return (
    <article className="hds-upgrade-page">
      <h1>Upgrade steps</h1>
      {buildLabel ? <p className="hds-upgrade-build">Docs build {buildLabel}</p> : null}
      <form className="hds-upgrade-form" method="get">
        <label>
          From
          <select name="from" defaultValue={range?.from ?? floor} key={`f${range?.from}`}>
            {[floor, ...versions].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          To
          <select name="to" defaultValue={range?.to ?? latest} key={`t${range?.to}`}>
            {versions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <button type="submit">Show steps</button>
        <label className="hds-upgrade-css-toggle">
          <input
            type="checkbox"
            name="css"
            value="1"
            checked={cssOnly}
            onChange={(e) => setCssOnly(e.target.checked)}
          />
          CSS only — hide steps that need the JavaScript package
        </label>
      </form>
      <p>Run this first; it applies the codemods and lists what is left:</p>
      <pre>
        <code>{COMMAND}</code>
      </pre>
      {!r ? null : r.error ? (
        <p role="status">{r.error}</p>
      ) : (
        <>
          <p role="status">
            {r.releases.length} releases, {range?.from} to {range?.to}.
          </p>
          {r.codemods.length > 0 ? (
            <section aria-label="Codemods">
              <h2>Codemods ({r.codemods.length})</h2>
              <ul className="hds-upgrade-list">
                {r.codemods.map((c) => (
                  <li key={c.command}>
                    <code>{c.command}</code> applies {c.steps.length} step
                    {c.steps.length === 1 ? '' : 's'}.
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <Steps title="Removed or moved" steps={r.removals} />
          <Steps title="Manual edits" steps={r.manual} />
          <Steps title="Looks different" steps={r.looks} />
        </>
      )}
    </article>
  );
}
