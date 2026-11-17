import { loadStats } from '../lib/site-data';

type Stats = ReturnType<typeof loadStats>;

/**
 * The sidebar's metadata slot (its footer, beside the display controls): the
 * Code Connect template count, and the Figma parity score once every parity
 * check passes. Until then the score stays in public/hds-stats.json and the
 * parity gate keeps running; the sidebar just does not show a partial score.
 * Pure: the figures come in as props, so tests can drive both cases.
 */
export function ParityReadout({
  figmaParity,
  codeConnect,
}: Pick<Stats, 'figmaParity' | 'codeConnect'>) {
  const complete = Boolean(figmaParity) && figmaParity!.passed === figmaParity!.total;
  if (!complete && !codeConnect) return null;
  return (
    <dl className="hds-docs-parity" aria-label="Figma and code">
      {complete ? (
        <div>
          <dt>Figma parity</dt>
          <dd>
            <data value={figmaParity!.percent}>{figmaParity!.percent}%</data>
            <span>
              {' '}
              · {figmaParity!.passed}/{figmaParity!.total} checks, read {figmaParity!.readOn}
            </span>
          </dd>
        </div>
      ) : null}
      {codeConnect ? (
        <div>
          <dt>Code Connect</dt>
          <dd>{codeConnect.templates} templates</dd>
        </div>
      ) : null}
    </dl>
  );
}

/** The readout with the figures public/hds-stats.json holds when the site builds. */
export function ParityBadge() {
  const { figmaParity, codeConnect } = loadStats();
  return <ParityReadout figmaParity={figmaParity} codeConnect={codeConnect} />;
}
