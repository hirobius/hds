/**
 * Rows for the upgrade and deprecation guides (hds#650), built from the upgrade
 * ledger: upgrade/index.json and upgrade/releases/<version>.json, the same
 * records `npx @hirobius/design-system upgrade` runs. Pure functions over the
 * parsed JSON; site-data.ts loads it.
 */

export interface LedgerStep {
  id: string;
  kind: string;
  impact: string;
  plain: string;
  auto?: string;
  removeIn?: string;
}

export interface LedgerRelease {
  version: string;
  date: string;
  bump: string;
  summary: string;
  steps: LedgerStep[];
}

export interface LedgerIndex {
  latest: string;
  floor: string;
  versions: { version: string; date: string; bump: string; breaking: number; summary: string }[];
  deprecated: { name: string; removeIn: string; step: string }[];
}

const byVersionDesc = (a: string, b: string) => b.localeCompare(a, undefined, { numeric: true });

export const releaseRows = (index: LedgerIndex) =>
  [...index.versions].sort((a, b) => byVersionDesc(a.version, b.version));

export interface DeprecationRow {
  step: string;
  /** The release that deprecated it. */
  since: string;
  names: string[];
  removeIn: string;
  plain: string;
  /** Codemod bin that applies the change, when there is one. */
  auto?: string;
}

/** One row per deprecation step (several names can share a step), newest first. */
export function deprecationRows(index: LedgerIndex, releases: LedgerRelease[]): DeprecationRow[] {
  const steps = new Map(releases.flatMap((r) => r.steps.map((s) => [s.id, s] as const)));
  const rows = new Map<string, DeprecationRow>();
  for (const d of index.deprecated) {
    const step = steps.get(d.step);
    if (!step)
      throw new Error(
        `upgrade/index.json deprecates ${d.name} at ${d.step}, which no release ledger has`,
      );
    const row = rows.get(d.step) ?? {
      step: d.step,
      since: d.step.split('/')[0]!,
      names: [],
      removeIn: d.removeIn,
      plain: step.plain,
      auto: step.auto,
    };
    row.names.push(d.name);
    rows.set(d.step, row);
  }
  return [...rows.values()].sort(
    (a, b) => byVersionDesc(a.since, b.since) || a.step.localeCompare(b.step),
  );
}

const GONE = new Set(['removed', 'moved', 'renamed', 'folded']);

/** Removed, moved, renamed and folded steps, grouped by release, newest first. */
export function removalGroups(releases: LedgerRelease[]) {
  return releases
    .map((r) => ({
      version: r.version,
      date: r.date,
      steps: r.steps
        .filter((s) => GONE.has(s.kind))
        .map((s) => ({ ...s, subject: s.id.split('/').slice(2).join('/') })),
    }))
    .filter((g) => g.steps.length > 0)
    .sort((a, b) => byVersionDesc(a.version, b.version));
}
