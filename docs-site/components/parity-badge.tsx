import { loadStats } from '../lib/site-data';

type Stats = ReturnType<typeof loadStats>;

/**
 * The sidebar's metadata slot (its footer, beside the display controls): the
 * Figma parity score once every parity check passes. Until then the score stays
 * in public/hds-stats.json and the parity gate keeps running; the sidebar just
 * does not show a partial score. The Code Connect count is not shown here; its
 * data stays in public/hds-stats.json.
 * Pure: the figures come in as props, so tests can drive both cases.
 */
export function ParityReadout({ figmaParity }: Pick<Stats, 'figmaParity'>) {
  const complete = Boolean(figmaParity) && figmaParity!.passed === figmaParity!.total;
  if (!complete) return null;
  return (
    <dl className="hds-docs-parity" aria-label="Figma parity">
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
    </dl>
  );
}

/** The readout with the figures public/hds-stats.json holds when the site builds. */
export function ParityBadge() {
  const { figmaParity } = loadStats();
  return <ParityReadout figmaParity={figmaParity} />;
}
